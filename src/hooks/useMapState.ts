import { useState, useEffect, useRef, useCallback } from "react";

export interface MapState {
  zoom: number;
  lat: number;
  lng: number;
  yearMin: number;
  yearMax: number;
  parcelId: string | null;
  swipe: boolean;
}

export const DEFAULT_MAP_STATE: MapState = {
  zoom: 14.5,
  lat: 29.759,
  lng: -95.362,
  yearMin: 1836,
  yearMax: 2026,
  parcelId: null,
  swipe: false,
};

/**
 * Parses MapState from a URL string or hash fragment.
 * Supports formats:
 * - /#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0
 * - #16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=1
 * - #/16/29.7521/-95.3621
 * - Standard query strings: ?yr_min=1900&yr_max=1930&parcel=0010020000001
 * - Full absolute URLs
 */
export function parseMapState(
  urlOrHash?: string,
  fallback: MapState = DEFAULT_MAP_STATE
): MapState {
  let input = urlOrHash;
  if (input === undefined || input === null) {
    input = typeof window !== "undefined" ? window.location.href : "";
  }
  input = input.trim();

  if (!input) {
    return { ...fallback };
  }

  let preHash = input;
  let hashPart = "";

  const hashIndex = input.indexOf("#");
  if (hashIndex !== -1) {
    preHash = input.slice(0, hashIndex);
    hashPart = input.slice(hashIndex + 1);
  }

  let coordPart = "";
  let queryFromHash = "";

  if (hashPart) {
    const questionIndex = hashPart.indexOf("?");
    if (questionIndex !== -1) {
      coordPart = hashPart.slice(0, questionIndex);
      queryFromHash = hashPart.slice(questionIndex + 1);
    } else {
      coordPart = hashPart;
    }
  }

  let queryFromPre = "";
  const preQuestionIndex = preHash.indexOf("?");
  if (preQuestionIndex !== -1) {
    queryFromPre = preHash.slice(preQuestionIndex + 1);
  }

  // Combine query parameters from both search and hash, with hash taking precedence
  const searchParams = new URLSearchParams(queryFromPre);
  if (queryFromHash) {
    const hashParams = new URLSearchParams(queryFromHash);
    hashParams.forEach((value, key) => {
      searchParams.set(key, value);
    });
  }

  let zoom = fallback.zoom;
  let lat = fallback.lat;
  let lng = fallback.lng;

  // Parse camera coordinates from coordPart: e.g. "16/29.7521/-95.3621" or "/16/29.7521/-95.3621"
  if (coordPart) {
    const cleanCoords = coordPart.replace(/^\/+/, "");
    const parts = cleanCoords.split("/").filter(Boolean);
    if (parts.length >= 3) {
      const parsedZoom = parseFloat(parts[0]);
      const parsedLat = parseFloat(parts[1]);
      const parsedLng = parseFloat(parts[2]);

      if (Number.isFinite(parsedZoom) && parsedZoom >= 0 && parsedZoom <= 24) {
        zoom = parsedZoom;
      }
      if (Number.isFinite(parsedLat) && parsedLat >= -90 && parsedLat <= 90) {
        lat = parsedLat;
      }
      if (Number.isFinite(parsedLng) && parsedLng >= -180 && parsedLng <= 180) {
        lng = parsedLng;
      }
    }
  }

  // Parse year bounds
  let yearMin = fallback.yearMin;
  const rawYrMin =
    searchParams.get("yr_min") ||
    searchParams.get("year_min") ||
    searchParams.get("yearMin");
  if (rawYrMin !== null) {
    const parsedMin = parseInt(rawYrMin, 10);
    if (Number.isFinite(parsedMin)) {
      yearMin = Math.max(1836, Math.min(2026, parsedMin));
    }
  }

  let yearMax = fallback.yearMax;
  const rawYrMax =
    searchParams.get("yr_max") ||
    searchParams.get("year_max") ||
    searchParams.get("yearMax");
  if (rawYrMax !== null) {
    const parsedMax = parseInt(rawYrMax, 10);
    if (Number.isFinite(parsedMax)) {
      yearMax = Math.max(1836, Math.min(2026, parsedMax));
    }
  }

  if (yearMin > yearMax) {
    const tmp = yearMin;
    yearMin = yearMax;
    yearMax = tmp;
  }

  // Parse parcel ID
  let parcelId = fallback.parcelId;
  const rawParcel =
    searchParams.get("parcel") ||
    searchParams.get("parcelId") ||
    searchParams.get("property");
  if (rawParcel !== null) {
    const trimmed = rawParcel.trim();
    parcelId = trimmed.length > 0 ? trimmed : null;
  }

  // Parse swipe boolean
  let swipe = fallback.swipe;
  const rawSwipe = searchParams.get("swipe");
  if (rawSwipe !== null) {
    const lower = rawSwipe.trim().toLowerCase();
    swipe = lower === "1" || lower === "true" || lower === "yes";
  }

  return {
    zoom,
    lat,
    lng,
    yearMin,
    yearMax,
    parcelId,
    swipe,
  };
}

