#!/usr/bin/env bash
# ==============================================================================
# Deploy Preservation Houston Atlas to Cloudflare Pages & Cloudflare R2
# ($0/month static hosting with zero egress fees for PMTiles)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "======================================================================"
echo "Deploying Preservation Houston Building Atlas to Cloudflare"
echo "======================================================================"

# 1. Build application
echo "==> Step 1: Building production bundle..."
npm run build

# 2. Check for wrangler
if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required to run Cloudflare Wrangler." >&2
  exit 1
fi

echo ""
echo "==> Step 2: Deploying static web app to Cloudflare Pages..."
# Project name: preservation-houston-atlas
PROJECT_NAME="preservation-houston-atlas"

echo "Deploying dist/ to Cloudflare Pages project '${PROJECT_NAME}'..."
npx wrangler pages deploy dist --project-name="${PROJECT_NAME}"

# 3. Optional R2 PMTiles Upload
PMTILES_FILE="${PROJECT_ROOT}/public/data/houston_parcels.pmtiles"
R2_BUCKET="preservation-houston-tiles"

if [ -f "${PMTILES_FILE}" ]; then
  echo ""
  echo "==> Step 3: Detected local PMTiles archive (${PMTILES_FILE})."
  echo "Would you like to upload it to Cloudflare R2 bucket '${R2_BUCKET}'? (y/n)"
  read -p "> " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Uploading houston_parcels.pmtiles to Cloudflare R2..."
    npx wrangler r2 object put "${R2_BUCKET}/houston_parcels.pmtiles" --file="${PMTILES_FILE}"
    echo "✅ PMTiles uploaded to R2!"
    echo "Ensure public access is enabled on '${R2_BUCKET}' with CORS enabled:"
    echo "    npx wrangler r2 bucket cors set ${R2_BUCKET} --file pipeline/cors.json"
  fi
fi

echo ""
echo "🎉 Deployment complete!"
echo "Visit your site in the Cloudflare Pages dashboard."
