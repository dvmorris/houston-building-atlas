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
 * Public georeferenced historic map layers for Houston comparative analysis.
 */
export const HISTORIC_LAYERS: HistoricMapLayer[] = [
  {
    id: "usgs-1915",
    name: "1915 USGS Topographic Survey of Houston",
    shortName: "1915 USGS Topo",
    year: 1915,
    description:
      "1915 USGS 15-minute topographic survey of Houston and Harris County showing early rail networks, Buffalo Bayou navigation channels, and original municipal ward layouts.",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    minzoom: 8,
    maxzoom: 18,
    bounds: [-95.65, 29.55, -95.1, 29.98],
    attribution:
      '&copy; <a href="https://www.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS</a> Historical Topographic Quadrangle Collection (1915 Houston 15\' Quad)',
    defaultOpacity: 0.9,
  },
  {
    id: "sanborn-1924",
    name: "1924 Sanborn Fire Insurance Map",
    shortName: "1924 Sanborn",
    year: 1924,
    description:
      "High-resolution fire insurance atlas sheets documenting structural footprints, exterior wall materials (brick, stone, frame), building heights, and fire walls across Downtown Houston and surrounding wards.",
    tiles: [
      "https://tiles.arcgis.com/tiles/historical-sanborn/arcgis/rest/services/Houston_1924_Sanborn/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    minzoom: 12,
    maxzoom: 20,
    bounds: [-95.42, 29.72, -95.32, 29.8],
    attribution:
      '&copy; <a href="https://www.loc.gov/collections/sanborn-maps/" target="_blank" rel="noopener noreferrer">Sanborn Map Company / Library of Congress</a> Geography &amp; Map Division',
    defaultOpacity: 0.85,
  },
  {
    id: "houston-1907",
    name: "1907 City of Houston Ward & Street Survey",
    shortName: "1907 Ward Survey",
    year: 1907,
    description:
      "Turn-of-the-century municipal survey of Houston's historic six wards, streetcar lines, bayou crossings, and early neighborhood subdivisions.",
    tiles: [
      "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    minzoom: 9,
    maxzoom: 18,
    bounds: [-95.5, 29.65, -95.25, 29.85],
    attribution:
      '&copy; <a href="https://www.glo.texas.gov/" target="_blank" rel="noopener noreferrer">Texas General Land Office</a> / City of Houston Archives',
    defaultOpacity: 0.85,
  },
];

export const DEFAULT_HISTORIC_LAYER_ID = "usgs-1915";

/**
 * Retrieve historic layer specification by ID with fallback to default 1915 USGS layer.
 */
export function getHistoricLayer(id?: string | null): HistoricMapLayer {
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
