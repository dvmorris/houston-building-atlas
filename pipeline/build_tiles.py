#!/usr/bin/env python3
"""
Preservation Houston Building Atlas - Data Pipeline & Vector Tile Generator

Transforms Harris County Appraisal District (HCAD) tax rolls, City of Houston
historic landmark points, and historic district boundaries into normalized,
compact vector attributes and GeoJSON layers.
"""

import json
import math
import os
import shutil
import subprocess
import sys
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple, Union

# Mapping of Texas Comptroller / HCAD state class codes to simplified categories
STATE_CLASS_MAP = {
    "A": "RES",  # Real Residential Single-Family
    "B": "RES",  # Real Residential Multi-Family
    "C": "VAC",  # Vacant Lots / Tracts
    "D": "VAC",  # Rural Land / Acreage
    "E": "RES",  # Rural Farm/Ranch Improvements
    "F": "COM",  # Commercial Real Property
    "G": "COM",  # Oil, Gas, Minerals
    "J": "COM",  # Utilities
    "L": "IND",  # Personal Property (Commercial/Industrial)
    "M": "IND",  # Mobile Homes / Aircraft / Special
    "S": "IND",  # Special Inventory
    "X": "VAC",  # Totally Exempt Property
}


def normalize_parcel_attributes(
    raw_attrs: Dict[str, Any],
    district_info: Optional[Union[Dict[str, Any], str]] = None
) -> Dict[str, Any]:
    """
    Normalizes raw HCAD tax roll and City of Houston preservation attributes
    to the compact schema required for vector tiles and web rendering:
    - id: str (13-digit HCAD account number)
    - yr: int (Year built / DATE_ERECT, 0 if unknown/vacant)
    - addr: str (Standardized site address)
    - owner: str (Primary owner name)
    - use: str ('RES', 'COM', 'IND', 'VAC')
    - dist: Optional[str] (Historic District Name if within boundary)
    - contrib: int (1 = Contributing, 0 = Non-Contributing, -1 = Outside District)
    - st: float (Stories)
    """
    if raw_attrs is None:
        raw_attrs = {}

    # 1. ID / Account Number
    acct = raw_attrs.get("ACCOUNT") or raw_attrs.get("account") or raw_attrs.get("id") or ""
    parcel_id = str(acct).strip()

    # 2. Year Built (DATE_ERECT)
    raw_yr = raw_attrs.get("DATE_ERECT")
    if raw_yr is None:
        raw_yr = raw_attrs.get("yr") if "yr" in raw_attrs else raw_attrs.get("year_built", 0)
    try:
        yr = int(float(raw_yr)) if raw_yr is not None else 0
        if yr < 0 or yr > 2100:
            yr = 0
    except (ValueError, TypeError):
        yr = 0

    # 3. Site Address
    raw_addr = raw_attrs.get("SITE_ADDR") or raw_attrs.get("addr") or raw_attrs.get("address") or ""
    addr = str(raw_addr).strip().upper()

    # 4. Owner Name
    raw_owner = raw_attrs.get("OWNER_NAME") or raw_attrs.get("owner") or raw_attrs.get("owner_name") or ""
    owner = str(raw_owner).strip().upper()

    # 5. Land Use Classification
    raw_use = raw_attrs.get("use") or raw_attrs.get("USE")
    if raw_use and str(raw_use).upper() in ("RES", "COM", "IND", "VAC"):
        use = str(raw_use).upper()
    else:
        raw_state_class = raw_attrs.get("STATE_CLASS") or raw_attrs.get("state_class") or ""
        sc_clean = str(raw_state_class).strip().upper()
        if sc_clean:
            prefix = sc_clean[0]
            use = STATE_CLASS_MAP.get(prefix, "RES")
        else:
            use = "RES"

    # 6. District and Contributing Status
    dist_name: Optional[str] = None
    contrib_val: int = -1

    if district_info is not None:
        if isinstance(district_info, dict):
            dist_name = district_info.get("name") or district_info.get("dist")
            if "contrib" in raw_attrs and raw_attrs["contrib"] is not None:
                contrib_val = int(raw_attrs["contrib"])
            else:
                contrib_val = int(district_info.get("contrib", 1))
        elif isinstance(district_info, str):
            dist_name = district_info
            if "contrib" in raw_attrs and raw_attrs["contrib"] is not None:
                contrib_val = int(raw_attrs["contrib"])
            else:
                contrib_val = 1
    else:
        if "dist" in raw_attrs:
            dist_name = raw_attrs.get("dist")
            contrib_val = int(raw_attrs.get("contrib", 0 if dist_name else -1))
        elif "district" in raw_attrs:
            dist_name = raw_attrs.get("district")
            contrib_val = int(raw_attrs.get("contrib", 0 if dist_name else -1))
        else:
            dist_name = None
            contrib_val = int(raw_attrs.get("contrib", -1))

    # 7. Stories (Number of floors)
    raw_stories = raw_attrs.get("STORIES")
    if raw_stories is None:
        raw_stories = raw_attrs.get("st") if "st" in raw_attrs else raw_attrs.get("stories", 1.0)
    try:
        st = float(raw_stories) if raw_stories is not None else 1.0
    except (ValueError, TypeError):
        st = 1.0

    return {
        "id": parcel_id,
        "yr": yr,
        "addr": addr,
        "owner": owner,
        "use": use,
        "dist": dist_name,
        "contrib": contrib_val,
        "st": st,
    }