/**
 * Serializes MapState into a URL hash fragment.
 * Output format: #16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0
 */
export function serializeMapState(state: Partial<MapState>): string {
  const zoomVal =
    state.zoom !== undefined && Number.isFinite(state.zoom)
      ? state.zoom
      : DEFAULT_MAP_STATE.zoom;
  const latVal =
    state.lat !== undefined && Number.isFinite(state.lat)
      ? state.lat
      : DEFAULT_MAP_STATE.lat;
  const lngVal =
    state.lng !== undefined && Number.isFinite(state.lng)
      ? state.lng
      : DEFAULT_MAP_STATE.lng;

  const zoomStr = Number(zoomVal.toFixed(2)).toString();
  const latStr = Number(latVal.toFixed(4)).toString();
  const lngStr = Number(lngVal.toFixed(4)).toString();

  const yearMin =
    state.yearMin !== undefined && Number.isFinite(state.yearMin)
      ? state.yearMin
      : DEFAULT_MAP_STATE.yearMin;
  const yearMax =
    state.yearMax !== undefined && Number.isFinite(state.yearMax)
      ? state.yearMax
      : DEFAULT_MAP_STATE.yearMax;

  const params = new URLSearchParams();
  params.set("yr_min", String(yearMin));
  params.set("yr_max", String(yearMax));

  if (state.parcelId && state.parcelId.trim()) {
    params.set("parcel", state.parcelId.trim());
  }

  params.set("swipe", state.swipe ? "1" : "0");

  return `#${zoomStr}/${latStr}/${lngStr}?${params.toString()}`;
}

/**
 * Alias for serializeMapState
 */
export const serializeMapStateToHash = serializeMapState;

/**
 * Serializes MapState into a full pathname + hash relative URL.
 * Output format: /#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0
 */
export function serializeMapStateToUrl(
  state: Partial<MapState>,
  basePath = "/"
): string {
  const hash = serializeMapState(state);
  const cleanPath = basePath.endsWith("/") ? basePath : `${basePath}/`;
  return `${cleanPath}${hash}`;
}

export interface UseMapStateOptions {
  initialState?: Partial<MapState>;
  debounceMs?: number;
  yearMin?: number;
  yearMax?: number;
  selectedParcelId?: string | null;
  showHistoricSwipe?: boolean;
  onPopState?: (state: MapState) => void;
}

export interface UseMapStateReturn {
  initialState: MapState;
  mapState: MapState;
  setMapState: React.Dispatch<React.SetStateAction<MapState>>;
  updateState: (updates: Partial<MapState>) => void;
  updateCamera: (zoom: number, lat: number, lng: number) => void;
  setYearRange: (yearMin: number, yearMax: number) => void;
  setYearMin: (yearMin: number) => void;
  setYearMax: (yearMax: number) => void;
  setParcelId: (parcelId: string | null) => void;
  setSwipe: (swipe: boolean) => void;
  syncToUrl: (override?: Partial<MapState>) => void;
}

/**
 * Hook to synchronize map position, timeline filter bounds, selected parcel ID,
 * and historic comparison swipe state with the URL hash using history.replaceState.
 * Also handles browser forward/back navigation via popstate/hashchange events.
 */
