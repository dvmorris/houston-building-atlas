import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getMapLibreColorExpression,
  getMapLibreYearFilterExpression,
} from "../../utils/colorScales";

export interface ParcelProperties {
  id: string;
  yr: number;
  addr: string;
  owner: string;
  use: string;
  dist?: string | null;
  contrib: number; // 1 = Contributing, 0 = Non-Contributing, -1 = Outside
  st?: number;
}

export interface LandmarkProperties {
  id: string;
  name: string;
  addr: string;
  yr: number;
  architect?: string;
  style?: string;
  designation: "LM" | "PLM" | string;
  designation_full?: string;
  description?: string;
  image_url?: string;
  nrhp_date?: string;
}

export interface DistrictProperties {
  id: string;
  name: string;
  full_name: string;
  designated_year: number;
  description: string;
  arch_styles?: string[];
  total_structures?: number;
  contributing_count?: number;
  non_contributing_count?: number;
  ordinance_no?: string;
}

export interface MapViewProps {
  /**
   * Minimum year filter bound (default: 1836)
   */
  yearMin?: number;
  /**
   * Maximum year filter bound (default: 2026)
   */
  yearMax?: number;
  /**
   * Selected parcel ID for highlight boundary
   */
  selectedParcelId?: string | null;
  /**
   * Selected landmark ID for highlight halo
   */
  selectedLandmarkId?: string | null;
  /**
   * Callback fired when a parcel polygon is clicked
   */
  onSelectParcel?: (parcel: ParcelProperties | null) => void;
  /**
   * Callback fired when a landmark marker pin is clicked
   */
  onSelectLandmark?: (landmark: LandmarkProperties | null) => void;
  /**
   * Callback fired when a historic district boundary is clicked
   */
  onSelectDistrict?: (district: DistrictProperties | null) => void;
  /**
   * Optional custom URL for PMTiles vector tile archive
   */
  pmtilesUrl?: string;
  /**
   * Optional custom URL or GeoJSON for parcels (default: /data/parcels_sample.geojson)
   */
  parcelsGeojsonUrl?: string;
  /**
   * Optional custom URL or GeoJSON for historic districts (default: /data/historic_districts.geojson)
   */
  districtsGeojsonUrl?: string;
  /**
   * Optional custom URL or GeoJSON for landmarks (default: /data/landmarks.geojson)
   */
  landmarksGeojsonUrl?: string;
  /**
   * Initial center coordinates [lng, lat] (default: downtown Houston [-95.362, 29.759])
   */
  initialCenter?: [number, number];
  /**
   * Initial zoom level (default: 14.5)
   */
  initialZoom?: number;
  /**
   * Callback fired when the map instance is fully loaded and ready
   */
  onMapLoaded?: (map: maplibregl.Map) => void;
  /**
   * Optional custom CSS class name for outer container
   */
  className?: string;
}

export const DEFAULT_HOUSTON_CENTER: [number, number] = [-95.362, 29.759];
export const DEFAULT_HOUSTON_ZOOM = 14.5;

/**
 * CARTO Positron basemap style specification using high-speed raster tiles.
 * Provides a clean, neutral, light architectural backdrop that emphasizes historic color ramps.
 */
export const CARTO_POSITRON_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-positron": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-positron-basemap",
      type: "raster",
      source: "carto-positron",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

let pmtilesProtocolRegistered = false;

/**
 * Ensures the PMTiles protocol is registered with MapLibre GL JS exactly once.
 */
export function registerPMTilesProtocol(): void {
  if (pmtilesProtocolRegistered) return;
  try {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    pmtilesProtocolRegistered = true;
  } catch {
    // Protocol might already be added or unsupported in environment
  }
}

