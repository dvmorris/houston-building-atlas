# Preservation Houston Building Atlas (V2)

An interactive, high-performance digital atlas exploring the architectural heritage and urban growth of Houston and Harris County from 1836 to the present day.

Built for **Preservation Houston**, this web application visualizes City of Houston Protected Landmarks, historic district boundaries, contributing vs. non-contributing structural integrity, and approximately 2 million Harris County parcel footprints with instant 60 FPS client-side GPU year filtering.

---

## Key Features

- **Dynamic GPU Year-Built Filtering (60 FPS):** Real-time WebGL shader expressions style building footprints across 9 historical era color intervals (YlOrRd palette) without network round-trips or server latency.
- **Interactive Timelapse Growth Engine:** Scrubber bar spanning 1836 to 2026 with play/pause animation, variable playback speeds (1x, 2x, 5x), continuous looping, live visible structure counter, and one-click historic era shortcuts (*Republic of Texas*, *Victorian & Railroad Boom*, *Oil Boom & Art Deco*, *Mid-Century & Post-War*, and *Modern*).
- **Contributing vs. Non-Contributing Status Badges:** Highlights designated historic districts (Heights, Old Sixth Ward, Boulevard Oaks, Glenbrook Valley, etc.) and categorizes structures according to City of Houston historic inventories:
  - 🟢 **Contributing Structure:** Historic fabric, scale, and architectural integrity intact.
  - 🟡 **Non-Contributing Structure:** Modern replacement, infill, or substantially altered.
  - 🟣 **Protected Landmark (PLM) / Landmark (LM):** Individual city and national monuments with custom pins.
- **Split-Screen Historic Map Comparison Swipe:** Draggable vertical split-screen slider that compares modern vector parcel data side-by-side with georeferenced historical surveys, including the 1915 USGS Houston Topographic survey and Sanborn Fire Insurance maps.
- **Smart Omnibox Search & Geolocation:**
  - Fast autocomplete for designated landmarks (e.g. *Julia Ideson Building*, *Esperson Building*, *Heights Theater*, *Sam Houston Park*).
  - 13-digit HCAD account number parser.
  - Street address geocoding.
  - GPS "Locate Me" walking tour mode with accuracy tracking and notification toasts.
- **Printable Single-Page Building Dossier Export:** Generates an archival 8.5" x 11" PDF building record formatted with Preservation Houston branding, property stats, architectural era, contributing designation, camera-scannable QR code deep-link, and research notes.
- **URL Deep-Linking & State Synchronization:** Complete URL hash synchronization (`/#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0`) supporting bookmarking, sharing, and browser back/forward history navigation (`popstate` / `hashchange`).

---

## Architecture & Technology Stack

The Atlas is engineered with a **zero-recurring-cost, 100% static/serverless client-side architecture**. It eliminates the need for expensive spatial database hosting or proprietary GIS servers.

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
   │  - `historic_districts.geojson` (<1MB)                 │
   │  - `landmarks.geojson` (<2MB)                          │
   └─────────────────────────┬──────────────────────────────┘
                             │ HTTP Byte-Range Requests
                             ▼
   ┌────────────────────────────────────────────────────────┐
   │       MapLibre GL JS + React/Vite Client (Browser)     │
   │  - WebGL/WebGPU dynamic rendering                      │
   │  - Instant GPU year-filtering & timelapse scrubber     │
   │  - Split-screen historic map swipe                     │
   │  - Search autocomplete & dossier export                │
   └────────────────────────────────────────────────────────┘
```

### Core Technologies
- **Frontend Framework:** React 19 + TypeScript + Vite
- **Cartography Engine:** MapLibre GL JS v4+
- **Tile Archive Protocol:** PMTiles v3 (Protomaps client for HTTP byte-range reading of single-file tile pyramids)
- **Styling & UI:** Tailwind CSS v3 + Lucide Icons
- **Data Pipeline:** Python 3 (DuckDB / GeoPandas / Tippecanoe)
- **Testing:** Vitest + React Testing Library + Python unittest

### Vector Tile Attribute Schema

| Field Name | Type | Description |
|---|---|---|
| `id` | String | 13-digit HCAD account number (e.g., `"0010020000001"`) |
| `yr` | Integer | Year built (`date_erect`). `0` represents vacant land or unknown |
| `addr` | String | Standardized street address (e.g., `"1200 TEXAS AVE"`) |
| `owner` | String | Primary owner name from tax roll |
| `use` | String | Land use code (`RES`, `COM`, `IND`, `VAC`) |
| `dist` | String | Historic district name if within boundary (e.g., `"Heights South"`) |
| `contrib` | Integer | `1` = Contributing, `0` = Non-Contributing, `-1` = Outside District |
| `st` | Float | Number of stories |

---

## Local Development Setup

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- Python 3.10+
- (Optional for full tile generation) `tippecanoe` (`brew install tippecanoe` on macOS)

### 1. Install Dependencies
```bash
# Install frontend packages
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Automated Tests
```bash
# Run Vitest test suite once
npm test -- --run

# Run Vitest in interactive watch mode
npm test

# Run Python data pipeline unit tests
python3 -m unittest pipeline/tests/test_pipeline.py
```

### 4. Build for Production
```bash
npm run build
```
The optimized static production bundle will be generated in `dist/`.

To preview the production build locally:
```bash
npm run preview
```

---

## Python ETL Pipeline Guide (`pipeline/build_tiles.py`)

