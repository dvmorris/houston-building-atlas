# Preservation Houston Building Atlas (V2) Design Specification

**Date:** 2026-09-03  
**Status:** Approved by User  
**Target Repository / Workspace:** `/Users/davemorris/.gemini/antigravity/scratch/preservation-houston-atlas`

---

## 1. Executive Summary & Goals

The **Preservation Houston Building Atlas** is an interactive, public-facing digital map that reveals the architectural history and urban evolution of Houston and Harris County.

The original prototype relied on Google Earth Engine (GEE). While GEE solved initial hosting of large shapefile layers, its interface was limited, mobile-unfriendly, restricted to server-side table rendering, and dependent on Google-managed sandboxes. Commercial alternatives like ArcGIS Online / Enterprise present steep recurring licensing costs.

**V2 Reimagines the Atlas as a modern, high-performance, open-source web application:**
- **Zero Server Costs:** 100% static/serverless architecture using **PMTiles** hosted on free-tier object storage (Cloudflare R2, Google Cloud Storage, or GitHub Pages) with zero backend servers or databases.
- **60 FPS Client-Side GPU Performance:** Powered by **MapLibre GL JS**, enabling instant year-built filtering and silky smooth timelapse growth animations across ~2 million Harris County parcel polygons.
- **Preservation Depth:** Visualizes City of Houston Protected Landmarks (PLM), Historic Districts, and crucially distinguishes **Contributing vs. Non-Contributing** structures based on official City inventories.
- **Historic Map Swipe / Split-Screen:** Allows users to slide between today's modern parcel grid and georeferenced historical surveys (such as 1915 USGS historical maps and Sanborn Fire Insurance maps).
- **Public Engagement & Storytelling:** Smart address/landmark search, "Locate Me" walking tour GPS, shareable deep-linked URLs, and a printable one-page **"Historic Building Dossier"** for homeowners and researchers.

---

## 2. Architecture & Data Flow

```
   [Public Data Sources]
   - HCAD GIS Tax Parcels (Shapefile/GeoDB)
   - City of Houston Landmarks (Open Data)
   - City of Houston Historic District Boundaries
   - CoH Contributing/Non-Contributing Properties (Excel)
                             │
                             ▼
   ┌────────────────────────────────────────────────────────┐
   │            Python / DuckDB ETL Pipeline                │
   │  - Spatial join parcels with historic districts        │
   │  - Match parcel addresses with CoH Contributing status │
   │  - Standardize schema: id, yr, addr, owner, use, etc.  │
   │  - Generate GeoPackage / GeoJSON intermediates         │
   └─────────────────────────┬──────────────────────────────┘
                             │
                             ▼
   ┌────────────────────────────────────────────────────────┐
   │                 Tippecanoe Compiler                    │
   │  - Tile pyramid: z10 to z16                            │
   │  - Polygon simplification & feature dropping at z10-13 │
   │  - Full boundary fidelity at z14-z16+                  │
   │  - Output: single archive `houston_parcels.pmtiles`    │
   └─────────────────────────┬──────────────────────────────┘
                             │
                             ▼
   ┌────────────────────────────────────────────────────────┐
   │           Static Cloud Storage (R2 / GCS)              │
   │  - `houston_parcels.pmtiles` (~450MB)                  │
   │  - `houston_landmarks.geojson` (<2MB)                  │
   │  - `historic_districts.geojson` (<1MB)                 │
   │  - `landmark_search_index.json` (<200KB)               │
   └─────────────────────────┬──────────────────────────────┘
                             │ HTTP Range Requests
                             ▼
   ┌────────────────────────────────────────────────────────┐
   │       MapLibre GL JS + React/Vite Client (Browser)     │
   │  - WebGL/WebGPU dynamic rendering                      │
   │  - Instant GPU year-filtering & timelapse scrubber     │
   │  - Split-screen historic map swipe                     │
   │  - Search autocomplete & dossier export                │
   └────────────────────────────────────────────────────────┘
```

---

## 3. Data Pipeline Specification

### 3.1 Source Datasets
1. **Harris County Appraisal District (HCAD) GIS Downloads:**
   - Source: `https://hcad.org/pdata/pdata-gis-downloads.html`
   - Files: `Parcels.shp` (or Geopackage) + `building_res.txt` / `building_other.txt` (tax rolls containing `date_erect`, stories, land use).
2. **City of Houston Historic Preservation Datasets:**
   - **Landmarks & Protected Landmarks:** City of Houston GIS Open Data.
   - **Historic District Boundaries:** City of Houston Planning GIS layer.
   - **Contributing / Non-Contributing Inventory:** `Historic_Districts_Reference.xlsx` (address-level catalog of structures in designated historic districts).

### 3.2 Vector Tile Schema (`houston_parcels.pmtiles`)
To guarantee optimal tile file sizes (<50KB per typical 256x256 tile) and fast transmission over byte-range requests, parcel polygon attributes are normalized and compressed:

| Field Name | Type | Description |
|---|---|---|
| `id` | String | HCAD 13-digit account number (e.g., `"0010020000001"`) |
| `yr` | Integer | Year built (`date_erect`). 0 or null represents vacant land / unknown |
| `addr` | String | Standardized street address (e.g., `"1200 TEXAS AVE"`) |
| `owner` | String | Primary owner name from tax roll |
| `use` | String | Land use category (`"RES"`, `"COM"`, `"IND"`, `"VAC"`) |
| `dist` | String | Historic District Name if within a boundary (e.g., `"Heights South"`) |
| `contrib`| Integer | `1` = Contributing, `0` = Non-Contributing, `-1` = Outside District |
| `st` | Float | Number of stories (used for optional 3D extrusion) |

### 3.3 Tippecanoe Generation Parameters
The Python pipeline invokes `tippecanoe` with parameters engineered for parcel geometries:
```bash
tippecanoe \
  --output=houston_parcels.pmtiles \
  --minimum-zoom=10 \
  --maximum-zoom=16 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --simplification=10 \
  --detect-shared-borders \
  --coalesce-densest-as-needed \
  --layer=parcels \
  houston_parcels_processed.fgb
```

---

## 4. Frontend Application Architecture

### 4.1 Tech Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling & Design System:** Tailwind CSS + Lucide Icons (clean, modern, mobile-responsive design aligned with Preservation Houston branding)
- **Map Engine:** MapLibre GL JS v4+
- **Tile Protocol:** `pmtiles` v3 (handles client-side HTTP byte-range caching and decompression)
- **Map Swipe / Split Screen:** Native MapLibre dual-canvas clip container (`maplibre-gl-compare` pattern)
- **Export & Printing:** HTML-to-Canvas / Print CSS optimized for 8.5" x 11" PDF generation

### 4.2 Application Component Structure
```
src/
├── assets/
│   ├── logo-preservation-houston.svg
│   └── marker-landmark.svg
├── components/
│   ├── Header/
│   │   ├── Header.tsx              # Brand logo, title, about/feedback links
│   │   ├── SearchBar.tsx           # Omnibox: address geocoding + landmark autocomplete
│   │   └── LayerMenu.tsx           # Toggle landmarks, districts, 3D, historic swipe
│   ├── Map/
│   │   ├── MapView.tsx             # MapLibre GL JS instance, PMTiles source, shaders
│   │   ├── HistoricSwipe.tsx       # Draggable divider comparing modern vs. historic map
│   │   └── MapLegend.tsx           # Collapsible year-built color ramp & status badges
│   ├── Timeline/
│   │   ├── TimelineBar.tsx         # Bottom scrubber (1836 - 2026) with play/pause
│   │   ├── EraShortcuts.tsx        # Quick filter buttons (Victorian, Art Deco, Post-War)
│   │   └── LiveCounter.tsx         # Count of visible historic structures
│   ├── Drawer/
│   │   ├── PropertyDrawer.tsx      # Slide-out card (desktop right / mobile bottom)
│   │   ├── ContributingBadge.tsx   # Visual status: Contributing, Non-Contributing, LM
│   │   └── DossierModal.tsx        # Printable single-page dossier view
│   └── Shared/
│       ├── Button.tsx
│       └── Tooltip.tsx
├── hooks/
│   ├── useMapState.ts              # URL hash synchronization (?year=..., #zoom/lat/lng)
│   ├── useTimelinePlayer.ts        # Animation ticker (1x, 2x, 5x speed)
│   └── useGeolocator.ts            # "Locate Me" GPS walking tour tracker
├── data/
│   ├── eras.json                   # Historic Houston eras configuration
│   ├── historic_districts.json     # Curated district boundaries & descriptions
│   └── landmarks_sample.json       # Featured landmarks with historic photography
├── utils/
│   ├── colorScales.ts              # Preservation Houston YlOrRd color expressions
│   └── printDossier.ts             # PDF/Print formatting utility
├── App.tsx
└── main.tsx
```

---

## 5. Core Feature Specifications

### 5.1 Dynamic GPU Color Ramp & Real-Time Year Filter
Parcels are dynamically styled in WebGL using MapLibre expressions. The color palette mirrors the historic Preservation Houston ColorBrewer scheme:
- `yr == 0` or missing: Neutral light gray (`#e0e0e0`)
- `1836 - 1909`: Deep Brick Red / Mahogany (`#7f0000` to `#b30000`)
- `1910 - 1929`: Warm Amber / Terracotta (`#d7301f` to `#ef6548`)
- `1930 - 1949`: Golden Honey / Ochre (`#fc8d59` to `#fdbb84`)
- `1950 - 1969`: Soft Gold (`#fdd49e`)
- `1970 - 1989`: Cream Yellow (`#fee8c8`)
- `1990 - Present`: Muted Pale Yellow (`#fff7bc`)