export const MapView: React.FC<MapViewProps> = ({
  yearMin = 1836,
  yearMax = 2026,
  selectedParcelId = null,
  selectedLandmarkId = null,
  onSelectParcel,
  onSelectLandmark,
  onSelectDistrict,
  pmtilesUrl,
  parcelsGeojsonUrl = "/data/parcels_sample.geojson",
  districtsGeojsonUrl = "/data/historic_districts.geojson",
  landmarksGeojsonUrl = "/data/landmarks.geojson",
  initialCenter = DEFAULT_HOUSTON_CENTER,
  initialZoom = DEFAULT_HOUSTON_ZOOM,
  onMapLoaded,
  className = "w-full h-full relative",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Keep references to latest callbacks to avoid tearing down map instance
  const onSelectParcelRef = useRef(onSelectParcel);
  onSelectParcelRef.current = onSelectParcel;

  const onSelectLandmarkRef = useRef(onSelectLandmark);
  onSelectLandmarkRef.current = onSelectLandmark;

  const onSelectDistrictRef = useRef(onSelectDistrict);
  onSelectDistrictRef.current = onSelectDistrict;

  const onMapLoadedRef = useRef(onMapLoaded);
  onMapLoadedRef.current = onMapLoaded;

  const yearMinRef = useRef(yearMin);
  yearMinRef.current = yearMin;

  const yearMaxRef = useRef(yearMax);
  yearMaxRef.current = yearMax;

  const selectedParcelIdRef = useRef(selectedParcelId);
  selectedParcelIdRef.current = selectedParcelId;

  const selectedLandmarkIdRef = useRef(selectedLandmarkId);
  selectedLandmarkIdRef.current = selectedLandmarkId;

  // 1. Initialize MapLibre instance and PMTiles protocol
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    registerPMTilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_POSITRON_RASTER_STYLE,
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 9,
      maxZoom: 19,
      attributionControl: false,
    });

    mapRef.current = map;

    // Navigation and Scale Controls
    map.addControl(
      new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      "top-right"
    );

    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 120,
        unit: "imperial",
      }),
      "bottom-left"
    );

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
      }),
      "bottom-right"
    );

    // Setup sources and layers when style loads
    map.on("load", () => {
      // -------------------------------------------------------------
      // 1. Historic District Boundaries & Fill
      // -------------------------------------------------------------
      map.addSource("historic-districts", {
        type: "geojson",
        data: districtsGeojsonUrl,
      });

      map.addLayer({
        id: "historic-districts-fill",
        type: "fill",
        source: "historic-districts",
        paint: {
          "fill-color": "#b45309", // Warm amber tint
          "fill-opacity": 0.08,
        },
      });

      map.addLayer({
        id: "historic-districts-line",
        type: "line",
        source: "historic-districts",
        paint: {
          "line-color": "#d97706",
          "line-width": 2,
          "line-dasharray": [3, 2],
          "line-opacity": 0.85,
        },
      });

      // -------------------------------------------------------------
      // 2. Tax Parcels (PMTiles Vector or GeoJSON Fallback)
      // -------------------------------------------------------------
      if (pmtilesUrl) {
        const normalizedUrl = pmtilesUrl.startsWith("pmtiles://")
          ? pmtilesUrl
          : `pmtiles://${pmtilesUrl}`;

        map.addSource("parcels", {
          type: "vector",
          url: normalizedUrl,
        });

        map.addLayer({
          id: "parcels-fill",
          type: "fill",
          source: "parcels",
          "source-layer": "parcels",
          paint: {
            "fill-color": getMapLibreColorExpression(),
            "fill-opacity": getMapLibreYearFilterExpression(
              yearMinRef.current,
              yearMaxRef.current
            ),
          },
        });

        map.addLayer({
          id: "parcels-line",
          type: "line",
          source: "parcels",
          "source-layer": "parcels",
          paint: {
            "line-color": "#57534e",
            "line-width": 0.5,
            "line-opacity": 0.35,
          },
        });

        map.addLayer({
          id: "parcels-highlight",
          type: "line",
          source: "parcels",
          "source-layer": "parcels",
          paint: {
            "line-color": "#2563eb",
            "line-width": 3,
            "line-opacity": [
              "case",
              ["==", ["get", "id"], selectedParcelIdRef.current || ""],
              1,
              0,
            ],
          },
        });
      } else {
        map.addSource("parcels", {
          type: "geojson",
          data: parcelsGeojsonUrl,
        });

        map.addLayer({
          id: "parcels-fill",
          type: "fill",
          source: "parcels",
          paint: {
            "fill-color": getMapLibreColorExpression(),
            "fill-opacity": getMapLibreYearFilterExpression(
              yearMinRef.current,
              yearMaxRef.current
            ),
          },
        });

        map.addLayer({
          id: "parcels-line",
          type: "line",
          source: "parcels",
          paint: {
            "line-color": "#57534e",
            "line-width": 0.5,
            "line-opacity": 0.35,
          },
        });

        map.addLayer({
          id: "parcels-highlight",
          type: "line",
          source: "parcels",
          paint: {
            "line-color": "#2563eb",
            "line-width": 3,
            "line-opacity": [
              "case",
              ["==", ["get", "id"], selectedParcelIdRef.current || ""],
              1,
              0,
            ],
          },
        });
      }

      // -------------------------------------------------------------
      // 3. Landmark Points & Custom Pins (LM vs PLM)
      // -------------------------------------------------------------
      map.addSource("landmarks", {
        type: "geojson",
        data: landmarksGeojsonUrl,
      });

      // Landmark Highlight Halo (for selected landmark)
      map.addLayer({
        id: "landmarks-highlight",
        type: "circle",
        source: "landmarks",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            10,
            16,
            16,
          ],
          "circle-color": "#f59e0b", // Gold highlight
          "circle-opacity": [
            "case",
            ["==", ["get", "id"], selectedLandmarkIdRef.current || ""],
            0.6,
            0,
          ],
        },
      });

      // Landmark Outer Disc / Ring
      map.addLayer({
        id: "landmarks-outer",
        type: "circle",
        source: "landmarks",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            6,
            16,
            11,
          ],
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "match",
            ["get", "designation"],
            "PLM",
            "#7c3aed", // Royal Violet for Protected Landmark
            "#2563eb", // Blue for standard Landmark
          ],
          "circle-opacity": 0.95,
        },
      });

      // Landmark Inner Disc
      map.addLayer({
        id: "landmarks-inner",
        type: "circle",
        source: "landmarks",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            4,
            16,
            7,
          ],
          "circle-color": [
            "match",
            ["get", "designation"],
            "PLM",
            "#7c3aed",
            "#2563eb",
          ],
        },
      });

      // Landmark Labels at higher zoom
      map.addLayer({
        id: "landmarks-labels",
        type: "symbol",
        source: "landmarks",
        minzoom: 14.5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-max-width": 9,
        },
        paint: {
          "text-color": "#1e293b",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      // -------------------------------------------------------------
      // 4. Interactive Event Handlers (Click & Hover)
      // -------------------------------------------------------------
      const cursorLayers = ["parcels-fill", "landmarks-outer", "landmarks-inner"];
      cursorLayers.forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      // Landmark Click
      map.on("click", "landmarks-inner", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        onSelectLandmarkRef.current?.(
          feature.properties as unknown as LandmarkProperties
        );
      });

      map.on("click", "landmarks-outer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        onSelectLandmarkRef.current?.(
          feature.properties as unknown as LandmarkProperties
        );
      });

      // Parcel Click
      map.on("click", "parcels-fill", (e) => {
        const landmarkHits = map.queryRenderedFeatures(e.point, {
          layers: ["landmarks-inner", "landmarks-outer"],
        });
        if (landmarkHits.length > 0) return; // Landmark takes click precedence

        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        onSelectParcelRef.current?.(
          feature.properties as unknown as ParcelProperties
        );
      });

      // District Click (when not clicking parcel or landmark)
      map.on("click", "historic-districts-fill", (e) => {
        const higherFeatures = map.queryRenderedFeatures(e.point, {
          layers: ["landmarks-inner", "landmarks-outer", "parcels-fill"],
        });
        if (higherFeatures.length > 0) return;

        if (e.features && e.features.length > 0) {
          onSelectDistrictRef.current?.(
            e.features[0].properties as unknown as DistrictProperties
          );
        }
      });

      // Background Map Click (Deselect)
      map.on("click", (e) => {
        const anyFeatures = map.queryRenderedFeatures(e.point, {
          layers: [
            "landmarks-inner",
            "landmarks-outer",
            "parcels-fill",
            "historic-districts-fill",
          ],
        });
        if (anyFeatures.length === 0) {
          onSelectParcelRef.current?.(null);
          onSelectLandmarkRef.current?.(null);
          onSelectDistrictRef.current?.(null);
        }
      });

      setMapLoaded(true);
      onMapLoadedRef.current?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [
    districtsGeojsonUrl,
    initialCenter,
    initialZoom,
    landmarksGeojsonUrl,
    parcelsGeojsonUrl,
    pmtilesUrl,
  ]);

  // 2. Real-Time GPU Year Filtering
  // Updates the MapLibre fill-opacity expression directly on the GPU without network requests
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("parcels-fill")) {
      map.setPaintProperty(
        "parcels-fill",
        "fill-opacity",
        getMapLibreYearFilterExpression(yearMin, yearMax)
      );
    }
  }, [yearMin, yearMax, mapLoaded]);

  // 3. Dynamic Parcel Selection Highlight
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("parcels-highlight")) {
      map.setPaintProperty("parcels-highlight", "line-opacity", [
        "case",
        ["==", ["get", "id"], selectedParcelId || ""],
        1,
        0,
      ]);
    }
  }, [selectedParcelId, mapLoaded]);

  // 4. Dynamic Landmark Selection Highlight
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("landmarks-highlight")) {
      map.setPaintProperty("landmarks-highlight", "circle-opacity", [
        "case",
        ["==", ["get", "id"], selectedLandmarkId || ""],
        0.6,
        0,
      ]);
    }
  }, [selectedLandmarkId, mapLoaded]);

  // 5. Container Resize Handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      data-testid="map-view-container"
    />
  );
};

export default MapView;
