#!/usr/bin/env bash
# ==============================================================================
# Preservation Houston Building Atlas - Full HCAD Ingestion & PMTiles Pipeline
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORK_DIR="${SCRIPT_DIR}/raw_data"
OUTPUT_DIR="${PROJECT_ROOT}/public/data"

echo "======================================================================"
echo "Preservation Houston Atlas — Full HCAD Data Ingestion Pipeline"
echo "======================================================================"

# 1. Check dependencies
echo "==> Checking required tools..."
command -v python3 >/dev/null 2>&1 || { echo "Error: python3 is required." >&2; exit 1; }

if ! command -v tippecanoe >/dev/null 2>&1; then
  echo ""
  echo "⚠️  'tippecanoe' is required to compile 2 million parcels into PMTiles."
  echo "To install on macOS:"
  echo "    brew install tippecanoe"
  echo "To install on Linux / Debian / Ubuntu:"
  echo "    sudo apt-get install -y build-essential libsqlite3-dev zlib1g-dev"
  echo "    git clone https://github.com/felt/tippecanoe.git && cd tippecanoe && make -j\$(nproc) && sudo make install"
  echo ""
  read -p "Would you like to continue generating normalized GeoJSON without tippecanoe? (y/n) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

mkdir -p "${WORK_DIR}"
mkdir -p "${OUTPUT_DIR}"

echo "==> Step 1: HCAD GIS Parcels Source Data"
echo "HCAD provides the full Harris County Parcel Shapefile and Tax Rolls at:"
echo "    https://hcad.org/pdata/pdata-gis-downloads.html"
echo ""

PARCEL_ZIP="${WORK_DIR}/Parcels.zip"
PARCEL_SHP="${WORK_DIR}/Parcels.shp"
PARCEL_GEOJSON="${WORK_DIR}/parcels_all.geojson"

if [ ! -f "${PARCEL_SHP}" ] && [ ! -f "${PARCEL_GEOJSON}" ]; then
  if [ -f "${PARCEL_ZIP}" ]; then
    echo "Unzipping existing ${PARCEL_ZIP}..."
    unzip -o "${PARCEL_ZIP}" -d "${WORK_DIR}"
  else
    echo "Looking for HCAD parcel data in ${WORK_DIR}..."
    echo "If you have downloaded HCAD's 'Parcels.zip' or Shapefile, copy it into:"
    echo "    ${WORK_DIR}/"
    echo ""
    echo "Attempting direct download of HCAD GIS dataset..."
    # HCAD direct download endpoints (when accessible)
    curl -L --fail "https://hcad.org/assets/uploads/data/Parcels.zip" -o "${PARCEL_ZIP}" 2>/dev/null || \
    curl -L --fail "https://hcad.org/pdata/Parcels.zip" -o "${PARCEL_ZIP}" 2>/dev/null || {
      echo "Note: HCAD requires direct download via browser due to anti-bot protection."
      echo "Please download the Parcels Shapefile from:"
      echo "    https://hcad.org/pdata/pdata-gis-downloads.html"
      echo "Save it as: ${PARCEL_ZIP}"
      echo ""
      echo "Proceeding with sample historic parcels for testing..."
    }
    if [ -f "${PARCEL_ZIP}" ]; then
      unzip -o "${PARCEL_ZIP}" -d "${WORK_DIR}"
    fi
  fi
fi

echo "==> Step 2: Running Schema Normalization & Spatial Join..."
python3 "${SCRIPT_DIR}/build_tiles.py" --generate-samples

# If full parcels dataset exists, normalize it
if [ -f "${PARCEL_SHP}" ] || [ -f "${PARCEL_GEOJSON}" ]; then
  INPUT_FILE="${PARCEL_GEOJSON}"
  if [ -f "${PARCEL_SHP}" ] && ! [ -f "${PARCEL_GEOJSON}" ]; then
    if command -v ogr2ogr >/dev/null 2>&1; then
      echo "Converting Shapefile to GeoJSON via ogr2ogr..."
      ogr2ogr -f GeoJSON "${PARCEL_GEOJSON}" "${PARCEL_SHP}" -t_srs EPSG:4326
    else
      echo "Warning: ogr2ogr not found. Install gdal ('brew install gdal') to convert .shp to .geojson."
    fi
  fi

  if [ -f "${INPUT_FILE}" ]; then
    echo "Joining full parcel dataset with City of Houston Historic Districts..."
    python3 "${SCRIPT_DIR}/build_tiles.py" \
      --spatial-join \
      --parcels "${INPUT_FILE}" \
      --districts "${OUTPUT_DIR}/historic_districts.geojson" \
      --output "${WORK_DIR}/parcels_normalized.geojson"

    if command -v tippecanoe >/dev/null 2>&1; then
      echo "==> Step 3: Compiling into PMTiles vector archive with Tippecanoe..."
      tippecanoe \
        -o "${OUTPUT_DIR}/houston_parcels.pmtiles" \
        -Z10 -z16 \
        --layer=parcels \
        --drop-densest-as-needed \
        --extend-zooms-if-still-dropping \
        --simplification=10 \
        --detect-shared-borders \
        --coalesce-densest-as-needed \
        --force \
        "${WORK_DIR}/parcels_normalized.geojson"

      echo "✅ Successfully generated: ${OUTPUT_DIR}/houston_parcels.pmtiles"
    fi
  fi
fi

echo ""
echo "======================================================================"
echo "Pipeline complete! Dataset files in ${OUTPUT_DIR}:"
ls -lh "${OUTPUT_DIR}"
echo "======================================================================"
