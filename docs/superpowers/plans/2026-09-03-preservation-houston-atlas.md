# Preservation Houston Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, serverless, open-source web application for the Preservation Houston Building Atlas powered by MapLibre GL JS and PMTiles, featuring interactive timelapse growth animation, contributing status badges, historic map swipe, address/landmark search, and printable building dossiers.

**Architecture:** A static React 19 + TypeScript + Vite SPA rendering vector tiles from `.pmtiles` archives over HTTP byte-range requests. GPU-driven MapLibre expressions power instant 60fps dynamic year-built filtering and timelapse animations. The data pipeline transforms HCAD and City of Houston preservation datasets into compact vector tile pyramids and GeoJSON overlays.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, MapLibre GL JS v4, PMTiles v3, Lucide Icons, Vitest, Python (DuckDB / GeoPandas / Tippecanoe).

**Spec:** `docs/superpowers/specs/2026-09-03-preservation-houston-atlas-design.md`

## Global Constraints
- Zero recurring server or database hosting costs (100% static/serverless client-side architecture).
- MapLibre GL JS v4+ for all cartography, Mapbox GL JS expressions compatibility.
- Vector tile attribute schema: `id` (HCAD account), `yr` (year built), `addr` (address), `owner` (owner name), `use` (land use), `dist` (historic district), `contrib` (1/0/-1), `st` (stories).
- Strict mobile responsiveness (collapsible desktop panels -> swipable bottom drawers).
- Automated tests for data pipeline and frontend components using Vitest and Python unittest/pytest.

---

### Task 1: Project Scaffolding, Dependencies & Testing Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: None (root setup)
- Produces: Working React + Vite + TypeScript + Tailwind + Vitest build system and test harness.

- [ ] **Step 1: Create package.json with dependencies**
Create `package.json` including `react`, `react-dom`, `maplibre-gl`, `pmtiles`, `lucide-react`, `clsx`, `tailwind-merge`, and dev dependencies (`vite`, `vitest`, `@testing-library/react`, `jsdom`, `tailwindcss`, `postcss`, `autoprefixer`, `typescript`).

- [ ] **Step 2: Install dependencies**
Run: `npm install`
Expected: Clean package installation with zero vulnerabilities.

- [ ] **Step 3: Create Tailwind, Vite and TypeScript configs**
Configure `vite.config.ts` (with test config using jsdom), `tsconfig.json`, `tailwind.config.js`, and `postcss.config.js`.

- [ ] **Step 4: Create base App and styles**
Create `src/index.css` with `@tailwind base; @tailwind components; @tailwind utilities;`, `src/App.tsx` with a basic container, and `src/main.tsx`.

- [ ] **Step 5: Write initial smoke test in src/App.test.tsx**
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders Preservation Houston Atlas title", () => {
    render(<App />);
    expect(screen.getByText(/Preservation Houston/i)).toBeDefined();
  });
});
```

- [ ] **Step 6: Run tests and verify**
Run: `npm test`
Expected: PASS 1 test

- [ ] **Step 7: Commit scaffolding**
```bash
git add .
git commit -m "chore: scaffold React 19, Vite, Tailwind, and Vitest project"
```

---

### Task 2: Data Pipeline, GeoJSON Layers & Sample Datasets

**Files:**
- Create: `pipeline/build_tiles.py`
- Create: `pipeline/sample_data/parcels_sample.geojson`
- Create: `pipeline/sample_data/historic_districts.geojson`
- Create: `pipeline/sample_data/landmarks.geojson`
- Create: `pipeline/tests/test_pipeline.py`
- Create: `public/data/historic_districts.geojson`
- Create: `public/data/landmarks.geojson`
- Create: `public/data/parcels_sample.geojson`

**Interfaces:**
- Consumes: Raw HCAD & CoH attribute format
- Produces: Normalized vector attributes (`id`, `yr`, `addr`, `owner`, `use`, `dist`, `contrib`, `st`) and GeoJSON data feeds in `public/data/`.

- [ ] **Step 1: Write test for pipeline normalization in pipeline/tests/test_pipeline.py**
```python
import unittest
from pipeline.build_tiles import normalize_parcel_attributes

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