The pipeline transforms raw HCAD tax records and City of Houston preservation inventories into clean GeoJSON layers and compiles PMTiles vector archives.

### Running Sample Generation
To generate or refresh the authentic Houston sample datasets in `public/data/`:
```bash
python3 pipeline/build_tiles.py --generate-samples
```
This produces:
- `public/data/parcels_sample.geojson`: Sample parcel footprints with authentic HCAD attributes
- `public/data/historic_districts.geojson`: Curated Houston historic district polygons
- `public/data/landmarks.geojson`: City Protected Landmarks and NRHP historic sites

### Processing New Annual HCAD Tax Rolls

When HCAD publishes annual updates (typically in April/May):

1. **Download Raw Data:**
   - Download GIS shapefiles from `https://hcad.org/pdata/pdata-gis-downloads.html` (`Parcels.shp`)
   - Download tax rolls (`building_res.txt` and `building_other.txt`)
   - Download City of Houston historic district boundaries and landmark points from the City of Houston GIS Open Data portal.

2. **Execute Spatial Join:**
   ```bash
   python3 pipeline/build_tiles.py \
     --spatial-join \
     --parcels raw_parcels.geojson \
     --districts public/data/historic_districts.geojson \
     --output parcels_joined.geojson
   ```

3. **Compile PMTiles with Tippecanoe:**
   ```bash
   python3 pipeline/build_tiles.py \
     --tippecanoe \
     --parcels parcels_joined.geojson \
     --output houston_parcels.pmtiles
   ```
   Or invoke Tippecanoe directly:
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
     --force \
     parcels_joined.geojson
   ```

4. **Upload PMTiles:**
   Upload `houston_parcels.pmtiles` to your static object storage bucket (e.g. Cloudflare R2 or Google Cloud Storage).

---

## Deployment Guide

Because the application is 100% static, it can be hosted for free or near-zero cost on any modern static hosting provider.

### Option 1: Cloudflare Pages & Cloudflare R2 (Recommended)

Cloudflare R2 provides zero egress bandwidth charges, making it the ideal host for the `.pmtiles` archive.

1. **Deploy Frontend to Cloudflare Pages:**
   - Connect your GitHub repository to Cloudflare Pages.
   - Build Command: `npm run build`
   - Build Output Directory: `dist`
   - Node version: `20`

2. **Upload PMTiles to Cloudflare R2:**
   - Create an R2 bucket (e.g., `preservation-houston-tiles`).
   - Upload `houston_parcels.pmtiles`.
   - In bucket settings, enable **Public Access** or connect a custom domain (e.g., `tiles.preservationhouston.org`).
   - Configure **CORS Policy** to permit HTTP Range requests:
     ```json
     [
       {
         "AllowedOrigins": ["https://atlas.preservationhouston.org", "http://localhost:5173"],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["Range"],
         "ExposeHeaders": ["Content-Range", "Content-Length", "Accept-Ranges"],
         "MaxAgeSeconds": 86400
       }
     ]
     ```

### Option 2: GitHub Pages

1. In `vite.config.ts`, set `base: "/preservation-houston-atlas/"` if deploying to a project repository.
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy `dist/` using the GitHub Actions Pages workflow (`actions/deploy-pages@v4`).

### Option 3: Google Cloud Storage (GCS) / Firebase Hosting

1. **Deploy Frontend:**
   ```bash
   npx -y firebase-tools@latest deploy --only hosting
   ```
2. **Host PMTiles on Google Cloud Storage:**
   - Create a public bucket: `gsutil mb -c standard -l us-central1 gs://houston-atlas-tiles/`
   - Set public read permissions:
     ```bash
     gsutil iam ch allUsers:objectViewer gs://houston-atlas-tiles
     ```
   - Set CORS configuration (`cors.json`):
     ```json
     [
       {
         "origin": ["*"],
         "method": ["GET", "HEAD"],
         "responseHeader": ["Content-Range", "Content-Length", "Accept-Ranges"],
         "maxAgeSeconds": 3600
       }
     ]
     ```
     Apply CORS:
     ```bash
     gsutil cors set cors.json gs://houston-atlas-tiles
     ```

---

## URL Deep-Link Reference

The Atlas encodes state into the URL hash fragment to enable instantaneous sharing and bookmarking:

```
https://atlas.preservationhouston.org/#<zoom>/<lat>/<lng>?yr_min=<year>&yr_max=<year>&parcel=<hcad_id>&swipe=<0|1>
```

### Examples
- **Downtown Houston Victorian Era (1880–1914):**
  `/#15.5/29.7580/-95.3620?yr_min=1880&yr_max=1914&swipe=0`
- **Heights Historic District with Split-Screen 1915 Map Swipe:**
  `/#16/29.7950/-95.3980?yr_min=1836&yr_max=1930&swipe=1`
- **Specific Historic Parcel Selected:**
  `/#17/29.7612/-95.3698?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0`

---

## License & Data Credits

- **Application Code:** MIT License. Developed for Preservation Houston.
- **Cartographic Data:**
  - Parcel boundaries and property attributes &copy; Harris County Appraisal District (HCAD).
  - Landmark points and historic district boundaries &copy; City of Houston Planning & Development Department.
  - Basemap tiles &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, &copy; [CARTO](https://carto.com/attributions).
  - Historical Topographic surveys &copy; United States Geological Survey (USGS).