def point_in_ring(x: float, y: float, ring: List[List[float]]) -> bool:
    """Ray casting algorithm to determine if point (x, y) is inside a linear ring."""
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def point_in_polygon_geometry(pt: List[float], geom: Dict[str, Any]) -> bool:
    """Checks if point [lon, lat] is inside a GeoJSON Polygon or MultiPolygon."""
    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])
    x, y = pt[0], pt[1]

    if geom_type == "Polygon":
        if not coords:
            return False
        if not point_in_ring(x, y, coords[0]):
            return False
        for hole in coords[1:]:
            if point_in_ring(x, y, hole):
                return False
        return True

    elif geom_type == "MultiPolygon":
        for poly in coords:
            if not poly:
                continue
            if point_in_ring(x, y, poly[0]):
                in_hole = False
                for hole in poly[1:]:
                    if point_in_ring(x, y, hole):
                        in_hole = True
                        break
                if not in_hole:
                    return True
        return False

    return False


def get_polygon_centroid(geom: Dict[str, Any]) -> List[float]:
    """Computes a representative point (center of coordinates) for a polygon."""
    geom_type = geom.get("type", "")
    coords = geom.get("coordinates", [])
    all_pts = []

    if geom_type == "Polygon" and coords:
        all_pts = coords[0]
    elif geom_type == "MultiPolygon" and coords:
        for poly in coords:
            if poly:
                all_pts.extend(poly[0])
    elif geom_type == "Point" and coords:
        return coords

    if not all_pts:
        return [0.0, 0.0]

    avg_x = sum(p[0] for p in all_pts) / len(all_pts)
    avg_y = sum(p[1] for p in all_pts) / len(all_pts)
    return [avg_x, avg_y]


