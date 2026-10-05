import json
import unittest
from pathlib import Path
from pipeline.build_tiles import (
    normalize_parcel_attributes,
    point_in_polygon_geometry,
    spatial_join_parcels,
    get_sample_historic_districts,
    get_sample_landmarks,
    get_sample_parcels,
    generate_sample_datasets
)

class TestPipeline(unittest.TestCase):
    def test_normalize_attributes(self):
        raw = {
            "ACCOUNT": "0010020000001",
            "DATE_ERECT": 1925,
            "SITE_ADDR": "1200 TEXAS AVE",
            "OWNER_NAME": "HISTORIC TRUST LLC",
            "STATE_CLASS": "A1",
            "STORIES": 3.0
        }
        res = normalize_parcel_attributes(raw, district_info={"name": "Downtown", "contrib": 1})
        self.assertEqual(res["id"], "0010020000001")
        self.assertEqual(res["yr"], 1925)
        self.assertEqual(res["addr"], "1200 TEXAS AVE")
        self.assertEqual(res["contrib"], 1)
        self.assertEqual(res["dist"], "Downtown")
        self.assertEqual(res["owner"], "HISTORIC TRUST LLC")
        self.assertEqual(res["use"], "RES")
        self.assertEqual(res["st"], 3.0)

    def test_parcel_level_contrib_maintained_inside_district(self):
        # A non-contributing parcel (e.g. modern infill built in 2018 with survey status contrib: 0)
        # must preserve contrib: 0 even when spatial join identifies it as inside a historic district.
        raw_non_contrib = {
            "ACCOUNT": "0020040000005",
            "DATE_ERECT": 2018,
            "SITE_ADDR": "1918 KANE ST",
            "OWNER_NAME": "URBAN INFILL DEVELOPERS LP",
            "STATE_CLASS": "A1",
            "STORIES": 3.0,
            "contrib": 0
        }
        res = normalize_parcel_attributes(raw_non_contrib, district_info={"name": "Old Sixth Ward", "contrib": 1})
        self.assertEqual(res["id"], "0020040000005")
        self.assertEqual(res["yr"], 2018)
        self.assertEqual(res["dist"], "Old Sixth Ward")
        self.assertEqual(res["contrib"], 0)

    def test_normalize_float_year_string(self):
        raw = {
            "ACCOUNT": "0010020000099",
            "DATE_ERECT": "1925.0",
            "SITE_ADDR": "100 MAIN ST"
        }
        res = normalize_parcel_attributes(raw)
        self.assertEqual(res["yr"], 1925)

    def test_normalize_outside_district(self):
        raw = {
            "ACCOUNT": "0020030000002",
            "DATE_ERECT": 1950,
            "SITE_ADDR": "500 MAIN ST",
            "OWNER_NAME": "COMMERCIAL REALTY CORP",
            "STATE_CLASS": "F1",
            "STORIES": 10.0
        }
        res = normalize_parcel_attributes(raw, district_info=None)
        self.assertEqual(res["id"], "0020030000002")
        self.assertEqual(res["yr"], 1950)
        self.assertEqual(res["addr"], "500 MAIN ST")
        self.assertEqual(res["contrib"], -1)
        self.assertIsNone(res["dist"])
        self.assertEqual(res["use"], "COM")
        self.assertEqual(res["st"], 10.0)

    def test_normalize_defaults_and_edge_cases(self):
        raw = {}
        res = normalize_parcel_attributes(raw)
        self.assertEqual(res["id"], "")
        self.assertEqual(res["yr"], 0)
        self.assertEqual(res["addr"], "")
        self.assertEqual(res["owner"], "")
        self.assertEqual(res["use"], "RES")
        self.assertEqual(res["contrib"], -1)
        self.assertIsNone(res["dist"])
        self.assertEqual(res["st"], 1.0)

    def test_normalize_use_categories(self):
        test_cases = [
            ("A1", "RES"),
            ("B2", "RES"),
            ("C1", "VAC"),
            ("D1", "VAC"),
            ("F1", "COM"),
            ("J2", "COM"),
            ("L1", "IND"),
            ("X1", "VAC"),
        ]
        for code, expected_use in test_cases:
            res = normalize_parcel_attributes({"STATE_CLASS": code})
            self.assertEqual(res["use"], expected_use, f"Failed mapping for {code}")

    def test_point_in_polygon(self):
        poly_geom = {
            "type": "Polygon",
            "coordinates": [[
                [0.0, 0.0],
                [10.0, 0.0],
                [10.0, 10.0],
                [0.0, 10.0],
                [0.0, 0.0]
            ]]
        }
        self.assertTrue(point_in_polygon_geometry([5.0, 5.0], poly_geom))
        self.assertFalse(point_in_polygon_geometry([15.0, 5.0], poly_geom))
        self.assertFalse(point_in_polygon_geometry([-1.0, 5.0], poly_geom))

    def test_spatial_join(self):
        districts = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {"name": "Test Historic District", "contrib": 1},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-95.365, 29.760],
                        [-95.360, 29.760],
                        [-95.360, 29.765],
                        [-95.365, 29.765],
                        [-95.365, 29.760]
                    ]]
                }
            }]
        }
        parcels = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "ACCOUNT": "9990001",
                        "DATE_ERECT": 1910,
                        "SITE_ADDR": "100 TEST ST",
                        "STATE_CLASS": "A1"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-95.363, 29.762],
                            [-95.362, 29.762],
                            [-95.362, 29.763],
                            [-95.363, 29.763],
                            [-95.363, 29.762]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "ACCOUNT": "9990002",
                        "DATE_ERECT": 1980,
                        "SITE_ADDR": "500 OUTSIDE RD",
                        "STATE_CLASS": "F1"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-95.350, 29.750],
                            [-95.349, 29.750],
                            [-95.349, 29.751],
                            [-95.350, 29.751],
                            [-95.350, 29.750]
                        ]]
                    }
                }
            ]
        }
        joined = spatial_join_parcels(parcels, districts)
        features = joined["features"]
        self.assertEqual(len(features), 2)
        # First parcel is inside district
        self.assertEqual(features[0]["properties"]["dist"], "Test Historic District")
        self.assertEqual(features[0]["properties"]["contrib"], 1)
        # Second parcel is outside
        self.assertIsNone(features[1]["properties"]["dist"])
        self.assertEqual(features[1]["properties"]["contrib"], -1)

    def test_geojson_sample_files_exist_and_valid(self):
        root = Path(__file__).resolve().parent.parent.parent
        files_to_check = [
            root / "pipeline" / "sample_data" / "historic_districts.geojson",
            root / "pipeline" / "sample_data" / "landmarks.geojson",
            root / "pipeline" / "sample_data" / "parcels_sample.geojson",
            root / "public" / "data" / "historic_districts.geojson",
            root / "public" / "data" / "landmarks.geojson",
            root / "public" / "data" / "parcels_sample.geojson",
        ]

        required_parcel_keys = {"id", "yr", "addr", "owner", "use", "dist", "contrib", "st"}

        for path in files_to_check:
            self.assertTrue(path.exists(), f"File does not exist: {path}")
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.assertEqual(data.get("type"), "FeatureCollection", f"Not FeatureCollection: {path}")
            features = data.get("features", [])
            self.assertGreater(len(features), 0, f"No features in: {path}")

            for feat in features:
                self.assertEqual(feat.get("type"), "Feature")
                self.assertIn("geometry", feat)
                self.assertIn("properties", feat)
                geom_type = feat["geometry"].get("type")
                self.assertIn(geom_type, ["Point", "Polygon", "MultiPolygon"])

                # If parcels, verify exact schema
                if "parcels" in path.name:
                    props = feat["properties"]
                    self.assertTrue(required_parcel_keys.issubset(set(props.keys())),
                                    f"Missing keys in parcel {props.get('id')}: {set(props.keys())}")
                    self.assertIn(props["contrib"], [1, 0, -1])
                    self.assertIn(props["use"], ["RES", "COM", "IND", "VAC"])
                    self.assertIsInstance(props["yr"], int)
                    self.assertIsInstance(props["st"], float)

                # If districts, check required fields
                if "historic_districts" in path.name:
                    props = feat["properties"]
                    self.assertIn("name", props)
                    self.assertIn("designated_year", props)
                    self.assertIn("description", props)

                # If landmarks, check required fields
                if "landmarks" in path.name:
                    props = feat["properties"]
                    self.assertIn("name", props)
                    self.assertIn("addr", props)
                    self.assertIn("yr", props)
                    self.assertIn("designation", props)

    def test_authoritative_historic_districts_dataset(self):
        districts_path = Path(__file__).resolve().parent.parent.parent / "public" / "data" / "historic_districts.geojson"
        self.assertTrue(districts_path.exists())
        with open(districts_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        features = data.get("features", [])
        self.assertGreaterEqual(len(features), 23, "Must contain all 23 official City of Houston Historic Districts")
        names = [f["properties"]["name"] for f in features]
        self.assertIn("Old Sixth Ward", names)
        self.assertIn("Norhill", names)
        self.assertIn("Courtland Place", names)
        self.assertIn("Glenbrook Valley", names)
        self.assertIn("Brunner-Harmonium", names)
        self.assertIn("Freedmen's Town", names)

    def test_year_histogram_dataset(self):
        hist_path = Path(__file__).resolve().parent.parent.parent / "public" / "data" / "year_histogram.json"
        self.assertTrue(hist_path.exists())
        with open(hist_path, "r", encoding="utf-8") as f:
            hist = json.load(f)
        self.assertIn("1836", hist)
        self.assertIn("1920", hist)
        self.assertIn("2026", hist)
        total_structures = sum(hist.values())
        self.assertGreater(total_structures, 1000000, "Countywide dated structures must exceed 1,000,000")

    def test_institutional_founding_year_enrichment(self):
        from pipeline.build_hcad_tiles import normalize_parcel
        from shapely.geometry import Point
        dummy_point = Point(-95.40, 29.72)

        # Rice University campus with yr_impr=0 should be enriched to 1912
        rice = normalize_parcel("0421790000001", "6100 MAIN ST", "WM RICE INSTITUTE", 0, dummy_point, None, [])
        self.assertEqual(rice["yr"], 1912)

        # Hermann Park with yr_impr=0 should be enriched to 1914
        hermann = normalize_parcel("0421790000004", "6001 FANNIN ST", "CITY OF HOUSTON", 0, dummy_point, None, [])
        self.assertEqual(hermann["yr"], 1914)

        # Texas Medical Center with yr_impr=0 should be enriched to 1945
        tmc = normalize_parcel("0421800000001", "6565 FANNIN ST", "METHODIST HOSPITAL", 0, dummy_point, None, [])
        self.assertEqual(tmc["yr"], 1945)


if __name__ == "__main__":
    unittest.main()
