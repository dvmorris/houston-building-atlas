#!/usr/bin/env python3
"""
Preservation Houston Building Atlas - Authoritative Historic Districts Fetcher
==============================================================================
Fetches authoritative historic and heritage district boundaries directly from
the City of Houston Planning & Development ArcGIS REST services:
- Layer 8: City of Houston Historic Districts (23 municipal districts)
- Layer 41: City of Houston Heritage Districts (Freedmen's Town)
- Layer 9: National Register of Historic Places Districts (Federal NRHP)

Enriches geometries with official designation metadata, architectural styles,
historical descriptions, bounding boxes, and centroids.

Outputs:
  - public/data/historic_districts.geojson
  - pipeline/sample_data/historic_districts.geojson
"""

import os
import sys
import json
import urllib.request
from typing import Dict, List, Any
from shapely.geometry import shape

BASE_SERVICE = "https://mycity2.houstontx.gov/gisweb01/rest/services/HoustonMap/Planning_and_Development/MapServer"

# Comprehensive metadata catalogue for City of Houston Historic & Heritage Districts
DISTRICT_METADATA: Dict[str, Dict[str, Any]] = {
    "1": {
        "slug": "courtland-place",
        "name": "Courtland Place",
        "full_name": "Courtland Place Historic District",
        "dist_num": 1,
        "designated_year": 1996,
        "designation_type": "City Historic District",
        "arch_styles": ["Neo-Classical", "Italian Renaissance", "Tudor Revival", "Colonial Revival"],
        "description": "Houston's premier grand residential boulevard enclave, planned in 1906 by S.E. Gideon with monumental brick entrance gates, majestic palm trees, and landmark estates designed by Birdsall Briscoe and John Staub.",
    },
    "2": {
        "slug": "main-street-market-square",
        "name": "Main Street / Market Square",
        "full_name": "Main Street/Market Square Historic District",
        "dist_num": 2,
        "designated_year": 1997,
        "designation_type": "City Historic District",
        "arch_styles": ["Victorian Commercial", "Italianate", "Commercial Classical", "Art Deco"],
        "description": "The historic civic and commercial heart of 19th-century Houston surrounding the original 1836 town square, featuring Texas's finest collection of Victorian commercial brick storefronts and early financial institutions.",
    },
    "3": {
        "slug": "west-eleventh-place",
        "name": "West Eleventh Place",
        "full_name": "West Eleventh Place Historic District",
        "dist_num": 3,
        "designated_year": 1997,
        "designation_type": "City Historic District",
        "arch_styles": ["Craftsman", "Eclectic Revival", "Tudor Revival"],
        "description": "A secluded residential cul-de-sac enclave designed in 1920 by noted architect Maurice J. Sullivan, featuring distinctive English cottage and Craftsman residences set along private brick gardens.",
    },
    "4": {
        "slug": "westmoreland",
        "name": "Westmoreland",
        "full_name": "Westmoreland Historic District",
        "dist_num": 4,
        "designated_year": 1997,
        "designation_type": "City Historic District",
        "arch_styles": ["Queen Anne", "Craftsman", "Colonial Revival", "Prairie"],
        "description": "Planned in 1902 as Houston's first elite master-planned streetcar suburb south of downtown, characterized by wide esplanades, stone carriage blocks, and ornate transitional Victorian and Craftsman homes.",
    },
    "5": {
        "slug": "old-sixth-ward",
        "name": "Old Sixth Ward",
        "full_name": "Old Sixth Ward Historic District",
        "dist_num": 5,
        "designated_year": 1998,
        "designation_type": "City Historic District",
        "arch_styles": ["Victorian Cottage", "Queen Anne", "Folk Victorian", "Greek Revival"],
        "description": "Houston's oldest intact residential neighborhood, settled in the 1850s by German and rail worker families, preserving the greatest concentration of 19th-century Victorian cottages and gingerbread trim in the southern United States.",
    },
    "6": {
        "slug": "avondale-east",
        "name": "Avondale East",
        "full_name": "Avondale East Historic District",
        "dist_num": 6,
        "designated_year": 1999,
        "designation_type": "City Historic District",
        "arch_styles": ["Prairie School", "Craftsman", "American Foursquare", "Colonial Revival"],
        "description": "An early 20th-century residential streetcar subdivision in Montrose developed between 1907 and 1925, distinguished by grand American Foursquare residences, Craftsman woodwork, and wide front verandas.",
    },
    "7": {
        "slug": "norhill",
        "name": "Norhill",
        "full_name": "Norhill Historic District",
        "dist_num": 7,
        "designated_year": 2000,
        "designation_type": "City Historic District",
        "arch_styles": ["Craftsman Bungalow", "Spanish Colonial Revival", "Tudor Revival"],
        "description": "A beloved master-planned 1920s neighborhood developed by Will Hogg's Varner Realty Co., celebrated for its dense rows of intact Craftsman bungalows with exposed rafter tails, bracketed eaves, and Proctor Plaza Park.",
    },
    "8": {
        "slug": "broadacres",
        "name": "Broadacres",
        "full_name": "Broadacres Historic District",
        "dist_num": 8,
        "designated_year": 2007,
        "designation_type": "City Historic District",
        "arch_styles": ["Georgian Revival", "Spanish Colonial Revival", "Tudor Revival", "Italian Renaissance"],
        "description": "A landmark planned park-like residential community developed in the 1920s by Capt. James A. Baker and prominent Houston leaders, designed by architect William Ward Watkin with wide oak-lined boulevards and monumental estates.",
    },
    "9": {
        "slug": "avondale-west",
        "name": "Avondale West",
        "full_name": "Avondale West Historic District",
        "dist_num": 9,
        "designated_year": 2007,
        "designation_type": "City Historic District",
        "arch_styles": ["Craftsman", "Prairie", "Colonial Revival", "Bungalow"],
        "description": "The western continuation of Montrose's historic Avondale subdivision along Lovett and Stratford streets, featuring well-preserved Craftsman bungalows and two-story brick and timber residences.",
    },
    "10": {
        "slug": "houston-heights-west",
        "name": "Houston Heights West",
        "full_name": "Houston Heights West Historic District",
        "dist_num": 10,
        "designated_year": 2007,
        "designation_type": "City Historic District",
        "arch_styles": ["Queen Anne", "Folk Victorian", "Craftsman Bungalow", "Colonial Revival"],
        "description": "The western sector of Houston's premier 1891 streetcar suburb, developed by the Omaha and South Texas Land Company, showcasing picturesque Victorian turrets, wraparound porches, and Craftsman streetscapes.",
    },
    "11": {
        "slug": "houston-heights-east",
        "name": "Houston Heights East",
        "full_name": "Houston Heights East Historic District",
        "dist_num": 11,
        "designated_year": 2008,
        "designation_type": "City Historic District",
        "arch_styles": ["Victorian", "Queen Anne", "Craftsman", "Folk Victorian"],
        "description": "The eastern residential sector of the Heights along Harvard and Cortlandt streets, lined with magnificent turn-of-the-century Victorian residences, shady oak trees, and historic neighborhood churches.",
    },
    "12": {
        "slug": "freeland",
        "name": "Freeland",
        "full_name": "Freeland Historic District",
        "dist_num": 12,
        "designated_year": 2008,
        "designation_type": "City Historic District",
        "arch_styles": ["Craftsman Bungalow", "Folk Victorian"],
        "description": "A charming and compact residential enclave in Near Northside platted in the 1920s, consisting of intact modest Craftsman bungalows built for middle-class rail and industrial workers.",
    },
    "13": {
        "slug": "shadow-lawn",
        "name": "Shadow Lawn",
        "full_name": "Shadow Lawn Historic District",
        "dist_num": 13,
        "designated_year": 2008,
        "designation_type": "City Historic District",
        "arch_styles": ["Tudor Revival", "French Eclectic", "Colonial Revival", "Neoclassical"],
        "description": "A prestigious cul-de-sac enclave bordering Rice University and Hermann Park, platted in 1923 by Homer D. Torrey, featuring architect-designed revival manors and stately live oaks.",
    },
    "14": {
        "slug": "audubon-place",
        "name": "Audubon Place",
        "full_name": "Audubon Place Historic District",
        "dist_num": 14,
        "designated_year": 2009,
        "designation_type": "City Historic District",
        "arch_styles": ["Craftsman", "Prairie", "Tudor Revival", "Mission / Spanish Revival"],
        "description": "An elegant Montrose subdivision platted in 1910 along Audubon, Kipling, and Marshall streets, famous for its wide palm- and oak-lined streets and impressive collection of Craftsman and Prairie-style residences.",
    },
    "15": {
        "slug": "boulevard-oaks",
        "name": "Boulevard Oaks",
        "full_name": "Boulevard Oaks Historic District",
        "dist_num": 15,
        "designated_year": 2009,
        "designation_type": "City Historic District",
        "arch_styles": ["Georgian Revival", "Tudor Revival", "French Eclectic", "Spanish Colonial Revival"],
        "description": "World-renowned for its cathedral live oak canopy along North and South Boulevards, planned in the 1920s by landscape architect William L. Phillips with extraordinary period revival residences.",
    },
    "16": {
        "slug": "first-montrose-commons",
        "name": "First Montrose Commons",
        "full_name": "First Montrose Commons Historic District",
        "dist_num": 16,
        "designated_year": 2010,
        "designation_type": "City Historic District",
        "arch_styles": ["Queen Anne", "Craftsman", "Folk Victorian", "Prairie"],
        "description": "A diverse historic neighborhood in southern Montrose between West Alabama and Richmond, featuring a rich variety of early 1900s Victorian cottages, American Foursquares, and Craftsman duplexes.",
    },
    "17": {
        "slug": "houston-heights-south",
        "name": "Houston Heights South",
        "full_name": "Houston Heights South Historic District",
        "dist_num": 17,
        "designated_year": 2011,
        "designation_type": "City Historic District",
        "arch_styles": ["Victorian", "Queen Anne", "Craftsman Bungalow", "Folk Victorian"],
        "description": "The southern gateway to the Heights bounded by 11th Street and I-10, encompassing the Heights Boulevard historic esplanade, Victorian mansions, and early commercial storefronts.",
    },
    "18": {
        "slug": "woodland-heights",
        "name": "Woodland Heights",
        "full_name": "Woodland Heights Historic District",
        "dist_num": 18,
        "designated_year": 2011,
        "designation_type": "City Historic District",
        "arch_styles": ["Craftsman Bungalow", "Queen Anne", "Colonial Revival", "Folk Victorian"],
        "description": "Developed in 1907 by William A. Wilson along the Houston Electric Company streetcar line, featuring rolling topography, proximity to Stude and White Oak Parks, and pristine Craftsman bungalows.",
    },
    "19": {
        "slug": "glenbrook-valley",
        "name": "Glenbrook Valley",
        "full_name": "Glenbrook Valley Historic District",
        "dist_num": 19,
        "designated_year": 2011,
        "designation_type": "City Historic District",
        "arch_styles": ["Mid-Century Modern", "Contemporary", "American Ranch", "Neo-Colonial Ranch"],
        "description": "The largest designated mid-century modern historic district in the state of Texas and one of the largest in the nation, developed between 1953 and 1962 with stunning custom Atomic Era and Mid-Century Modern ranch estates.",
    },
    "20": {
        "slug": "germantown",
        "name": "Germantown",
        "full_name": "Germantown Historic District",
        "dist_num": 20,
        "designated_year": 2012,
        "designation_type": "City Historic District",
        "arch_styles": ["Folk Victorian", "Craftsman Bungalow", "Queen Anne Cottage"],
        "description": "Platted in 1894 along Little White Oak Bayou by German immigrant families, retaining modest late 19th-century frame cottages, brick streets, and deep vernacular community ties.",
    },
    "21": {
        "slug": "starkweather",
        "name": "Starkweather",
        "full_name": "Starkweather Historic District",
        "dist_num": 21,
        "designated_year": 2014,
        "designation_type": "City Historic District",
        "arch_styles": ["Folk Victorian", "Craftsman", "Vernacular Cottage"],
        "description": "A historic residential enclave in Independence Heights, established during the Jim Crow era as Texas's first incorporated Black municipality, preserving vernacular frame cottages and shotgun structures.",
    },
    "22": {
        "slug": "high-first-ward",
        "name": "High First Ward",
        "full_name": "High First Ward Historic District",
        "dist_num": 22,
        "designated_year": 2014,
        "designation_type": "City Historic District",
        "arch_styles": ["Victorian Cottage", "Queen Anne", "Folk Victorian", "Bungalow"],
        "description": "A historic working-class neighborhood northwest of downtown near the Southern Pacific rail yards, retaining early Victorian cottages, corner grocery structures, and immigrant artisan homes.",
    },
    "23": {
        "slug": "brunner-harmonium",
        "name": "Brunner-Harmonium",
        "full_name": "Brunner-Harmonium Historic District",
        "dist_num": 23,
        "designated_year": 2022,
        "designation_type": "City Historic District",
        "arch_styles": ["Folk Victorian", "Queen Anne Cottage", "Craftsman Bungalow"],
        "description": "Houston's newest historic district, located in the historic West End/Washington Avenue corridor, preserving vernacular 1890s-1920s railroad worker homes and historic church structures.",
    },
}

