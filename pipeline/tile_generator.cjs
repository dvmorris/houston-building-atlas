#!/usr/bin/env node
/**
 * Preservation Houston Building Atlas - Vector Tile Slicer
 * ==========================================================
 * Reads newline-delimited GeoJSON features from a stream, indexes them
 * using geojson-vt, slices vector tiles across the specified bounding
 * box and zoom levels, and streams compressed vector tiles as JSONL.
 */

const fs = require('fs');
const readline = require('readline');
const geojsonvt = require('geojson-vt').default;
const vtpbf = require('vt-pbf');
const zlib = require('zlib');

async function run() {
  const args = process.argv.slice(2);
  let inputFile = 'pipeline/temp_parcels.jsonl';
  let outputFile = 'pipeline/temp_tiles.jsonl';
  let minZoom = 10;
  let maxZoom = 15;
  let bbox = [-95.98, 29.50, -94.89, 30.18]; // Default: Harris County

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) inputFile = args[++i];
    else if (args[i] === '--output' && args[i + 1]) outputFile = args[++i];
    else if (args[i] === '--min-zoom' && args[i + 1]) minZoom = parseInt(args[++i], 10);
    else if (args[i] === '--max-zoom' && args[i + 1]) maxZoom = parseInt(args[++i], 10);
    else if (args[i] === '--bbox' && args[i + 1]) {
      bbox = args[++i].split(',').map(Number);
    }
  }

  const [minLon, minLat, maxLon, maxLat] = bbox;
  console.log(`Tile Generator starting:`);
  console.log(`  Input: ${inputFile}`);
  console.log(`  Output: ${outputFile}`);
  console.log(`  Zoom levels: ${minZoom} -> ${maxZoom}`);
  console.log(`  BBox: [${minLon}, ${minLat}, ${maxLon}, ${maxLat}]`);

  const features = [];
  const fileStream = fs.createReadStream(inputFile, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const t0 = Date.now();
  let count = 0;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      features.push(JSON.parse(trimmed));
      count++;
      if (count % 250000 === 0) {
        console.log(`  Loaded ${count} features (${Math.round((Date.now() - t0) / 1000)}s)...`);
      }
    } catch (e) {
      // skip invalid lines
    }
  }
  console.log(`Successfully loaded ${features.length} features in ${(Date.now() - t0) / 1000}s.`);

  console.log('Building geojson-vt spatial index...');
  const tIndex = Date.now();
  const tileIndex = new geojsonvt(
    { type: 'FeatureCollection', features },
    {
      maxZoom: maxZoom,
      indexMaxZoom: Math.min(maxZoom, 14),
      tolerance: 3,
      extent: 4096,
      buffer: 64,
    }
  );
  console.log(`Spatial index built in ${(Date.now() - tIndex) / 1000}s. Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`);

  // Clear features array to free memory
  features.length = 0;
  if (global.gc) {
    global.gc();
  }

  console.log('Generating vector tiles...');
  const tTiles = Date.now();
  const outStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });
  let tileCount = 0;

  for (let z = minZoom; z <= maxZoom; z++) {
    const n = Math.pow(2, z);
    const xMin = Math.max(0, Math.floor(((minLon + 180) / 360) * n));
    const xMax = Math.min(n - 1, Math.floor(((maxLon + 180) / 360) * n));
    const latRadMin = (minLat * Math.PI) / 180;
    const latRadMax = (maxLat * Math.PI) / 180;
    const yMin = Math.max(
      0,
      Math.floor(
        ((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2) * n
      )
    );
    const yMax = Math.min(
      n - 1,
      Math.floor(
        ((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2) * n
      )
    );

    let zTiles = 0;
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        const tile = tileIndex.getTile(z, x, y);
        if (tile && tile.features && tile.features.length > 0) {
          const pbf = vtpbf.fromGeojsonVt({ parcels: tile }, { version: 2 });
          const compressed = zlib.gzipSync(pbf);
          outStream.write(
            JSON.stringify({ z, x, y, data: compressed.toString('base64') }) + '\n'
          );
          tileCount++;
          zTiles++;
        }
      }
    }
    console.log(`  Zoom ${z}: generated ${zTiles} tiles`);
  }

  outStream.end();
  await new Promise((resolve) => outStream.on('finish', resolve));

  const elapsed = (Date.now() - tTiles) / 1000;
  console.log(`Generated ${tileCount} active vector tiles in ${elapsed.toFixed(2)}s (${(tileCount / Math.max(elapsed, 0.001)).toFixed(0)} tiles/sec).`);
}

run().catch((err) => {
  console.error('Fatal error in tile generator:', err);
  process.exit(1);
});
