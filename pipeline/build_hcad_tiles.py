#!/usr/bin/env python3
"""
Preservation Houston Building Atlas - HCAD GIS to PMTiles Builder
==================================================================
Extracts tax parcels from HCAD Parcels.gdb, transforms coordinates
from EPSG:2278 to EPSG:4326, performs spatial joins with designated
historic districts, slices into vector tiles, and compiles into a
standard PMTiles archive for serverless static hosting.

Usage:
  python3 pipeline/build_hcad_tiles.py [--scope central|city|full] [--output public/data/houston_parcels.pmtiles]
"""

import os
import sys
import json
import time
import base64
import zlib
import argparse
import subprocess
from typing import Dict, List, Any, Optional

try:
    import pyogrio.raw
    import shapely
    from shapely.ops import transform as geom_transform
    from shapely.geometry import Point, shape, mapping
    from shapely.strtree import STRtree
    from pyproj import Transformer
    import pmtiles.writer
    import pmtiles.tile as pt
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install requirements or run via pipeline/.venv/bin/python3")
    sys.exit(1)


# Bounding boxes (min_lon, min_lat, max_lon, max_lat) in WGS84
BBOXES = {
    # Central Houston & Loop 610: covers Downtown, Heights, Montrose, Sixth Ward, Third Ward, etc.
    "central": (-95.46, 29.68, -95.30, 29.83),
    # City of Houston limits
    "city": (-95.65, 29.55, -95.10, 30.05),
    # Full Harris County
    "full": (-95.85, 29.50, -94.90, 30.18),
}

# Coordinate transformers
TRANSFORMER_2278_TO_4326 = Transformer.from_crs("EPSG:2278", "EPSG:4326", always_xy=True)
TRANSFORMER_4326_TO_2278 = Transformer.from_crs("EPSG:4326", "EPSG:2278", always_xy=True)


