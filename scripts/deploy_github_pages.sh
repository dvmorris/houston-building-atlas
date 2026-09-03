#!/usr/bin/env bash
# ==============================================================================
# Deploy Preservation Houston Atlas to GitHub Pages
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "======================================================================"
echo "Deploying Preservation Houston Building Atlas to GitHub Pages"
echo "======================================================================"

# 1. Build application
echo "==> Step 1: Building production bundle..."
npm run build

# 2. Deploy dist directory to gh-pages branch
echo "==> Step 2: Publishing to gh-pages branch..."
if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required." >&2
  exit 1
fi

npx -y gh-pages -d dist -m "deploy: update Preservation Houston Atlas [skip ci]"

echo ""
echo "🎉 Deployment complete!"
echo "Check your GitHub repository Settings -> Pages to view your live URL."