export function useMapState(options?: UseMapStateOptions): UseMapStateReturn {
  const {
    initialState: customInitial,
    debounceMs = 300,
    yearMin,
    yearMax,
    selectedParcelId,
    showHistoricSwipe,
    onPopState,
  } = options || {};

  // Parse initial state on initial mount exactly once
  const [parsedInitial] = useState<MapState>(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    return parseMapState(url, { ...DEFAULT_MAP_STATE, ...customInitial });
  });

  const [mapState, setMapState] = useState<MapState>(parsedInitial);

  const onPopStateRef = useRef(onPopState);
  onPopStateRef.current = onPopState;

  const lastSerializedHashRef = useRef<string>(serializeMapState(parsedInitial));

  // Sync external controlled props into mapState if provided
  useEffect(() => {
    if (
      yearMin !== undefined ||
      yearMax !== undefined ||
      selectedParcelId !== undefined ||
      showHistoricSwipe !== undefined
    ) {
      setMapState((prev) => {
        const nextMin = yearMin !== undefined ? yearMin : prev.yearMin;
        const nextMax = yearMax !== undefined ? yearMax : prev.yearMax;
        const nextParcel =
          selectedParcelId !== undefined ? selectedParcelId : prev.parcelId;
        const nextSwipe =
          showHistoricSwipe !== undefined ? showHistoricSwipe : prev.swipe;

        if (
          nextMin === prev.yearMin &&
          nextMax === prev.yearMax &&
          nextParcel === prev.parcelId &&
          nextSwipe === prev.swipe
        ) {
          return prev;
        }

        return {
          ...prev,
          yearMin: nextMin,
          yearMax: nextMax,
          parcelId: nextParcel,
          swipe: nextSwipe,
        };
      });
    }
  }, [yearMin, yearMax, selectedParcelId, showHistoricSwipe]);

  // Performs actual update to window history / hash
  const commitUrl = useCallback((targetState: MapState) => {
    if (typeof window === "undefined") return;

    const newHash = serializeMapState(targetState);
    if (newHash === lastSerializedHashRef.current) return;

    lastSerializedHashRef.current = newHash;

    try {
      if (window.history && typeof window.history.replaceState === "function") {
        const newUrl = `${window.location.pathname}${newHash}`;
        window.history.replaceState(window.history.state ?? null, "", newUrl);
      } else {
        window.location.hash = newHash;
      }
    } catch {
      try {
        window.location.hash = newHash;
      } catch {
        // Fallback for isolated sandboxes
      }
    }
  }, []);

  // Debounced URL updates when mapState changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const targetHash = serializeMapState(mapState);
    if (targetHash === lastSerializedHashRef.current) return;

    if (debounceMs <= 0) {
      commitUrl(mapState);
      return;
    }

    const timer = setTimeout(() => {
      commitUrl(mapState);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [mapState, debounceMs, commitUrl]);

  // Listen for browser navigation (back / forward buttons)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleUrlChange = () => {
      const freshState = parseMapState(window.location.href);
      lastSerializedHashRef.current = serializeMapState(freshState);
      setMapState(freshState);
      onPopStateRef.current?.(freshState);
    };

    window.addEventListener("popstate", handleUrlChange);
    window.addEventListener("hashchange", handleUrlChange);

    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("hashchange", handleUrlChange);
    };
  }, []);

  // Action helpers
  const updateState = useCallback((updates: Partial<MapState>) => {
    setMapState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateCamera = useCallback(
    (zoom: number, lat: number, lng: number) => {
      setMapState((prev) => {
        if (
          Math.abs(prev.zoom - zoom) < 0.01 &&
          Math.abs(prev.lat - lat) < 0.0001 &&
          Math.abs(prev.lng - lng) < 0.0001
        ) {
          return prev;
        }
        return { ...prev, zoom, lat, lng };
      });
    },
    []
  );

  const setYearRange = useCallback((newMin: number, newMax: number) => {
    setMapState((prev) => {
      if (prev.yearMin === newMin && prev.yearMax === newMax) return prev;
      return { ...prev, yearMin: newMin, yearMax: newMax };
    });
  }, []);

  const setYearMin = useCallback((newMin: number) => {
    setMapState((prev) => {
      if (prev.yearMin === newMin) return prev;
      return { ...prev, yearMin: newMin };
    });
  }, []);

  const setYearMax = useCallback((newMax: number) => {
    setMapState((prev) => {
      if (prev.yearMax === newMax) return prev;
      return { ...prev, yearMax: newMax };
    });
  }, []);

  const setParcelId = useCallback((id: string | null) => {
    setMapState((prev) => {
      if (prev.parcelId === id) return prev;
      return { ...prev, parcelId: id };
    });
  }, []);

  const setSwipe = useCallback((swipe: boolean) => {
    setMapState((prev) => {
      if (prev.swipe === swipe) return prev;
      return { ...prev, swipe };
    });
  }, []);

  const syncToUrl = useCallback(
    (override?: Partial<MapState>) => {
      const target = override ? { ...mapState, ...override } : mapState;
      commitUrl(target);
    },
    [mapState, commitUrl]
  );

  return {
    initialState: parsedInitial,
    mapState,
    setMapState,
    updateState,
    updateCamera,
    setYearRange,
    setYearMin,
    setYearMax,
    setParcelId,
    setSwipe,
    syncToUrl,
  };
}