def load_historic_districts(districts_geojson_path: str):
    """Load historic district polygons and build STRtree index."""
    if not os.path.exists(districts_geojson_path):
        print(f"Warning: Historic districts file not found: {districts_geojson_path}")
        return None, []
    
    with open(districts_geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    polys = []
    names = []
    for feat in data.get("features", []):
        try:
            poly = shape(feat["geometry"])
            name = feat.get("properties", {}).get("name", "Historic District")
            polys.append(poly)
            names.append(name)
        except Exception as err:
            print(f"Error parsing district polygon: {err}")
    
    tree = STRtree(polys) if polys else None
    print(f"Loaded {len(polys)} historic district boundaries into spatial index.")
    return tree, names


def normalize_parcel(
    hcad_num: Any,
    loc_addr: Any,
    curr_owner: Any,
    yr_impr: Any,
    centroid: Point,
    districts_tree: Optional[STRtree],
    district_names: List[str],
) -> Dict[str, Any]:
    """Normalize raw HCAD attributes to vector tile schema."""
    hcad_str = str(hcad_num or "").strip()
    addr_str = str(loc_addr or "").strip()
    owner_str = str(curr_owner or "").strip()
    
    try:
        yr = int(yr_impr or 0)
    except (ValueError, TypeError):
        yr = 0
    
    # Spatial join with historic districts
    dist_name = None
    contrib_status = -1  # Default: Outside Historic District
    
    if districts_tree is not None:
        matches = districts_tree.query(centroid, predicate="intersects")
        if len(matches) > 0:
            dist_idx = matches[0]
            dist_name = district_names[dist_idx]
            # If structure is older than 50 years, default to contributing
            if yr > 0 and yr <= 1976:
                contrib_status = 1
            elif yr > 1976:
                contrib_status = 0
            else:
                contrib_status = 1
    
    return {
        "id": hcad_str,
        "yr": yr,
        "addr": addr_str,
        "owner": owner_str,
        "use": "RES",
        "dist": dist_name,
        "contrib": contrib_status,
        "st": 1.0,
    }


def extract_parcels(
    gdb_path: str,
    districts_geojson_path: str,
    scope: str = "central",
    batch_size: int = 50000,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """Extract, reproject, and spatially tag parcels from HCAD GDB."""
    bbox_4326 = BBOXES.get(scope, BBOXES["central"])
    print(f"Scope: '{scope}', Bounding box (WGS84): {bbox_4326}")
    
    # Convert WGS84 bbox to EPSG:2278 for fast GDB spatial filter
    x1, y1 = TRANSFORMER_4326_TO_2278.transform(bbox_4326[0], bbox_4326[1])
    x2, y2 = TRANSFORMER_4326_TO_2278.transform(bbox_4326[2], bbox_4326[3])
    bbox_2278 = (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))
    
    districts_tree, district_names = load_historic_districts(districts_geojson_path)
    
    print(f"Reading Parcels from {gdb_path} with spatial index filter...")
    t0 = time.time()
    
    meta, _, geom_wkb_list, field_data = pyogrio.raw.read(
        gdb_path,
        columns=["HCAD_NUM", "LocAddr", "CurrOwner", "yr_impr"],
        bbox=bbox_2278,
        max_features=limit,
    )
    
    num_features = len(geom_wkb_list)
    print(f"Extracted {num_features} parcels within bbox in {time.time() - t0:.2f}s.")
    
    hcad_col = field_data[0]
    addr_col = field_data[1]
    owner_col = field_data[2]
    yr_col = field_data[3]
    
    print("Reprojecting geometries and performing spatial joins...")
    t_join = time.time()
    features = []
    
    geoms = shapely.from_wkb(geom_wkb_list)
    for i, g in enumerate(geoms):
        if g is None or g.is_empty:
            continue
        try:
            g_wgs84 = geom_transform(TRANSFORMER_2278_TO_4326.transform, g)
            centroid = g_wgs84.centroid
            
            props = normalize_parcel(
                hcad_col[i],
                addr_col[i],
                owner_col[i],
                yr_col[i],
                centroid,
                districts_tree,
                district_names,
            )
            
            features.append({
                "type": "Feature",
                "geometry": mapping(g_wgs84),
                "properties": props,
            })
        except Exception as err:
            continue
    
    print(f"Processed {len(features)} valid features in {time.time() - t_join:.2f}s.")
    return {
        "type": "FeatureCollection",
        "features": features,
        "bbox": bbox_4326,
    }


def build_vector_tiles_and_pmtiles(
    geojson_data: Dict[str, Any],
    output_pmtiles_path: str,
    min_zoom: int = 10,
    max_zoom: int = 16,
):
    """Slice GeoJSON into vector tiles using Node.js geojson-vt and pack into PMTiles."""
    temp_geojson = "pipeline/temp_parcels.geojson"
    temp_tiles_json = "pipeline/temp_tiles.json"
    
    print(f"Writing {len(geojson_data['features'])} features to {temp_geojson}...")
    with open(temp_geojson, "w", encoding="utf-8") as f:
        json.dump(geojson_data, f)
    
    bbox = geojson_data.get("bbox", (-95.46, 29.68, -95.30, 29.83))
    
    # Node script to slice vector tiles
    node_script = f"""
    const geojsonvt = require('geojson-vt').default;
    const vtpbf = require('vt-pbf');
    const zlib = require('zlib');
    const fs = require('fs');

    const raw = JSON.parse(fs.readFileSync('{temp_geojson}', 'utf8'));
    console.log('Building geojson-vt spatial index...');
    const t0 = Date.now();
    const tileIndex = new geojsonvt(raw, {{
      maxZoom: {max_zoom},
      indexMaxZoom: 14,
      tolerance: 3,
      extent: 4096,
      buffer: 64,
    }});
    console.log(`Index built in ${{Date.now() - t0}}ms`);

    const tiles = [];
    const minLon = {bbox[0]}, minLat = {bbox[1]}, maxLon = {bbox[2]}, maxLat = {bbox[3]};

    for (let z = {min_zoom}; z <= {max_zoom}; z++) {{
      const n = Math.pow(2, z);
      const xMin = Math.max(0, Math.floor((minLon + 180) / 360 * n));
      const xMax = Math.min(n - 1, Math.floor((maxLon + 180) / 360 * n));
      const latRadMin = minLat * Math.PI / 180;
      const latRadMax = maxLat * Math.PI / 180;
      const yMin = Math.max(0, Math.floor((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2 * n));
      const yMax = Math.min(n - 1, Math.floor((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2 * n));

      for (let x = xMin; x <= xMax; x++) {{
        for (let y = yMin; y <= yMax; y++) {{
          const tile = tileIndex.getTile(z, x, y);
          if (tile && tile.features && tile.features.length > 0) {{
            const pbf = vtpbf.fromGeojsonVt({{ parcels: tile }});
            const compressed = zlib.gzipSync(pbf);
            tiles.push({{ z, x, y, data: compressed.toString('base64') }});
          }}
        }}
      }}
    }}

    console.log(`Generated ${{tiles.length}} active vector tiles.`);
    fs.writeFileSync('{temp_tiles_json}', JSON.stringify(tiles));
    """
    
    print("Executing Node.js vector tile generator...")
    subprocess.run(["node", "--max-old-space-size=8192", "-e", node_script], check=True)
    
    print("Reading tiles and packaging into PMTiles archive...")
    with open(temp_tiles_json, "r", encoding="utf-8") as f:
        tiles = json.load(f)
    
    # Sort tiles strictly by Hilbert tile_id as required by PMTiles specification
    tiles_with_id = []
    for t in tiles:
        tid = pt.zxy_to_tileid(t["z"], t["x"], t["y"])
        data = base64.b64decode(t["data"])
        tiles_with_id.append((tid, data))
    
    tiles_with_id.sort(key=lambda item: item[0])
    
    os.makedirs(os.path.dirname(os.path.abspath(output_pmtiles_path)), exist_ok=True)
    with open(output_pmtiles_path, "wb") as f:
        writer = pmtiles.writer.Writer(f)
        for tid, data in tiles_with_id:
            writer.write_tile(tid, data)
        
        header = {
            "root_dir_offset": 0,
            "root_dir_bytes": 0,
            "json_metadata_offset": 0,
            "json_metadata_bytes": 0,
            "leaf_dirs_offset": 0,
            "leaf_dirs_bytes": 0,
            "tile_data_offset": 0,
            "tile_data_bytes": 0,
            "addressed_tiles_count": len(tiles_with_id),
            "tile_entries_count": len(tiles_with_id),
            "tile_contents_count": len(tiles_with_id),
            "clustered": True,
            "internal_compression": pt.Compression.GZIP,
            "tile_compression": pt.Compression.GZIP,
            "tile_type": pt.TileType.MVT,
            "min_zoom": min_zoom,
            "max_zoom": max_zoom,
            "min_lon_e7": int(bbox[0] * 1e7),
            "min_lat_e7": int(bbox[1] * 1e7),
            "max_lon_e7": int(bbox[2] * 1e7),
            "max_lat_e7": int(bbox[3] * 1e7),
            "center_zoom": 14,
            "center_lon_e7": int(-95.362 * 1e7),
            "center_lat_e7": int(29.759 * 1e7),
        }
        metadata = {
            "name": "houston_parcels",
            "attribution": "Harris Central Appraisal District (HCAD) / Preservation Houston",
            "vector_layers": [{
                "id": "parcels",
                "description": "Tax parcels with year built, address, owner, and historic status",
                "minzoom": min_zoom,
                "maxzoom": max_zoom,
                "fields": {
                    "id": "String",
                    "yr": "Number",
                    "addr": "String",
                    "owner": "String",
                    "use": "String",
                    "dist": "String",
                    "contrib": "Number",
                    "st": "Number"
                }
            }]
        }
        writer.finalize(header, metadata)
    
    # Cleanup temporary files
    if os.path.exists(temp_geojson):
        os.remove(temp_geojson)
    if os.path.exists(temp_tiles_json):
        os.remove(temp_tiles_json)
    
    size_mb = os.path.getsize(output_pmtiles_path) / (1024 * 1024)
    print(f"SUCCESS: Created PMTiles archive: {output_pmtiles_path} ({size_mb:.2f} MB, {len(tiles_with_id)} tiles)")


def main():
    parser = argparse.ArgumentParser(description="HCAD to PMTiles Builder")
    parser.add_argument("--gdb", default="pipeline/raw_data/Parcels/Parcels.gdb", help="Path to Parcels.gdb")
    parser.add_argument("--districts", default="public/data/historic_districts.geojson", help="Historic districts GeoJSON")
    parser.add_argument("--scope", choices=["central", "city", "full"], default="central", help="Geographic scope")
    parser.add_argument("--limit", type=int, default=None, help="Feature limit for quick testing")
    parser.add_argument("--output", default="public/data/houston_parcels.pmtiles", help="Output PMTiles path")
    args = parser.parse_args()
    
    if not os.path.exists(args.gdb):
        print(f"Error: GDB path not found: {args.gdb}")
        sys.exit(1)
    
    t_start = time.time()
    geojson_data = extract_parcels(
        args.gdb,
        args.districts,
        scope=args.scope,
        limit=args.limit
    )
    
    build_vector_tiles_and_pmtiles(
        geojson_data,
        args.output,
    )
    print(f"Total pipeline elapsed time: {time.time() - t_start:.2f}s")


if __name__ == "__main__":
    main()