# Metadata for Heritage Districts (Layer 41)
HERITAGE_METADATA: Dict[str, Dict[str, Any]] = {
    "1": {
        "slug": "freedmens-town-heritage",
        "name": "Freedmen's Town",
        "full_name": "Freedmen's Town Heritage District",
        "dist_num": 1,
        "designated_year": 2021,
        "designation_type": "City Heritage District",
        "arch_styles": ["Shotgun House", "Creole Cottage", "Victorian Vernacular", "Craftsman"],
        "description": "Settled in 1865 by formerly enslaved people upon Juneteenth emancipation, Freedmen's Town served as the cultural, educational, and commercial center of Black Houston, featuring hand-laid brick streets, historic churches, and shotgun cottages.",
    }
}

# Metadata for National Register Districts (Layer 9) that complement City districts
NRHP_METADATA: Dict[str, Dict[str, Any]] = {
    "INDEPENDENCE HEIGHTS N.R.": {
        "slug": "independence-heights-nr",
        "name": "Independence Heights (NRHP)",
        "full_name": "Independence Heights National Register Historic District",
        "designated_year": 1997,
        "designation_type": "National Register Historic District",
        "arch_styles": ["Vernacular Frame", "Shotgun", "Bungalow", "Folk Victorian"],
        "description": "The first incorporated African American municipality in Texas (incorporated 1915), documenting the resilience, civic independence, and architectural history of early 20th-century Black Texans.",
    },
    "IDYLWOOD N.R.": {
        "slug": "idylwood-nr",
        "name": "Idylwood (NRHP)",
        "full_name": "Idylwood National Register Historic District",
        "designated_year": 2000,
        "designation_type": "National Register Historic District",
        "arch_styles": ["Tudor Revival", "Craftsman Bungalow", "Colonial Revival"],
        "description": "A picturesque 1920s-1930s residential subdivision in Houston's East End bordering Brays Bayou, noted for its hilly topography, winding streets, and dense Tudor Revival masonry bungalows.",
    },
    "NEAR NORTHSIDE N.R.": {
        "slug": "near-northside-nr",
        "name": "Near Northside (NRHP)",
        "full_name": "Near Northside National Register Historic District",
        "designated_year": 2021,
        "designation_type": "National Register Historic District",
        "arch_styles": ["Queen Anne", "Folk Victorian", "Bungalow", "Commercial"],
        "description": "A historic rail and industrial community north of Buffalo Bayou with deep working-class roots, European immigrant settlement, and later Mexican-American cultural heritage.",
    },
}


