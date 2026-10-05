import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getMapLibreColorExpression,
  getMapLibreYearFilterExpression,
} from "../../utils/colorScales";
import {
  getHistoricLayer,
  DEFAULT_HISTORIC_LAYER_ID,
  createHistoricRasterSource,
} from "../../utils/historicLayers";
import { getHistoricClipPath } from "./HistoricSwipe";

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
   * Whether to activate the split-screen historic map comparison swipe (default: false)
   */
  showHistoricSwipe?: boolean;
  /**
   * Split position percentage from 0 to 100 for the historic layer comparison (default: 50)
   */
  swipePosition?: number;
  /**
   * Identifier of the historic map layer (default: 'usgs-1915')
   */
  historicLayerId?: string;
  /**
   * Optional custom CSS class name for outer container
   */
  className?: string;
}

export const DEFAULT_HOUSTON_CENTER: [number, number] = [-95.362, 29.759];
export const DEFAULT_HOUSTON_ZOOM = 14.5;

export const DEFAULT_CARTO_KEY = "cb1_4ajs_1_00added5e5179378a7fb9996";

/**
 * Generates CARTO Positron basemap style specification.
 * Automatically appends ?key=... as required by CARTO's basemap servers.
 */
export const getCartoPositronStyle = (apiKey?: string): maplibregl.StyleSpecification => {
  const key =
    apiKey ??
    (typeof import.meta !== "undefined" ? import.meta.env?.VITE_CARTO_API_KEY : undefined) ??
    DEFAULT_CARTO_KEY;
  const query = key ? `?key=${encodeURIComponent(key)}&api_key=${encodeURIComponent(key)}` : "";

  return {
    version: 8,
    sources: {
      "carto-positron": {
        type: "raster",
        tiles: [
          `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png${query}`,
          `https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png${query}`,
          `https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png${query}`,
          `https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png${query}`,
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
};

export const CARTO_POSITRON_RASTER_STYLE: maplibregl.StyleSpecification = getCartoPositronStyle();

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
  showHistoricSwipe = false,
  swipePosition = 50,
  historicLayerId = DEFAULT_HISTORIC_LAYER_ID,
  className = "w-full h-full relative",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Destructure coordinates to avoid tearing down map on inline array references
  const centerLng = initialCenter?.[0] ?? DEFAULT_HOUSTON_CENTER[0];
  const centerLat = initialCenter?.[1] ?? DEFAULT_HOUSTON_CENTER[1];

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

  const showHistoricSwipeRef = useRef(showHistoricSwipe);
  showHistoricSwipeRef.current = showHistoricSwipe;

  const historicLayerIdRef = useRef(historicLayerId);
  historicLayerIdRef.current = historicLayerId;

  const swipePositionRef = useRef(swipePosition);
  swipePositionRef.current = swipePosition;

  useEffect(() => {
    swipePositionRef.current = swipePosition;
  }, [swipePosition]);

  // 1. Initialize MapLibre instance and PMTiles protocol
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    registerPMTilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: CARTO_POSITRON_RASTER_STYLE,
      center: [centerLng, centerLat],
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
      // 0. Historic Raster Comparison Layer (USGS 1915 / Sanborn)
      // -------------------------------------------------------------
      const historicLayer = getHistoricLayer(historicLayerIdRef.current);
      map.addSource("historic-raster-source", {
        type: "raster",
        tiles: historicLayer.tiles,
        tileSize: historicLayer.tileSize,
        attribution: historicLayer.attribution,
        minzoom: historicLayer.minzoom,
        maxzoom: historicLayer.maxzoom,
        bounds: historicLayer.bounds,
      });

      map.addLayer({
        id: "historic-raster-layer",
        type: "raster",
        source: "historic-raster-source",
        layout: {
          visibility: "none",
        },
        paint: {
          "raster-opacity": 0,
        },
      });

      // -------------------------------------------------------------
      // 1. Historic District Boundaries Source & Base Fill
      // (Fill is added under parcels, while outline is added ABOVE parcels)
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
            "line-opacity": getMapLibreYearFilterExpression(
              yearMinRef.current,
              yearMaxRef.current,
              0.35,
              0
            ),
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
            "line-opacity": getMapLibreYearFilterExpression(
              yearMinRef.current,
              yearMaxRef.current,
              0.35,
              0
            ),
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
      // 3. Historic District Boundary Lines (Rendered ABOVE parcels)
      // Added after parcels so district borders remain prominent & crisp
      // -------------------------------------------------------------
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
      // 4. Landmark Points & Custom Pins (LM vs PLM)
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

      // Landmark Outer Disc / Ring (Encompasses pin boundary)
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
      // 5. Interactive Event Handlers (Click & Hover)
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

      // Check if click point falls on the historic (right) side of the split-screen divider
      const isClickOnHistoricSide = (point?: { x: number; y: number }): boolean => {
        if (!showHistoricSwipeRef.current || !containerRef.current || !point)
          return false;
        const width =
          containerRef.current.clientWidth ||
          containerRef.current.getBoundingClientRect().width;
        if (width <= 0) return false;
        const dividerX = (swipePositionRef.current / 100) * width;
        return point.x > dividerX;
      };

      // Landmark Click: Listen exclusively on landmarks-outer to prevent duplicate callbacks
      map.on("click", "landmarks-outer", (e) => {
        if (isClickOnHistoricSide(e.point)) return;
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        onSelectLandmarkRef.current?.(
          feature.properties as unknown as LandmarkProperties
        );
      });

      // Parcel Click
      map.on("click", "parcels-fill", (e) => {
        if (isClickOnHistoricSide(e.point)) return;
        const landmarkHits = map.queryRenderedFeatures(e.point, {
          layers: ["landmarks-outer", "landmarks-inner"],
        });
        if (landmarkHits.length > 0) return; // Landmark takes click precedence

        if (!e.features || e.features.length === 0) return;
        const matchingFeature = e.features.find((f) => {
          const rawYr = f.properties?.yr;
          if (rawYr === undefined || rawYr === null) return true;
          const yr = Number(rawYr);
          if (isNaN(yr) || yr <= 0) return false;
          return yr >= yearMinRef.current && yr <= yearMaxRef.current;
        });

        if (!matchingFeature) {
          // If no parcel at this location matches the active year filter, check if a district was clicked underneath
          const districtHits = map.queryRenderedFeatures(e.point, {
            layers: ["historic-districts-fill"],
          });
          if (districtHits.length > 0) {
            onSelectDistrictRef.current?.(
              districtHits[0].properties as unknown as DistrictProperties
            );
          } else {
            onSelectParcelRef.current?.(null);
          }
          return;
        }

        onSelectParcelRef.current?.(
          matchingFeature.properties as unknown as ParcelProperties
        );
      });

      // District Click (when not clicking parcel or landmark)
      map.on("click", "historic-districts-fill", (e) => {
        if (isClickOnHistoricSide(e.point)) return;
        const landmarkHits = map.queryRenderedFeatures(e.point, {
          layers: ["landmarks-outer", "landmarks-inner"],
        });
        if (landmarkHits.length > 0) return;

        const parcelHits = map.queryRenderedFeatures(e.point, {
          layers: ["parcels-fill"],
        });
        const hasMatchingParcel = parcelHits.some((f) => {
          const rawYr = f.properties?.yr;
          if (rawYr === undefined || rawYr === null) return true;
          const yr = Number(rawYr);
          if (isNaN(yr) || yr <= 0) return false;
          return yr >= yearMinRef.current && yr <= yearMaxRef.current;
        });
        if (hasMatchingParcel) return;

        if (e.features && e.features.length > 0) {
          onSelectDistrictRef.current?.(
            e.features[0].properties as unknown as DistrictProperties
          );
        }
      });

      // Background Map Click (Deselect)
      map.on("click", (e) => {
        if (isClickOnHistoricSide(e.point)) return;
        const anyFeatures = map.queryRenderedFeatures(e.point, {
          layers: [
            "landmarks-outer",
            "landmarks-inner",
            "parcels-fill",
            "historic-districts-fill",
          ],
        });
        const visibleFeatures = anyFeatures.filter((f) => {
          if (f.layer.id === "parcels-fill") {
            const rawYr = f.properties?.yr;
            if (rawYr === undefined || rawYr === null) return true;
            const yr = Number(rawYr);
            if (isNaN(yr) || yr <= 0) return false;
            return yr >= yearMinRef.current && yr <= yearMaxRef.current;
          }
          return true;
        });
        if (visibleFeatures.length === 0) {
          onSelectParcelRef.current?.(null);
          onSelectLandmarkRef.current?.(null);
          onSelectDistrictRef.current?.(null);
        }
      });

      setMapLoaded(true);
      onMapLoadedRef.current?.(map);
    });

    return () => {
      setMapLoaded(false);
      map.remove();
      mapRef.current = null;
    };
  }, [
    districtsGeojsonUrl,
    centerLng,
    centerLat,
    initialZoom,
    landmarksGeojsonUrl,
    parcelsGeojsonUrl,
    pmtilesUrl,
  ]);

  // 2. Real-Time GPU Year Filtering
  // Updates the MapLibre fill-opacity and line-opacity expressions directly on the GPU without network requests
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
    if (map.getLayer("parcels-line")) {
      map.setPaintProperty(
        "parcels-line",
        "line-opacity",
        getMapLibreYearFilterExpression(yearMin, yearMax, 0.35, 0)
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

  // 5. Historic Raster Layer Visibility & Opacity
  // Primary map keeps historic-raster-layer hidden during swipe mode so modern cartography is visible
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("historic-raster-layer")) {
      if (typeof map.setLayoutProperty === "function") {
        map.setLayoutProperty(
          "historic-raster-layer",
          "visibility",
          "none"
        );
      }
      if (typeof map.setPaintProperty === "function") {
        map.setPaintProperty(
          "historic-raster-layer",
          "raster-opacity",
          0
        );
      }
    }
  }, [showHistoricSwipe, historicLayerId, mapLoaded]);

  // 6. Historic Raster Layer Source/Tiles update when layer ID changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const layer = getHistoricLayer(historicLayerId);
    const source = map.getSource("historic-raster-source") as any;
    if (source && typeof source.setTiles === "function") {
      source.setTiles(layer.tiles);
    }
  }, [historicLayerId, mapLoaded]);

  // 7. Synchronized Secondary Map for Historic Swipe Comparison
  const historicOverlayRef = useRef<HTMLDivElement>(null);
  const historicContainerRef = useRef<HTMLDivElement>(null);
  const secondaryMapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    showHistoricSwipeRef.current = showHistoricSwipe;
    if (!showHistoricSwipe || !historicContainerRef.current || !mapRef.current) {
      if (secondaryMapRef.current) {
        secondaryMapRef.current.remove();
        secondaryMapRef.current = null;
      }
      return;
    }

    const primary = mapRef.current;
    const currentHistoric = getHistoricLayer(historicLayerId);

    const center: maplibregl.LngLatLike =
      typeof primary.getCenter === "function"
        ? primary.getCenter()
        : ([centerLng, centerLat] as [number, number]);
    const zoom =
      typeof primary.getZoom === "function" ? primary.getZoom() : initialZoom;
    const bearing =
      typeof primary.getBearing === "function" ? primary.getBearing() : 0;
    const pitch =
      typeof primary.getPitch === "function" ? primary.getPitch() : 0;

    const secMap = new maplibregl.Map({
      container: historicContainerRef.current,
      style: {
        version: 8,
        sources: {
          "historic-tiles": createHistoricRasterSource(currentHistoric),
        },
        layers: [
          {
            id: "historic-tiles-layer",
            type: "raster",
            source: "historic-tiles",
            paint: {
              "raster-opacity": currentHistoric.defaultOpacity ?? 0.9,
            },
          },
        ],
      },
      center,
      zoom,
      bearing,
      pitch,
      interactive: false,
      attributionControl: false,
    });

    secondaryMapRef.current = secMap;

    const syncCamera = () => {
      if (typeof secMap.jumpTo !== "function") return;
      secMap.jumpTo({
        center:
          typeof primary.getCenter === "function"
            ? primary.getCenter()
            : ([centerLng, centerLat] as [number, number]),
        zoom:
          typeof primary.getZoom === "function" ? primary.getZoom() : initialZoom,
        bearing:
          typeof primary.getBearing === "function" ? primary.getBearing() : 0,
        pitch:
          typeof primary.getPitch === "function" ? primary.getPitch() : 0,
      });
    };

    primary.on("move", syncCamera);

    return () => {
      primary.off("move", syncCamera);
      secMap.remove();
      secondaryMapRef.current = null;
    };
  }, [showHistoricSwipe, historicLayerId, mapLoaded]);

  // 8. Container Resize Handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.resize();
      secondaryMapRef.current?.resize();
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
    >
      {showHistoricSwipe && (
        <div
          ref={historicOverlayRef}
          data-testid="historic-map-overlay"
          className="absolute inset-0 pointer-events-none overflow-hidden z-10"
          style={{
            clipPath: getHistoricClipPath(swipePosition),
          }}
        >
          <div
            ref={historicContainerRef}
            className="w-full h-full"
            data-testid="historic-secondary-map"
          />
        </div>
      )}
    </div>
  );
};

export default MapView;