if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**
Run: `python3 -m unittest pipeline/tests/test_pipeline.py`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement pipeline/build_tiles.py and generate sample datasets**
Implement `normalize_parcel_attributes`, spatial join helper, and export scripts. Populate rich sample datasets for Houston historic districts (Heights South, Old Sixth Ward, Downtown Historic District, Boulevard Oaks) and landmark points (Julia Ideson Building, Esperson Building, Heights Theater, Sam Houston Park, 1884 Houston Cotton Exchange) with authentic historic metadata.

- [ ] **Step 4: Run pipeline tests to verify they pass**
Run: `python3 -m unittest pipeline/tests/test_pipeline.py`
Expected: PASS

- [ ] **Step 5: Copy sample GeoJSON datasets to public/data/**
Ensure `public/data/historic_districts.geojson`, `public/data/landmarks.geojson`, and `public/data/parcels_sample.geojson` exist and are valid JSON.

- [ ] **Step 6: Commit data pipeline and sample datasets**
```bash
git add pipeline/ public/data/
git commit -m "feat: add data transformation pipeline and sample historic GIS datasets"
```

---

### Task 3: Cartographic Engine & Dynamic GPU Shaders

**Files:**
- Create: `src/utils/colorScales.ts`
- Create: `src/utils/colorScales.test.ts`
- Create: `src/components/Map/MapView.tsx`
- Create: `src/components/Map/MapView.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `public/data/*.geojson` and PMTiles protocol
- Produces: `MapView` component rendering styled parcel polygons, district outlines, and landmark icons, with dynamic GPU shader filtering by year.

- [ ] **Step 1: Write unit tests for colorScales.ts**
```ts
import { describe, it, expect } from "vitest";
import { getEraColor, getMapLibreColorExpression, getMapLibreYearFilterExpression } from "./colorScales";

describe("colorScales", () => {
  it("returns correct era color for 1895", () => {
    expect(getEraColor(1895)).toBe("#7f0000");
  });
  it("returns correct era color for 1925", () => {
    expect(getEraColor(1925)).toBe("#d7301f");
  });
  it("generates valid MapLibre step expression", () => {
    const expr = getMapLibreColorExpression();
    expect(expr[0]).toBe("step");
    expect(expr[1]).toEqual(["get", "yr"]);
  });
});
```

- [ ] **Step 2: Implement src/utils/colorScales.ts**
Implement the 9-interval Preservation Houston YlOrRd color ramp, era category mapping, and MapLibre paint expressions for fill-color and dynamic year-filtering opacity.

- [ ] **Step 3: Run colorScales tests and verify pass**
Run: `npm test src/utils/colorScales.test.ts`
Expected: PASS

- [ ] **Step 4: Create src/components/Map/MapView.tsx**
Create the MapLibre GL JS wrapper component:
- Registers PMTiles protocol client.
- Loads CARTO Positron vector/raster basemap.
- Adds `parcels` fill layer with GPU color ramp and dynamic year filter expression.
- Adds `historic_districts` outline and fill layers.
- Adds `landmarks` circle/symbol markers with custom pins (LM vs PLM).
- Handles hover effects and click events, emitting `onSelectParcel(parcel)` and `onSelectLandmark(landmark)`.

- [ ] **Step 5: Write unit/mock test for MapView**
Verify `MapView` mounts cleanly and registers map event listeners.

- [ ] **Step 6: Commit cartographic engine**
```bash
git add src/utils/colorScales* src/components/Map/
git commit -m "feat: implement MapLibre cartography engine and dynamic GPU year-filtering"
```

---

### Task 4: Interactive Timeline & Timelapse Growth Scrubber

**Files:**
- Create: `src/hooks/useTimelinePlayer.ts`
- Create: `src/hooks/useTimelinePlayer.test.ts`
- Create: `src/components/Timeline/TimelineBar.tsx`
- Create: `src/components/Timeline/EraShortcuts.tsx`
- Create: `src/components/Timeline/TimelineBar.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Current year bounds (`yearMin`, `yearMax`) and updates them.
- Produces: Bottom scrubber bar with play/pause, speed controls (1x, 2x, 5x), era buttons, and visible count ticker.

- [ ] **Step 1: Write unit tests for useTimelinePlayer hook**
Test animation tick progression, play/pause toggling, and loop or bounds stopping at 2026.

- [ ] **Step 2: Implement useTimelinePlayer hook**
Implement timer ticker using `requestAnimationFrame` or `setInterval` supporting variable speeds (1x: 1yr/150ms, 2x: 1yr/75ms, 5x: 1yr/30ms).

- [ ] **Step 3: Implement EraShortcuts and TimelineBar components**
Create UI with:
- Dual-thumb range slider (1836 to 2026).
- Play/Pause button with animated icon.
- Speed selector pill toggle.
- 5 era shortcut buttons (Republic 1836-1879, Victorian 1880-1914, 1920s Boom 1915-1939, Post-War 1945-1969, Modern 1970-2026).
- Visible structure counter pill.

- [ ] **Step 4: Run timeline tests and verify pass**
Run: `npm test src/components/Timeline/`
Expected: PASS

- [ ] **Step 5: Commit timeline and timelapse scrubber**
```bash
git add src/hooks/useTimelinePlayer* src/components/Timeline/
git commit -m "feat: add interactive timeline scrubber, timelapse player, and era shortcuts"
```

---

### Task 5: Historic District & Contributing Status Badges & Property Drawer

**Files:**
- Create: `src/components/Drawer/ContributingBadge.tsx`
- Create: `src/components/Drawer/PropertyDrawer.tsx`
- Create: `src/components/Drawer/PropertyDrawer.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Selected parcel or landmark object.
- Produces: Responsive slide-out card (desktop right panel / mobile bottom sheet) displaying contributing status, HCAD link, share link, and dossier trigger.

- [ ] **Step 1: Implement ContributingBadge component**
Displays colored visual pill:
- Green: "Contributing Structure" (with tooltip explaining historical architectural integrity)
- Amber: "Non-Contributing Structure" (altered or modern infill)
- Purple/Blue: "City Protected Landmark" / "Landmark"
- Gray: "Outside Historic District"

- [ ] **Step 2: Implement PropertyDrawer component**
Displays:
- Site Address as prominent header
- Year built and calculated age ("Built 1914 • 112 years old")
- Architectural era badge
- Contributing status badge with district name
- Owner name & HCAD Account Number
- Stories & land use
- "View Official HCAD Record" outbound link
- "Share Property" button (copies deep-link URL to clipboard)
- "Export Building Dossier" button (triggers Task 8)
- "Report History / Update" feedback button

- [ ] **Step 3: Write tests for PropertyDrawer in PropertyDrawer.test.tsx**
Verify correct rendering of contributing vs non-contributing badges and HCAD account link formatting.

- [ ] **Step 4: Run tests and verify pass**
Run: `npm test src/components/Drawer/`
Expected: PASS

- [ ] **Step 5: Commit PropertyDrawer and ContributingBadge**
```bash
git add src/components/Drawer/
git commit -m "feat: add property detail drawer and contributing status badges"
```

---

### Task 6: Historic Map Swipe / Split-Screen Comparison

**Files:**
- Create: `src/components/Map/HistoricSwipe.tsx`
- Create: `src/components/Map/HistoricSwipe.test.tsx`
- Create: `src/utils/historicLayers.ts`
- Modify: `src/components/Map/MapView.tsx`

**Interfaces:**
- Consumes: Map instance and comparison layer configuration (USGS 1915 Historical Topo & Sanborn tiles).
- Produces: Draggable vertical split-screen comparison slider allowing side-by-side exploration of historic Houston cartography vs. modern parcel vector data.

- [ ] **Step 1: Implement src/utils/historicLayers.ts**
Configure public georeferenced historic map layers:
- 1915 USGS Houston Historical Survey Topographic map tiles
- Historic Sanborn Fire Insurance tile overlays
- Attribution, bounds, and maxzoom configs.

- [ ] **Step 2: Implement HistoricSwipe component**
Create the draggable comparison divider:
- Syncs dual MapLibre camera viewports (or applies dynamic CSS clip-path rectangle to the historic raster layer).
- Touch and mouse drag handler to move divider between 0% and 100% viewport width.
- Toggle button to activate / deactivate comparison mode.

- [ ] **Step 3: Write test for HistoricSwipe**
Verify divider position responds to drag events and toggle switches layers on/off.

- [ ] **Step 4: Run tests and verify pass**
Run: `npm test src/components/Map/HistoricSwipe.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit historic map swipe**
```bash
git add src/utils/historicLayers.ts src/components/Map/HistoricSwipe*
git commit -m "feat: add split-screen historic map swipe comparison"
```

---

### Task 7: Smart Search, Geolocation & Header

**Files:**
- Create: `src/components/Header/SearchBar.tsx`
- Create: `src/components/Header/Header.tsx`
- Create: `src/hooks/useGeolocator.ts`
- Create: `src/components/Header/Header.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Landmark catalog, parcel coordinates, and geocoding endpoint.
- Produces: Omnibox search with autocomplete (Address, Landmark Name, HCAD ID), GPS "Locate Me" walking tour mode, and header navigation.

- [ ] **Step 1: Implement useGeolocator hook**
Wraps browser `navigator.geolocation` with loading, error states, and accuracy tracking.

- [ ] **Step 2: Implement SearchBar component**
Features:
- Instant match against designated landmarks (e.g. "Julia Ideson", "Esperson", "Sam Houston Park", "Heights Theater").
- Address search with debounced geocoding query.
- 13-digit HCAD Account Number parser.
- Selecting an item flies the MapLibre camera to coordinates with highlight pulse.

- [ ] **Step 3: Implement Header component**
Header bar featuring:
- Preservation Houston logo and title
- SearchBar omnibox
- "Compare Historic Map" quick toggle
- "Locate Me" GPS button
- Links to "About the Atlas", "Historic Districts Guide", and "Submit Feedback"

- [ ] **Step 4: Write tests for Header and SearchBar**
Verify search autocomplete dropdown behavior and GPS locate trigger.

- [ ] **Step 5: Run tests and verify pass**
Run: `npm test src/components/Header/`
Expected: PASS

- [ ] **Step 6: Commit Header, Search, and Geolocation**
```bash
git add src/components/Header/ src/hooks/useGeolocator.ts
git commit -m "feat: add header, smart search omnibox, and GPS walking tour locator"
```

---

### Task 8: Printable "Historic Building Dossier" Export

**Files:**
- Create: `src/utils/printDossier.ts`
- Create: `src/components/Drawer/DossierModal.tsx`
- Create: `src/components/Drawer/DossierModal.test.tsx`
- Modify: `src/components/Drawer/PropertyDrawer.tsx`

**Interfaces:**
- Consumes: Selected property metadata and map screenshot thumbnail.
- Produces: High-resolution, print-optimized single-page (8.5" x 11") PDF dossier sheet branded with Preservation Houston.

- [ ] **Step 1: Implement src/utils/printDossier.ts**
Generates print-ready HTML / CSS media `@media print` rules:
- Clean 1-page layout with Preservation Houston letterhead
- Architectural era badge and estimated age
- Contributing vs Non-Contributing status with district explanation
- Property footprint mini-map
- HCAD official account data and verification links
- Research notes section for homeowners and architects.

- [ ] **Step 2: Implement DossierModal component**
Provides on-screen modal preview with "Print / Save as PDF" button and "Close" button.

- [ ] **Step 3: Write tests for DossierModal**
Verify metadata fields render correctly in the printable template.

- [ ] **Step 4: Run tests and verify pass**
Run: `npm test src/components/Drawer/DossierModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit printable building dossier export**
```bash
git add src/utils/printDossier.ts src/components/Drawer/DossierModal*
git commit -m "feat: add printable single-page historic building dossier export"
```

---

### Task 9: Full System Integration, URL Deep-Linking & Production Verification

**Files:**
- Create: `src/hooks/useMapState.ts`
- Modify: `src/App.tsx`
- Modify: `README.md`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: All UI components, MapView, Timeline, Header, Drawer, and Dossier.
- Produces: Integrated, fully functional application with URL hash synchronization, end-to-end passing tests, and production build.

- [ ] **Step 1: Implement useMapState hook**
Synchronizes map center, zoom, active year filter bounds, and selected parcel ID into the URL hash (e.g. `/#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001`).

- [ ] **Step 2: Wire all components into App.tsx**
Integrate `Header`, `MapView`, `HistoricSwipe`, `TimelineBar`, `PropertyDrawer`, and `DossierModal` with responsive state management.

- [ ] **Step 3: Run full automated test suite**
Run: `npm test -- --run`
Expected: All tests PASS

- [ ] **Step 4: Run production build and typecheck**
Run: `npm run build`
Expected: Clean build output in `dist/` with zero TypeScript or bundling errors.

- [ ] **Step 5: Document deployment and usage in README.md**
Write clear instructions for running locally (`npm run dev`), deploying static assets to Cloudflare Pages / GitHub Pages, and running the Python ETL pipeline on new HCAD tax rolls.

- [ ] **Step 6: Commit final integration**
```bash
git add .
git commit -m "feat: complete Preservation Houston Building Atlas V2 integration and documentation"
```