**GPU Shader Expression (Instant 60fps Filtering):**
The year filter updates the MapLibre `fill-color` and `fill-opacity` properties directly on the GPU without making any network requests:
```json
[
  "case",
  ["all", [">=", ["get", "yr"], minYear], ["<=", ["get", "yr"], maxYear]],
  0.75,
  0.05
]
```

### 5.2 Timeline Timelapse Playback
- **Dual-Handle Scrubber:** Set lower and upper bounds (e.g., show only buildings from 1920 to 1930, or show all buildings built up to a given year).
- **Playhead Animation:** Tapping "Play" advances the current year smoothly. Users can adjust playback speed (`1x`: 1 yr / 150ms; `2x`: 1 yr / 75ms; `5x`: 1 yr / 30ms).
- **Historic Era Presets:**
  1. *Republic of Texas & Frontier (1836–1879)*
  2. *Victorian & Railroad Boom (1880–1914)*
  3. *Oil Boom & Art Deco (1915–1939)*
  4. *Mid-Century Modern & Post-War Growth (1945–1969)*
  5. *Modern Infill & Skyscraper Era (1970–Present)*

### 5.3 Historic District & Contributing Status Badges
When viewing designated Historic Districts (e.g., Houston Heights East/West/South, Old Sixth Ward, Boulevard Oaks, Glenbrook Valley, Norhill, Woodland Heights, Courtlandt Place, Westmoreland):
- District boundaries render with a distinct architectural outline.
- Parcels within districts display their official City designation:
  - 🟢 **Contributing Structure:** Historic architectural fabric is intact.
  - 🟡 **Non-Contributing Structure:** Modern infill, replacement, or severely altered.
  - 🏛️ **Protected Landmark (PLM) / Landmark (LM):** Individual city or national monument.

### 5.4 Historic Map Swipe (Split-Screen Mode)
- Clicking the "Compare Historic Map" tool splits the viewport with a vertical draggable handle.
- Left side: Modern vector parcel map with year styling.
- Right side: Georeferenced historical imagery / survey (1915 USGS Topographic Survey of Houston & Sanborn maps).
- Dragging the handle smoothly clips the layers using CSS clip-path or synchronized dual MapLibre viewports.

### 5.5 Smart Search & Geolocation
- **Omnibox Search:**
  - Standard street addresses via public geocoding (e.g. OpenStreetMap Nominatim / Texas Geographic Services).
  - Landmark instant autocomplete: Jumps directly to landmarks (e.g. *"Julia Ideson Building"*, *"Esperson Building"*, *"Sam Houston Park"*, *"1884 Houston Cotton Exchange"*).
  - HCAD Account number search (13 digits).
- **GPS "Locate Me":** Centers the user on their phone’s GPS location and tracks position, designed for walking tours in historic neighborhoods.

### 5.6 Shareable URLs & Printable "Historic Building Dossier"
- **URL Synchronization:** Map coordinates, active filters, and selected parcel IDs are mirrored in the URL hash (e.g., `/#16.5/29.7573/-95.3644?yr_min=1880&yr_max=1920&parcel=0010020000001`).
- **Dossier Export:** Clicking "Export Dossier" in the property drawer opens a print-ready, formatted single-page sheet containing:
  - Preservation Houston header & logo
  - Site address, HCAD account #, and owner name
  - Year built, estimated age, and architectural era
  - Historic District name and Contributing/Non-Contributing status
  - High-resolution map crop showing the building footprint and surrounding block
  - Curated research links (HCAD official portal, City of Houston historic preservation guidelines)
  - Space for research notes

---

## 6. Verification & Quality Assurance Plan

### 6.1 Automated Verification
- **ETL Tests:** Python unit tests verifying spatial join integrity, date parsing, column trimming, and GeoJSON validity.
- **Frontend Build & Linter:** `npm run build` and `tsc --noEmit` validation to ensure clean TypeScript compilation.
- **Component Tests:** Verification of timeline math, filter logic, and URL serialization.

### 6.2 Manual & Interactive Verification
- **Cartographic Smoothness:** Verify 60fps pan/zoom across high-density neighborhoods (Downtown, Heights, Montrose).
- **Cross-Device Testing:** Verify layout responsiveness on desktop displays (1920x1080) and mobile screens (iPhone/Android viewports).
- **Print / PDF Validation:** Verify the dossier exports correctly on standard letter paper without cutoff.

---

## 7. Deployment & Hosting Strategy
- **Frontend App:** Built with `vite build` into static HTML/JS/CSS assets deployed to GitHub Pages or Cloudflare Pages.
- **PMTiles Tile Archive:** Uploaded to Cloudflare R2 bucket (configured with public CORS and HTTP Range-Requests support) or a public Google Cloud Storage bucket.
- **Annual Maintenance:** A single GitHub Actions workflow can be triggered annually upon release of new HCAD tax rolls to re-run the Python ETL and push updated tiles.