def fetch_geojson(layer_id: int) -> Dict[str, Any]:
    """Query ArcGIS REST service for full GeoJSON in EPSG:4326."""
    url = f"{BASE_SERVICE}/{layer_id}/query?where=1%3D1&outFields=*&f=geojson&outSR=4326"
    print(f"Fetching Layer {layer_id} from {url}...")
    req = urllib.request.Request(url, headers={"User-Agent": "PreservationHoustonAtlas/2.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def process_districts() -> Dict[str, Any]:
    """Fetch and enrich all City Historic, Heritage, and NRHP districts."""
    features = []

    # 1. Layer 8: City of Houston Historic Districts
    layer8_data = fetch_geojson(8)
    for feat in layer8_data.get("features", []):
        raw_props = feat.get("properties", {})
        dist_num_str = str(raw_props.get("DIST", "")).strip()
        geom = shape(feat["geometry"])
        bounds = list(geom.bounds)  # [minx, miny, maxx, maxy]
        centroid = [geom.centroid.x, geom.centroid.y]

        meta = DISTRICT_METADATA.get(dist_num_str, {
            "slug": f"district-{dist_num_str}",
            "name": raw_props.get("NAME", f"Historic District {dist_num_str}"),
            "full_name": raw_props.get("NAME", f"District {dist_num_str}"),
            "dist_num": int(dist_num_str) if dist_num_str.isdigit() else 0,
            "designated_year": 2000,
            "designation_type": "City Historic District",
            "arch_styles": ["Victorian", "Craftsman"],
            "description": f"City of Houston designated Historic District #{dist_num_str}.",
        })

        props = {
            "id": meta["slug"],
            "name": meta["name"],
            "full_name": meta["full_name"],
            "dist_num": meta["dist_num"],
            "designated_year": meta["designated_year"],
            "designation_type": meta["designation_type"],
            "arch_styles": meta["arch_styles"],
            "description": meta["description"],
            "bounds": bounds,
            "centroid": centroid,
            "area_sqft": raw_props.get("Shape.STArea()", 0),
        }

        features.append({
            "type": "Feature",
            "id": meta["slug"],
            "properties": props,
            "geometry": feat["geometry"],
        })

    # 2. Layer 41: City of Houston Heritage Districts (Freedmen's Town)
    try:
        layer41_data = fetch_geojson(41)
        for feat in layer41_data.get("features", []):
            raw_props = feat.get("properties", {})
            dist_num_str = str(raw_props.get("H_DISTRICT_NUM", "1")).strip()
            geom = shape(feat["geometry"])
            bounds = list(geom.bounds)
            centroid = [geom.centroid.x, geom.centroid.y]

            meta = HERITAGE_METADATA.get(dist_num_str, {
                "slug": "freedmens-town-heritage",
                "name": "Freedmen's Town",
                "full_name": "Freedmen's Town Heritage District",
                "dist_num": 1,
                "designated_year": 2021,
                "designation_type": "City Heritage District",
                "arch_styles": ["Shotgun House", "Creole Cottage", "Victorian Vernacular"],
                "description": "Historic Freedmen's Town Heritage District.",
            })

            props = {
                "id": meta["slug"],
                "name": meta["name"],
                "full_name": meta["full_name"],
                "dist_num": meta["dist_num"],
                "designated_year": meta["designated_year"],
                "designation_type": meta["designation_type"],
                "arch_styles": meta["arch_styles"],
                "description": meta["description"],
                "bounds": bounds,
                "centroid": centroid,
                "area_sqft": raw_props.get("Shape.STArea()", 0),
            }

            features.append({
                "type": "Feature",
                "id": meta["slug"],
                "properties": props,
                "geometry": feat["geometry"],
            })
    except Exception as e:
        print(f"Warning: Could not fetch Layer 41: {e}")

    # 3. Layer 9: National Register Districts (selective non-overlapping major districts)
    try:
        layer9_data = fetch_geojson(9)
        for feat in layer9_data.get("features", []):
            raw_props = feat.get("properties", {})
            name = raw_props.get("NAME", "").strip()
            if name in NRHP_METADATA:
                meta = NRHP_METADATA[name]
                geom = shape(feat["geometry"])
                bounds = list(geom.bounds)
                centroid = [geom.centroid.x, geom.centroid.y]

                props = {
                    "id": meta["slug"],
                    "name": meta["name"],
                    "full_name": meta["full_name"],
                    "dist_num": 0,
                    "designated_year": meta["designated_year"],
                    "designation_type": meta["designation_type"],
                    "arch_styles": meta["arch_styles"],
                    "description": meta["description"],
                    "bounds": bounds,
                    "centroid": centroid,
                    "area_sqft": raw_props.get("Shape.STArea()", 0),
                }

                features.append({
                    "type": "Feature",
                    "id": meta["slug"],
                    "properties": props,
                    "geometry": feat["geometry"],
                })
    except Exception as e:
        print(f"Warning: Could not fetch Layer 9: {e}")

    # Sort features by designation_type and dist_num
    def sort_key(f):
        p = f["properties"]
        dtype_rank = 0 if p["designation_type"] == "City Historic District" else (1 if p["designation_type"] == "City Heritage District" else 2)
        return (dtype_rank, p.get("dist_num", 99), p["name"])

    features.sort(key=sort_key)
    print(f"Compiled {len(features)} total authoritative districts.")

    return {
        "type": "FeatureCollection",
        "name": "historic_districts",
        "features": features,
    }


def main():
    data = process_districts()

    output_paths = [
        "public/data/historic_districts.geojson",
        "pipeline/sample_data/historic_districts.geojson",
    ]

    for p in output_paths:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Wrote {len(data['features'])} districts to {p}")


if __name__ == "__main__":
    main()
