#!/usr/bin/env bash
# ==============================================================================
# Deploy Preservation Houston Atlas to Google Cloud Storage (GCS)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BUCKET_NAME="${1:-preservation-houston-atlas}"

cd "${PROJECT_ROOT}"

echo "======================================================================"
echo "Deploying Preservation Houston Building Atlas to Google Cloud Storage"
echo "Target Bucket: gs://${BUCKET_NAME}"
echo "======================================================================"

# 1. Build application
echo "==> Step 1: Building production bundle..."
npm run build

# 2. Check gcloud / gsutil
if ! command -v gsutil >/dev/null 2>&1 && ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: Google Cloud SDK (gcloud / gsutil) is not installed." >&2
  echo "Install Google Cloud SDK from https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

STORAGE_CMD="gcloud storage"
if ! command -v gcloud >/dev/null 2>&1; then
  STORAGE_CMD="gsutil"
fi

echo "==> Step 2: Ensuring GCS bucket exists and is public..."
if [ "$STORAGE_CMD" = "gcloud storage" ]; then
  # Check if bucket exists, create if not
  gcloud storage buckets describe "gs://${BUCKET_NAME}" >/dev/null 2>&1 || {
    echo "Creating bucket gs://${BUCKET_NAME} in us-central1..."
    gcloud storage buckets create "gs://${BUCKET_NAME}" --location=us-central1
  }
  # Enable static web hosting
  gcloud storage buckets update "gs://${BUCKET_NAME}" --web-main-page-suffix=index.html --web-error-page=index.html
  # Set public read
  gcloud storage buckets add-iam-policy-binding "gs://${BUCKET_NAME}" --member=allUsers --role=roles/storage.objectViewer
  # Configure CORS for HTTP Range Requests
  echo "Setting CORS configuration for PMTiles byte-range requests..."
  gcloud storage buckets update "gs://${BUCKET_NAME}" --cors-file=pipeline/cors.json
  # Sync files
  echo "==> Step 3: Uploading build artifacts..."
  gcloud storage rsync -r dist/ "gs://${BUCKET_NAME}"
else
  gsutil mb -l us-central1 "gs://${BUCKET_NAME}" 2>/dev/null || true
  gsutil web set -m index.html -e index.html "gs://${BUCKET_NAME}"
  gsutil iam ch allUsers:objectViewer "gs://${BUCKET_NAME}"
  echo "Setting CORS configuration for PMTiles byte-range requests..."
  gsutil cors set pipeline/cors.json "gs://${BUCKET_NAME}"
  echo "==> Step 3: Uploading build artifacts..."
  gsutil -m rsync -r -d dist/ "gs://${BUCKET_NAME}"
fi

echo ""
echo "🎉 Deployment complete!"
echo "Your Atlas is live at:"
echo "    https://storage.googleapis.com/${BUCKET_NAME}/index.html"
echo "Or via custom domain / Cloud CDN if mapped."
