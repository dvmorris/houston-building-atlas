import type { RasterSourceSpecification } from "maplibre-gl";

export interface HistoricMapLayer {
  id: string;
  name: string;
  shortName: string;
  year: number;
  description: string;
  tiles: string[];
  tileSize: number;
  minzoom: number;
  maxzoom: number;
  bounds: [number, number, number, number]; // [west, south, east, north]
  attribution: string;
  defaultOpacity?: number;
}

/**
 * Authoritative georeferenced historic map layers for Houston comparative analysis.
 * Sourced directly from the USGS Historical Topographic Map Collection (HTMC)
 * via the USGS Historical Topographic Maps ImageServer.
 */
export const HISTORIC_LAYERS: HistoricMapLayer[] = [
  {
    id: "usgs-1915",
    name: "1915 USGS Topographic Survey of Houston",
    shortName: "1915 Historical Survey",
    year: 1915,
    description:
      "Authentic 1915 USGS 15-minute topographic survey of Houston (1:24,000) documenting pre-freeway municipal wards, early Southern Pacific rail lines, and Buffalo Bayou before modern highway alterations.",
    tiles: [
      "https://historical1.arcgis.com/arcgis/rest/services/USGS_Historical_Topographic_Maps/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&size=256,256&imageSR=3857&format=jpgpng&f=image&mosaicRule=%7B%22mosaicMethod%22%3A%22esriMosaicAttribute%22%2C%22sortField%22%3A%22Year%22%2C%22sortValue%22%3A%221915%22%2C%22where%22%3A%22Year%3C%3D1920%22%7D",
    ],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 18,
    bounds: [-95.65, 29.55, -95.1, 29.98],
    attribution:
      '&copy; <a href="https://www.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> Historical Topographic Quadrangle Collection (1915 Houston Heights 1:24,000)',
    defaultOpacity: 0.9,
  },
  {
    id: "usgs-1922",
    name: "1922 USGS Topographic Survey of Houston",
    shortName: "1922 Historical Survey",
    year: 1922,
    description:
      "1922 USGS 1:31,680 topographic survey capturing Houston's rapid industrial and residential expansion following the opening of the Houston Ship Channel.",
    tiles: [
      "https://historical1.arcgis.com/arcgis/rest/services/USGS_Historical_Topographic_Maps/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&size=256,256&imageSR=3857&format=jpgpng&f=image&mosaicRule=%7B%22mosaicMethod%22%3A%22esriMosaicAttribute%22%2C%22sortField%22%3A%22Year%22%2C%22sortValue%22%3A%221922%22%2C%22where%22%3A%22Year%3C%3D1925%22%7D",
    ],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 18,
    bounds: [-95.65, 29.55, -95.1, 29.98],
    attribution:
      '&copy; <a href="https://www.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> Historical Topographic Quadrangle Collection (1922 Houston Heights 1:31,680)',
    defaultOpacity: 0.9,
  },
  {
    id: "usgs-1950",
    name: "1950 Post-War USGS Survey of Houston",
    shortName: "1950 Post-War Survey",
    year: 1950,
    description:
      "Post-WWII 1950 USGS topographic survey documenting mid-century suburban expansion and early Houston freeway network planning.",
    tiles: [
      "https://historical1.arcgis.com/arcgis/rest/services/USGS_Historical_Topographic_Maps/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&size=256,256&imageSR=3857&format=jpgpng&f=image&mosaicRule=%7B%22mosaicMethod%22%3A%22esriMosaicAttribute%22%2C%22sortField%22%3A%22Year%22%2C%22sortValue%22%3A%221950%22%2C%22where%22%3A%22Year%3C%3D1955%22%7D",
    ],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 18,
    bounds: [-95.65, 29.55, -95.1, 29.98],
    attribution:
      '&copy; <a href="https://www.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> Historical Topographic Quadrangle Collection (1950 Houston 1:250,000)',
    defaultOpacity: 0.9,
  },
];

export const DEFAULT_HISTORIC_LAYER_ID = "usgs-1915";

/**
 * Retrieve historic layer specification by ID with fallback to default 1915 USGS layer.
 * Also supports backward compatibility for legacy identifiers.
 */
export function getHistoricLayer(id?: string | null): HistoricMapLayer {
  if (id === "sanborn-1924" || id === "houston-1907") {
    return HISTORIC_LAYERS[1]; // Map legacy option to 1922 historical survey
  }
  const found = HISTORIC_LAYERS.find((l) => l.id === id);
  return found || HISTORIC_LAYERS[0];
}

/**
 * Creates MapLibre raster source specification from historic layer definition.
 */
export function createHistoricRasterSource(
  layer: HistoricMapLayer
): RasterSourceSpecification {
  return {
    type: "raster",
    tiles: layer.tiles,
    tileSize: layer.tileSize,
    attribution: layer.attribution,
    minzoom: layer.minzoom,
    maxzoom: layer.maxzoom,
    bounds: layer.bounds,
  };
}
