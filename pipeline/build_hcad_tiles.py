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
from typing import Dict, List, Any, Optional, Tuple

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
    # Full Harris County (covers the entire county without cutoff)
    "full": (-95.98, 29.50, -94.89, 30.18),
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
    
    # Historic institutional founding year enrichment for tax-exempt superblocks
    if yr <= 0:
        o_upper = owner_str.upper()
        a_upper = addr_str.upper()
        if "RICE" in o_upper or "6100 MAIN" in a_upper:
            yr = 1912  # Rice University (Lovett Hall founding)
        elif "HERMANN" in o_upper or "6001 FANNIN" in a_upper:
            yr = 1914  # Hermann Park establishment
        elif "TEXAS MEDICAL CENTER" in o_upper or "MEMORIAL HERMANN" in o_upper or "METHODIST HOSPITAL" in o_upper:
            yr = 1945  # Texas Medical Center founding
        elif "UNIVERSITY OF HOUSTON" in o_upper or "4800 CALHOUN" in a_upper:
            yr = 1927  # University of Houston founding
        elif "MEMORIAL PARK" in o_upper or ("MEMORIAL" in a_upper and "PARK" in a_upper):
            yr = 1924  # Memorial Park founding
        elif "HOUSING AUTHORITY" in o_upper:
            yr = 1940  # San Felipe Courts / Allen Parkway Village
        elif "CITY OF HOUSTON" in o_upper and "BAGBY" in a_upper:
            yr = 1939  # Houston City Hall / Civic Center
    
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


def extract_parcels_to_jsonl(
    gdb_path: str,
    districts_geojson_path: str,
    output_jsonl_path: str,
    scope: str = "central",
    limit: Optional[int] = None,
) -> Tuple[int, Tuple[float, float, float, float]]:
    """Extract, reproject, and stream parcels directly to JSONL to eliminate V8 memory limits."""
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
    
    field_indices = {name: idx for idx, name in enumerate(meta['fields'])}
    hcad_col = field_data[field_indices['HCAD_NUM']]
    addr_col = field_data[field_indices['LocAddr']]
    owner_col = field_data[field_indices['CurrOwner']]
    yr_col = field_data[field_indices['yr_impr']]
    
    print(f"Streaming reprojected features to {output_jsonl_path}...")
    t_join = time.time()
    valid_count = 0
    
    os.makedirs(os.path.dirname(os.path.abspath(output_jsonl_path)), exist_ok=True)
    with open(output_jsonl_path, "w", encoding="utf-8") as out_f:
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
                
                feat = {
                    "type": "Feature",
                    "geometry": mapping(g_wgs84),
                    "properties": props,
                }
                out_f.write(json.dumps(feat) + "\n")
                valid_count += 1
                if valid_count % 250000 == 0:
                    print(f"  Processed {valid_count} features ({time.time() - t_join:.1f}s)...")
            except Exception:
                continue
    
    print(f"Successfully wrote {valid_count} valid features in {time.time() - t_join:.2f}s.")
    return valid_count, bbox_4326


def extract_parcels(
    gdb_path: str,
    districts_geojson_path: str,
    scope: str = "central",
    batch_size: int = 50000,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """Backward-compatible in-memory parcel extraction for tests."""
    temp_jsonl = "pipeline/temp_extract.jsonl"
    count, bbox = extract_parcels_to_jsonl(gdb_path, districts_geojson_path, temp_jsonl, scope=scope, limit=limit)
    features = []
    with open(temp_jsonl, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                features.append(json.loads(line))
    if os.path.exists(temp_jsonl):
        os.remove(temp_jsonl)
    return {
        "type": "FeatureCollection",
        "features": features,
        "bbox": bbox,
    }


def build_vector_tiles_and_pmtiles(
    jsonl_path: str,
    bbox: Tuple[float, float, float, float],
    output_pmtiles_path: str,
    min_zoom: int = 10,
    max_zoom: int = 15,
):
    """Slice GeoJSONL into vector tiles via tile_generator.cjs and pack into PMTiles."""
    temp_tiles_jsonl = "pipeline/temp_tiles.jsonl"
    bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
    
    print(f"Executing Node.js vector tile generator (zooms {min_zoom} -> {max_zoom})...")
    subprocess.run([
        "node",
        "--max-old-space-size=8192",
        "pipeline/tile_generator.cjs",
        "--input", jsonl_path,
        "--output", temp_tiles_jsonl,
        "--min-zoom", str(min_zoom),
        "--max-zoom", str(max_zoom),
        "--bbox", bbox_str,
    ], check=True)
    
    print("Reading tiles and packaging into PMTiles archive...")
    tiles_with_id = []
    with open(temp_tiles_jsonl, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            t = json.loads(line)
            tid = pt.zxy_to_tileid(t["z"], t["x"], t["y"])
            data = base64.b64decode(t["data"])
            tiles_with_id.append((tid, data))
    
    print(f"Sorting {len(tiles_with_id)} tiles by Hilbert tile_id...")
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
    if os.path.exists(jsonl_path):
        os.remove(jsonl_path)
    if os.path.exists(temp_tiles_jsonl):
        os.remove(temp_tiles_jsonl)
    
    size_mb = os.path.getsize(output_pmtiles_path) / (1024 * 1024)
    print(f"SUCCESS: Created PMTiles archive: {output_pmtiles_path} ({size_mb:.2f} MB, {len(tiles_with_id)} tiles)")


def main():
    parser = argparse.ArgumentParser(description="HCAD to PMTiles Builder")
    parser.add_argument("--gdb", default="pipeline/raw_data/Parcels/Parcels.gdb", help="Path to Parcels.gdb")
    parser.add_argument("--districts", default="public/data/historic_districts.geojson", help="Historic districts GeoJSON")
    parser.add_argument("--scope", choices=["central", "city", "full"], default="central", help="Geographic scope")
    parser.add_argument("--min-zoom", type=int, default=10, help="Minimum vector tile zoom")
    parser.add_argument("--max-zoom", type=int, default=15, help="Maximum vector tile zoom")
    parser.add_argument("--limit", type=int, default=None, help="Feature limit for quick testing")
    parser.add_argument("--output", default="public/data/houston_parcels.pmtiles", help="Output PMTiles path")
    args = parser.parse_args()
    
    if not os.path.exists(args.gdb):
        print(f"Error: GDB path not found: {args.gdb}")
        sys.exit(1)
    
    t_start = time.time()
    temp_jsonl = "pipeline/temp_parcels.jsonl"
    count, bbox = extract_parcels_to_jsonl(
        args.gdb,
        args.districts,
        temp_jsonl,
        scope=args.scope,
        limit=args.limit
    )
    
    build_vector_tiles_and_pmtiles(
        temp_jsonl,
        bbox,
        args.output,
        min_zoom=args.min_zoom,
        max_zoom=args.max_zoom,
    )
    print(f"Total pipeline elapsed time: {time.time() - t_start:.2f}s")


if __name__ == "__main__":
    main()