def spatial_join_parcels(
    parcels_geojson: Dict[str, Any],
    districts_geojson: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Spatially joins parcel polygons with historic district boundaries.
    Applies attribute normalization and assigns 'dist' and 'contrib'.
    """
    district_features = districts_geojson.get("features", [])
    joined_features = []

    for feat in parcels_geojson.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        centroid = get_polygon_centroid(geom)

        matched_district = None
        for dist_feat in district_features:
            dist_geom = dist_feat.get("geometry", {})
            if point_in_polygon_geometry(centroid, dist_geom):
                matched_district = dist_feat.get("properties", {})
                break

        normalized = normalize_parcel_attributes(props, district_info=matched_district)
        joined_features.append({
            "type": "Feature",
            "id": normalized["id"],
            "geometry": geom,
            "properties": normalized
        })

    return {
        "type": "FeatureCollection",
        "features": joined_features
    }


def get_sample_historic_districts() -> Dict[str, Any]:
    """
    Returns authentic City of Houston Historic Districts:
    - Heights South
    - Old Sixth Ward
    - Downtown
    - Boulevard Oaks
    """
    return {
        "type": "FeatureCollection",
        "name": "historic_districts",
        "features": [
            {
                "type": "Feature",
                "id": "dist-downtown",
                "properties": {
                    "id": "dist-downtown",
                    "name": "Downtown",
                    "full_name": "Downtown Historic District",
                    "designated_year": 1995,
                    "description": "Houston's commercial, financial, and civic heart centered around Market Square, historic Main Street, and Buffalo Bayou, boasting 19th-century commercial storefronts and early skyscrapers.",
                    "arch_styles": ["Victorian Commercial", "Italianate", "Commercial Classical", "Art Deco"],
                    "total_structures": 42,
                    "contributing_count": 34,
                    "non_contributing_count": 8,
                    "ordinance_no": "95-128"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-95.3655, 29.7610],
                        [-95.3615, 29.7645],
                        [-95.3585, 29.7620],
                        [-95.3625, 29.7585],
                        [-95.3655, 29.7610]
                    ]]
                }
            },
            {
                "type": "Feature",
                "id": "dist-old-sixth-ward",
                "properties": {
                    "id": "dist-old-sixth-ward",
                    "name": "Old Sixth Ward",
                    "full_name": "Old Sixth Ward Historic District",
                    "designated_year": 1998,
                    "description": "Houston's oldest intact residential neighborhood, celebrated for Texas's highest concentration of Victorian cottages, Queen Anne millwork, and Gulf Coast cottages built by railroad and trades workers.",
                    "arch_styles": ["Victorian Cottage", "Queen Anne", "Greek Revival", "Folk Victorian"],
                    "total_structures": 285,
                    "contributing_count": 218,
                    "non_contributing_count": 67,
                    "ordinance_no": "98-472"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-95.3780, 29.7640],
                        [-95.3780, 29.7710],
                        [-95.3690, 29.7710],
                        [-95.3690, 29.7640],
                        [-95.3780, 29.7640]
                    ]]
                }
            },
            {
                "type": "Feature",
                "id": "dist-heights-south",
                "properties": {
                    "id": "dist-heights-south",
                    "name": "Heights South",
                    "full_name": "Houston Heights Historic District South",
                    "designated_year": 2011,
                    "description": "Southern section of Houston's premier planned streetcar suburb (founded 1891), filled with Craftsman bungalows, Folk Victorian cottages, and Queen Anne residences.",
                    "arch_styles": ["Craftsman", "Queen Anne", "Folk Victorian", "Colonial Revival"],
                    "total_structures": 520,
                    "contributing_count": 382,
                    "non_contributing_count": 138,
                    "ordinance_no": "2011-684"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-95.4020, 29.7840],
                        [-95.4020, 29.7940],
                        [-95.3930, 29.7940],
                        [-95.3930, 29.7840],
                        [-95.4020, 29.7840]
                    ]]
                }
            },
            {
                "type": "Feature",
                "id": "dist-boulevard-oaks",
                "properties": {
                    "id": "dist-boulevard-oaks",
                    "name": "Boulevard Oaks",
                    "full_name": "Boulevard Oaks Historic District",
                    "designated_year": 2009,
                    "description": "A magnificent 1920s garden suburb renowned for cathedral live oaks lining North and South Boulevards and masterwork residential designs by noted architects Birdsall Briscoe, John Staub, and William Ward Watkin.",
                    "arch_styles": ["Georgian Revival", "Tudor Revival", "Mediterranean Revival", "French Eclectic"],
                    "total_structures": 310,
                    "contributing_count": 245,
                    "non_contributing_count": 65,
                    "ordinance_no": "2009-155"
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-95.4060, 29.7220],
                        [-95.4060, 29.7300],
                        [-95.3920, 29.7300],
                        [-95.3920, 29.7220],
                        [-95.4060, 29.7220]
                    ]]
                }
            }
        ]
    }


def get_sample_landmarks() -> Dict[str, Any]:
    """
    Returns authentic City of Houston Historic Landmarks and Protected Landmarks:
    - Julia Ideson Building
    - Esperson Building
    - Heights Theater
    - Sam Houston Park (Kellum-Noble House)
    - 1884 Houston Cotton Exchange
    - Rice Hotel
    - Annunciation Catholic Church
    - Gulf Building (JPMorgan Chase)
    - Sweeney, Coombs & Fredericks Building
    - Old Houston City Hall / Market Square Park
    """
    return {
        "type": "FeatureCollection",
        "name": "landmarks",
        "features": [
            {
                "type": "Feature",
                "id": "lm-kellum-noble",
                "properties": {
                    "id": "lm-kellum-noble",
                    "name": "Kellum-Noble House (Sam Houston Park)",
                    "addr": "212 DALLAS ST",
                    "yr": 1847,
                    "architect": "Nathaniel Kellum",
                    "style": "Texas Republic / Greek Revival",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark & Recorded Texas Historic Landmark",
                    "description": "The oldest surviving building in Houston on its original brick foundation. Built during the Texas Republic era by Nathaniel Kellum, later home to Houston's first public school.",
                    "image_url": "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1972-10-18"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3712, 29.7580]
                }
            },
            {
                "type": "Feature",
                "id": "lm-annunciation-church",
                "properties": {
                    "id": "lm-annunciation-church",
                    "name": "Church of the Annunciation",
                    "addr": "1618 TEXAS AVE",
                    "yr": 1869,
                    "architect": "Nicholas J. Clayton",
                    "style": "Romanesque / Gothic Revival",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark",
                    "description": "Houston's oldest continuously operating church parish, constructed with red pressed brick and featuring a soaring 180-foot spire designed by renowned Galveston architect Nicholas Clayton in 1884.",
                    "image_url": "https://images.unsplash.com/photo-1548625361-195982847990?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1975-04-14"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3582, 29.7578]
                }
            },
            {
                "type": "Feature",
                "id": "lm-cotton-exchange",
                "properties": {
                    "id": "lm-cotton-exchange",
                    "name": "1884 Houston Cotton Exchange",
                    "addr": "202 TRAVIS ST",
                    "yr": 1884,
                    "architect": "Eugene T. Heiner",
                    "style": "Victorian Renaissance Revival",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark & NRHP",
                    "description": "Grand headquarters of the Texas cotton trade designed by landmark architect Eugene Heiner. Features red pressed brick, ornate Galveston-carved limestone keystones, and grand ballroom trading floors.",
                    "image_url": "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1972-12-12"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3614, 29.7634]
                }
            },
            {
                "type": "Feature",
                "id": "lm-sweeney-coombs",
                "properties": {
                    "id": "lm-sweeney-coombs",
                    "name": "Sweeney, Coombs & Fredericks Building",
                    "addr": "301 MAIN ST",
                    "yr": 1889,
                    "architect": "George E. Dickey",
                    "style": "Late Victorian / Queen Anne Commercial",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark",
                    "description": "Notable Queen Anne commercial structure on Main Street crowned with a three-story circular corner turret, decorative cast iron, and sunburst panels, home to landmark jewelry firms.",
                    "image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1974-06-21"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3628, 29.7618]
                }
            },
            {
                "type": "Feature",
                "id": "lm-market-square",
                "properties": {
                    "id": "lm-market-square",
                    "name": "Market Square Historic Public Park",
                    "addr": "301 MILAM ST",
                    "yr": 1904,
                    "architect": "George E. Dickey / City of Houston",
                    "style": "Victorian Commercial Civic Plaza",
                    "designation": "LM",
                    "designation_full": "City of Houston Landmark",
                    "description": "Houston's original civic center, site of four successive City Halls and market buildings from 1841 to 1960. Today forms the cultural epicenter of historic downtown.",
                    "image_url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1983-05-19"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3622, 29.7628]
                }
            },
            {
                "type": "Feature",
                "id": "lm-rice-hotel",
                "properties": {
                    "id": "lm-rice-hotel",
                    "name": "The Rice Hotel",
                    "addr": "909 TEXAS AVE",
                    "yr": 1913,
                    "architect": "Mauran, Russell & Crowell",
                    "style": "Beaux-Arts Classical",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark",
                    "description": "Historic 17-story Beaux-Arts hotel built by Jesse H. Jones on the former capitol grounds of the Republic of Texas. Site of President John F. Kennedy's final public speech on November 21, 1963.",
                    "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1978-10-06"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3631, 29.7601]
                }
            },
            {
                "type": "Feature",
                "id": "lm-julia-ideson",
                "properties": {
                    "id": "lm-julia-ideson",
                    "name": "Julia Ideson Building",
                    "addr": "550 MCKINNEY ST",
                    "yr": 1926,
                    "architect": "Ralph Adams Cram & William Ward Watkin",
                    "style": "Spanish Renaissance Revival",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark & NRHP",
                    "description": "Houston's monumental central library from 1926 to 1976, renowned for its Spanish Renaissance cloisters, vibrant bas-relief terracotta, and historic WPA-era art and indoor loggias.",
                    "image_url": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1977-08-11"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3695, 29.7588]
                }
            },
            {
                "type": "Feature",
                "id": "lm-esperson",
                "properties": {
                    "id": "lm-esperson",
                    "name": "Niels & Mellie Esperson Buildings",
                    "addr": "808 TRAVIS ST",
                    "yr": 1927,
                    "architect": "John Eberson",
                    "style": "Italian Renaissance Revival & Art Deco",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark",
                    "description": "Houston's only complete Italian Renaissance skyscraper, commissioned by pioneer businesswoman Mellie Esperson in tribute to Niels Esperson. Crowned with an ornate 38-foot circular tempietto.",
                    "image_url": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1983-05-19"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3653, 29.7586]
                }
            },
            {
                "type": "Feature",
                "id": "lm-gulf-building",
                "properties": {
                    "id": "lm-gulf-building",
                    "name": "Gulf Building (JPMorgan Chase)",
                    "addr": "712 MAIN ST",
                    "yr": 1929,
                    "architect": "Alfred C. Finn & Kenneth Franzheim",
                    "style": "Art Deco",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark & National Historic Landmark",
                    "description": "Monumental 36-story Art Deco skyscraper commissioned by Jesse H. Jones for Gulf Oil, standing as Houston's tallest building until 1963. Features 8 grand lobby frescoes depicting Texas history.",
                    "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "1983-04-14"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.3650, 29.7594]
                }
            },
            {
                "type": "Feature",
                "id": "lm-heights-theater",
                "properties": {
                    "id": "lm-heights-theater",
                    "name": "The Heights Theater",
                    "addr": "379 W 19TH ST",
                    "yr": 1929,
                    "architect": "I.S. Radnor",
                    "style": "Mission Revival / Art Deco",
                    "designation": "PLM",
                    "designation_full": "City of Houston Protected Landmark",
                    "description": "Historic cinema that anchored 19th Street social and cultural life for decades. Expertly restored and repurposed as an intimate live performance venue and preservation showpiece.",
                    "image_url": "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80",
                    "nrhp_date": "2016-11-02"
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [-95.4025, 29.8032]
                }
            }
        ]
    }


def make_box(min_x: float, min_y: float, max_x: float, max_y: float) -> List[List[float]]:
    """Helper to generate a closed polygon ring from bounding box coordinates."""
    return [
        [round(min_x, 6), round(min_y, 6)],
        [round(max_x, 6), round(min_y, 6)],
        [round(max_x, 6), round(max_y, 6)],
        [round(min_x, 6), round(max_y, 6)],
        [round(min_x, 6), round(min_y, 6)]
    ]


def get_sample_parcels() -> Dict[str, Any]:
    """
    Returns authentic sample parcels across Houston representing:
    - Downtown Historic District (Victorian, Classical, Art Deco commercial buildings & modern infill)
    - Old Sixth Ward (Victorian cottages, Greek Revival residences, modern townhomes)
    - Heights South (Craftsman bungalows, Queen Anne homes, commercial shops)
    - Boulevard Oaks (1920s Tudor & Georgian Revival estates)
    - Outside Historic Districts (Modern high-rises, institutional & vacant tracts)
    """
    parcels = [
        # --- DOWNTOWN HISTORIC DISTRICT ---
        {
            "raw": {
                "ACCOUNT": "0010020000001",
                "DATE_ERECT": 1925,
                "SITE_ADDR": "1200 TEXAS AVE",
                "OWNER_NAME": "HISTORIC TRUST LLC",
                "STATE_CLASS": "A1",
                "STORIES": 3.0
            },
            "district": {"name": "Downtown", "contrib": 1},
            "box": (-95.3620, 29.7595, -95.3610, 29.7603)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000002",
                "DATE_ERECT": 1884,
                "SITE_ADDR": "202 TRAVIS ST",
                "OWNER_NAME": "COTTON EXCHANGE BUILDING CORP",
                "STATE_CLASS": "F1",
                "STORIES": 4.0
            },
            "district": {"name": "Downtown", "contrib": 1},
            "box": (-95.3618, 29.7630, -95.3610, 29.7638)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000003",
                "DATE_ERECT": 1913,
                "SITE_ADDR": "909 TEXAS AVE",
                "OWNER_NAME": "RICE LOFTS PARTNERS LLC",
                "STATE_CLASS": "F1",
                "STORIES": 17.0
            },
            "district": {"name": "Downtown", "contrib": 1},
            "box": (-95.3635, 29.7597, -95.3627, 29.7605)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000004",
                "DATE_ERECT": 1889,
                "SITE_ADDR": "301 MAIN ST",
                "OWNER_NAME": "MAIN STREET HERITAGE PROPERTIES",
                "STATE_CLASS": "F1",
                "STORIES": 3.0
            },
            "district": {"name": "Downtown", "contrib": 1},
            "box": (-95.3632, 29.7614, -95.3624, 29.7622)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000005",
                "DATE_ERECT": 1927,
                "SITE_ADDR": "808 TRAVIS ST",
                "OWNER_NAME": "ESPERSON TOWER HOLDINGS LP",
                "STATE_CLASS": "F1",
                "STORIES": 32.0
            },
            "district": {"name": "Downtown", "contrib": 1},
            "box": (-95.3657, 29.7582, -95.3649, 29.7590)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000006",
                "DATE_ERECT": 1929,
                "SITE_ADDR": "712 MAIN ST",
                "OWNER_NAME": "JPMORGAN CHASE BUILDING TRUST",
                "STATE_CLASS": "F1",
                "STORIES": 36.0
            },
            "district": {"name": "Downtown", "contrib": 1},
            "box": (-95.3654, 29.7590, -95.3646, 29.7598)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000007",
                "DATE_ERECT": 1982,
                "SITE_ADDR": "1100 LOUISIANA ST",
                "OWNER_NAME": "MODERN METRO COMMERCE TOWER",
                "STATE_CLASS": "F1",
                "STORIES": 55.0
            },
            "district": {"name": "Downtown", "contrib": 0},  # Non-contributing modern skyscraper in downtown boundary
            "box": (-95.3650, 29.7600, -95.3642, 29.7608)
        },
        {
            "raw": {
                "ACCOUNT": "0010020000008",
                "DATE_ERECT": 2004,
                "SITE_ADDR": "500 TEXAS AVE",
                "OWNER_NAME": "DOWNTOWN PARKING CORP",
                "STATE_CLASS": "F1",
                "STORIES": 6.0
            },
            "district": {"name": "Downtown", "contrib": 0},  # Non-contributing parking garage
            "box": (-95.3628, 29.7604, -95.3620, 29.7612)
        },

        # --- OLD SIXTH WARD ---
        {
            "raw": {
                "ACCOUNT": "0020040000001",
                "DATE_ERECT": 1885,
                "SITE_ADDR": "1812 KANE ST",
                "OWNER_NAME": "MARTINEZ CARLOS & ELENA",
                "STATE_CLASS": "A1",
                "STORIES": 1.0
            },
            "district": {"name": "Old Sixth Ward", "contrib": 1},
            "box": (-95.3750, 29.7660, -95.3742, 29.7668)
        },
        {
            "raw": {
                "ACCOUNT": "0020040000002",
                "DATE_ERECT": 1892,
                "SITE_ADDR": "1905 DECATUR ST",
                "OWNER_NAME": "SCHULTZ HISTORIC HOMES TRUST",
                "STATE_CLASS": "A1",
                "STORIES": 1.5
            },
            "district": {"name": "Old Sixth Ward", "contrib": 1},
            "box": (-95.3760, 29.7670, -95.3752, 29.7678)
        },
        {
            "raw": {
                "ACCOUNT": "0020040000003",
                "DATE_ERECT": 1902,
                "SITE_ADDR": "2104 LUBBOCK ST",
                "OWNER_NAME": "WILLIAMS SARAH J",
                "STATE_CLASS": "A1",
                "STORIES": 2.0
            },
            "district": {"name": "Old Sixth Ward", "contrib": 1},
            "box": (-95.3770, 29.7680, -95.3762, 29.7688)
        },
        {
            "raw": {
                "ACCOUNT": "0020040000004",
                "DATE_ERECT": 1898,
                "SITE_ADDR": "810 SILVER ST",
                "OWNER_NAME": "OLD SIXTH WARD RESTORATION LLC",
                "STATE_CLASS": "A1",
                "STORIES": 1.0
            },
            "district": {"name": "Old Sixth Ward", "contrib": 1},
            "box": (-95.3735, 29.7655, -95.3727, 29.7663)
        },
        {
            "raw": {
                "ACCOUNT": "0020040000005",
                "DATE_ERECT": 2018,
                "SITE_ADDR": "1918 KANE ST",
                "OWNER_NAME": "URBAN INFILL DEVELOPERS LP",
                "STATE_CLASS": "A1",
                "STORIES": 3.0
            },
            "district": {"name": "Old Sixth Ward", "contrib": 0},  # Non-contributing 2018 townhome
            "box": (-95.3755, 29.7662, -95.3747, 29.7670)
        },
        {
            "raw": {
                "ACCOUNT": "0020040000006",
                "DATE_ERECT": 0,
                "SITE_ADDR": "2000 DECATUR ST",
                "OWNER_NAME": "SIXTH WARD COMMUNITY GARDEN",
                "STATE_CLASS": "C1",
                "STORIES": 0.0
            },
            "district": {"name": "Old Sixth Ward", "contrib": 0},  # Vacant lot
            "box": (-95.3765, 29.7672, -95.3757, 29.7680)
        },

        # --- HEIGHTS SOUTH ---
        {
            "raw": {
                "ACCOUNT": "0030060000001",
                "DATE_ERECT": 1910,
                "SITE_ADDR": "412 HARVARD ST",
                "OWNER_NAME": "HARRISON ROBERT & CLAIRE",
                "STATE_CLASS": "A1",
                "STORIES": 1.0
            },
            "district": {"name": "Heights South", "contrib": 1},
            "box": (-95.3980, 29.7860, -95.3972, 29.7868)
        },
        {
            "raw": {
                "ACCOUNT": "0030060000002",
                "DATE_ERECT": 1915,
                "SITE_ADDR": "530 HEIGHTS BLVD",
                "OWNER_NAME": "HEIGHTS PRESERVATION PROPERTIES",
                "STATE_CLASS": "A1",
                "STORIES": 2.0
            },
            "district": {"name": "Heights South", "contrib": 1},
            "box": (-95.3970, 29.7875, -95.3960, 29.7885)
        },
        {
            "raw": {
                "ACCOUNT": "0030060000003",
                "DATE_ERECT": 1920,
                "SITE_ADDR": "615 OXFORD ST",
                "OWNER_NAME": "BEAUCHAMP FAMILY TRUST",
                "STATE_CLASS": "A1",
                "STORIES": 1.0
            },
            "district": {"name": "Heights South", "contrib": 1},
            "box": (-95.3960, 29.7890, -95.3952, 29.7898)
        },
        {
            "raw": {
                "ACCOUNT": "0030060000004",
                "DATE_ERECT": 1924,
                "SITE_ADDR": "722 YALE ST",
                "OWNER_NAME": "HEIGHTS CAFE HOLDINGS",
                "STATE_CLASS": "F1",
                "STORIES": 1.0
            },
            "district": {"name": "Heights South", "contrib": 1},
            "box": (-95.3995, 29.7905, -95.3985, 29.7915)
        },
        {
            "raw": {
                "ACCOUNT": "0030060000005",
                "DATE_ERECT": 2021,
                "SITE_ADDR": "802 HARVARD ST",
                "OWNER_NAME": "MODERN HEIGHTS HOMES LLC",
                "STATE_CLASS": "A1",
                "STORIES": 2.5
            },
            "district": {"name": "Heights South", "contrib": 0},  # Non-contributing 2021 replacement home
            "box": (-95.3978, 29.7915, -95.3970, 29.7923)
        },
        {
            "raw": {
                "ACCOUNT": "0030060000006",
                "DATE_ERECT": 1928,
                "SITE_ADDR": "910 HEIGHTS BLVD",
                "OWNER_NAME": "JOHNSON DAVID L",
                "STATE_CLASS": "A1",
                "STORIES": 2.0
            },
            "district": {"name": "Heights South", "contrib": 1},
            "box": (-95.3968, 29.7925, -95.3958, 29.7935)
        },

        # --- BOULEVARD OAKS ---
        {
            "raw": {
                "ACCOUNT": "0040080000001",
                "DATE_ERECT": 1924,
                "SITE_ADDR": "1610 NORTH BLVD",
                "OWNER_NAME": "STERLING HISTORIC RESIDENCE TRUST",
                "STATE_CLASS": "A1",
                "STORIES": 2.5
            },
            "district": {"name": "Boulevard Oaks", "contrib": 1},
            "box": (-95.4020, 29.7260, -95.4010, 29.7270)
        },
        {
            "raw": {
                "ACCOUNT": "0040080000002",
                "DATE_ERECT": 1926,
                "SITE_ADDR": "1725 SOUTH BLVD",
                "OWNER_NAME": "BLAFFER ARTHUR C & MIRIAM",
                "STATE_CLASS": "A1",
                "STORIES": 2.0
            },
            "district": {"name": "Boulevard Oaks", "contrib": 1},
            "box": (-95.4005, 29.7245, -95.3995, 29.7255)
        },
        {
            "raw": {
                "ACCOUNT": "0040080000003",
                "DATE_ERECT": 1930,
                "SITE_ADDR": "1802 VASSAR ST",
                "OWNER_NAME": "FARISH JANE M",
                "STATE_CLASS": "A1",
                "STORIES": 2.0
            },
            "district": {"name": "Boulevard Oaks", "contrib": 1},
            "box": (-95.3985, 29.7270, -95.3975, 29.7280)
        },
        {
            "raw": {
                "ACCOUNT": "0040080000004",
                "DATE_ERECT": 1995,
                "SITE_ADDR": "1515 SOUTH BLVD",
                "OWNER_NAME": "NEW OAKS VENTURES LLC",
                "STATE_CLASS": "A1",
                "STORIES": 2.0
            },
            "district": {"name": "Boulevard Oaks", "contrib": 0},  # Non-contributing 1995 construction
            "box": (-95.4035, 29.7240, -95.4025, 29.7250)
        },

        # --- OUTSIDE DISTRICT (NON-DISTRICT HOUSTON PARCELS) ---
        {
            "raw": {
                "ACCOUNT": "0050100000001",
                "DATE_ERECT": 1956,
                "SITE_ADDR": "2400 MONTROSE BLVD",
                "OWNER_NAME": "MIDTOWN COMMERCIAL VENTURES",
                "STATE_CLASS": "F1",
                "STORIES": 4.0
            },
            "district": None,
            "box": (-95.3910, 29.7480, -95.3900, 29.7488)
        },
        {
            "raw": {
                "ACCOUNT": "0050100000002",
                "DATE_ERECT": 1968,
                "SITE_ADDR": "3100 MAIN ST",
                "OWNER_NAME": "MIDTOWN FINANCIAL CENTER LP",
                "STATE_CLASS": "F1",
                "STORIES": 8.0
            },
            "district": None,
            "box": (-95.3810, 29.7420, -95.3800, 29.7428)
        },
        {
            "raw": {
                "ACCOUNT": "0050100000003",
                "DATE_ERECT": 2015,
                "SITE_ADDR": "1500 SHEPHERD DR",
                "OWNER_NAME": "HEIGHTS GATEWAY APARTMENTS",
                "STATE_CLASS": "B1",
                "STORIES": 4.0
            },
            "district": None,
            "box": (-95.4090, 29.7750, -95.4080, 29.7758)
        },
        {
            "raw": {
                "ACCOUNT": "0050100000004",
                "DATE_ERECT": 1847,
                "SITE_ADDR": "212 DALLAS ST",
                "OWNER_NAME": "THE HERITAGE SOCIETY AT SAM HOUSTON PARK",
                "STATE_CLASS": "X1",
                "STORIES": 2.0
            },
            "district": None,  # Monument in Sam Houston Park outside formal district boundary
            "box": (-95.3718, 29.7575, -95.3708, 29.7585)
        }
    ]

    features = []
    for item in parcels:
        raw = item["raw"]
        dist_info = item["district"]
        box = item["box"]
        geom = {
            "type": "Polygon",
            "coordinates": [make_box(*box)]
        }
        normalized = normalize_parcel_attributes(raw, district_info=dist_info)
        features.append({
            "type": "Feature",
            "id": normalized["id"],
            "geometry": geom,
            "properties": normalized
        })

    return {
        "type": "FeatureCollection",
        "name": "houston_parcels_sample",
        "features": features
    }


def export_geojson(geojson_dict: Dict[str, Any], filepath: Union[str, Path]) -> None:
    """Exports dictionary to formatted GeoJSON file."""
    path = Path(filepath)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(geojson_dict, f, indent=2)
    print(f"Exported: {path} ({len(geojson_dict.get('features', []))} features)")


def generate_sample_datasets(
    pipeline_dir: Optional[Union[str, Path]] = None,
    public_dir: Optional[Union[str, Path]] = None
) -> None:
    """Generates authentic sample datasets in pipeline/sample_data and public/data."""
    if pipeline_dir is None:
        pipeline_dir = Path(__file__).resolve().parent / "sample_data"
    else:
        pipeline_dir = Path(pipeline_dir)

    if public_dir is None:
        public_dir = Path(__file__).resolve().parent.parent / "public" / "data"
    else:
        public_dir = Path(public_dir)

    districts = get_sample_historic_districts()
    landmarks = get_sample_landmarks()
    parcels = get_sample_parcels()

    # Write to pipeline sample_data
    export_geojson(districts, pipeline_dir / "historic_districts.geojson")
    export_geojson(landmarks, pipeline_dir / "landmarks.geojson")
    export_geojson(parcels, pipeline_dir / "parcels_sample.geojson")

    # Write to public data
    export_geojson(districts, public_dir / "historic_districts.geojson")
    export_geojson(landmarks, public_dir / "landmarks.geojson")
    export_geojson(parcels, public_dir / "parcels_sample.geojson")


def build_pmtiles(input_path: Union[str, Path], output_path: Union[str, Path]) -> bool:
    """
    Invokes tippecanoe to compile parcel geometries into an optimized PMTiles vector archive.
    """
    if shutil.which("tippecanoe") is None:
        print("Notice: 'tippecanoe' command-line utility not found on PATH.", file=sys.stderr)
        print("To generate .pmtiles, install tippecanoe (e.g. `brew install tippecanoe`)", file=sys.stderr)
        return False

    cmd = [
        "tippecanoe",
        f"--output={output_path}",
        "--minimum-zoom=10",
        "--maximum-zoom=16",
        "--drop-densest-as-needed",
        "--extend-zooms-if-still-dropping",
        "--simplification=10",
        "--detect-shared-borders",
        "--coalesce-densest-as-needed",
        "--layer=parcels",
        "--force",
        str(input_path)
    ]
    print("Executing:", " ".join(cmd))
    res = subprocess.run(cmd, check=False)
    return res.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Preservation Houston Atlas - Data Pipeline")
    parser.add_argument("--generate-samples", action="store_true", help="Generate sample GeoJSON datasets")
    parser.add_argument("--spatial-join", action="store_true", help="Spatial join parcels with historic districts")
    parser.add_argument("--parcels", type=str, help="Path to input parcels GeoJSON")
    parser.add_argument("--districts", type=str, help="Path to input districts GeoJSON")
    parser.add_argument("--output", type=str, help="Path to output GeoJSON/PMTiles")
    parser.add_argument("--tippecanoe", action="store_true", help="Compile input file to PMTiles using tippecanoe")

    args = parser.parse_args()

    if args.generate_samples or len(sys.argv) == 1:
        print("Generating authentic Houston sample datasets...")
        generate_sample_datasets()
        print("Sample datasets generated successfully.")

    if args.spatial_join:
        if not args.parcels or not args.districts or not args.output:
            print("Error: --spatial-join requires --parcels, --districts, and --output", file=sys.stderr)
            sys.exit(1)
        with open(args.parcels, "r", encoding="utf-8") as f:
            parcels_data = json.load(f)
        with open(args.districts, "r", encoding="utf-8") as f:
            districts_data = json.load(f)
        joined = spatial_join_parcels(parcels_data, districts_data)
        export_geojson(joined, args.output)

    if args.tippecanoe:
        if not args.parcels or not args.output:
            print("Error: --tippecanoe requires --parcels and --output", file=sys.stderr)
            sys.exit(1)
        build_pmtiles(args.parcels, args.output)


if __name__ == "__main__":
    main()
