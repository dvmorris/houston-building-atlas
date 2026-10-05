#!/usr/bin/env python3
"""
Preservation Houston Building Atlas - Build Year Histogram Generator
===================================================================
Scans all 1,546,774 parcels in HCAD Parcels.gdb and computes an authoritative
year-by-year structure count histogram for instant real-time timeline filtering.

Outputs:
  - public/data/year_histogram.json
  - pipeline/sample_data/year_histogram.json
"""

import os
import json
from collections import Counter
import pyogrio.raw

GDB_PATH = "pipeline/raw_data/Parcels/Parcels.gdb"

def generate():
    print(f"Reading yr_impr from {GDB_PATH}...")
    meta, _, _, field_data = pyogrio.raw.read(
        GDB_PATH,
        columns=["yr_impr"],
        read_geometry=False,
    )
    yr_col = field_data[0]
    counts = Counter()

    for yr in yr_col:
        try:
            val = int(yr or 0)
            if 1836 <= val <= 2026:
                counts[val] += 1
        except (ValueError, TypeError):
            pass

    histogram = {str(y): counts[y] for y in range(1836, 2027)}
    total = sum(counts.values())
    print(f"Computed histogram for {len(histogram)} years (Total: {total:,} structures).")

    output_paths = [
        "public/data/year_histogram.json",
        "pipeline/sample_data/year_histogram.json",
    ]

    for p in output_paths:
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(histogram, f)
        print(f"Wrote histogram to {p}")

if __name__ == "__main__":
    generate()
