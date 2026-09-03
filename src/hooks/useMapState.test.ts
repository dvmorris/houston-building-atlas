import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  parseMapState,
  serializeMapState,
  serializeMapStateToHash,
  serializeMapStateToUrl,
  useMapState,
  DEFAULT_MAP_STATE,
  MapState,
} from "./useMapState";

describe("useMapState", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.useFakeTimers();
    // Set a clean default location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: "http://localhost:5173/",
      pathname: "/",
      search: "",
      hash: "",
    } as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    (window as any).location = originalLocation;
  });

  describe("parseMapState", () => {
    it("returns DEFAULT_MAP_STATE for empty, null, or undefined input", () => {
      expect(parseMapState("")).toEqual(DEFAULT_MAP_STATE);
      expect(parseMapState(undefined)).toEqual(DEFAULT_MAP_STATE);
      expect(parseMapState("   ")).toEqual(DEFAULT_MAP_STATE);
    });

    it("returns DEFAULT_MAP_STATE for bare hash or root slash hash", () => {
      expect(parseMapState("#")).toEqual(DEFAULT_MAP_STATE);
      expect(parseMapState("/#")).toEqual(DEFAULT_MAP_STATE);
      expect(parseMapState("#/")).toEqual(DEFAULT_MAP_STATE);
    });

    it("parses full URL hash with coordinates and query parameters", () => {
      const url =
        "/#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0";
      const state = parseMapState(url);

      expect(state).toEqual({
        zoom: 16,
        lat: 29.7521,
        lng: -95.3621,
        yearMin: 1900,
        yearMax: 1930,
        parcelId: "0010020000001",
        swipe: false,
      });
    });

    it("parses hash with active swipe comparison mode (swipe=1)", () => {
      const url =
        "#16.5/29.7600/-95.3700?yr_min=1910&yr_max=1945&parcel=0020030000002&swipe=1";
      const state = parseMapState(url);

      expect(state.zoom).toBe(16.5);
      expect(state.lat).toBe(29.76);
      expect(state.lng).toBe(-95.37);
      expect(state.yearMin).toBe(1910);
      expect(state.yearMax).toBe(1945);
      expect(state.parcelId).toBe("0020030000002");
      expect(state.swipe).toBe(true);
    });

    it("parses slash-after-hash format (#/16/...)", () => {
      const url =
        "#/16/29.7521/-95.3621?yr_min=1880&yr_max=1914&swipe=true";
      const state = parseMapState(url);

      expect(state.zoom).toBe(16);
      expect(state.lat).toBe(29.7521);
      expect(state.lng).toBe(-95.3621);
      expect(state.yearMin).toBe(1880);
      expect(state.yearMax).toBe(1914);
      expect(state.parcelId).toBeNull();
      expect(state.swipe).toBe(true);
    });

    it("parses absolute URL with domain", () => {
      const url =
        "https://atlas.preservationhouston.org/#15/29.755/-95.365?yr_min=1920&yr_max=1950&parcel=1234567890123&swipe=0";
      const state = parseMapState(url);

      expect(state.zoom).toBe(15);
      expect(state.lat).toBe(29.755);
      expect(state.lng).toBe(-95.365);
      expect(state.yearMin).toBe(1920);
      expect(state.yearMax).toBe(1950);
      expect(state.parcelId).toBe("1234567890123");
      expect(state.swipe).toBe(false);
    });

    it("parses query parameters located before hash in search string", () => {
      const url =
        "http://localhost:5173/?yr_min=1890&yr_max=1925&parcel=999#17/29.759/-95.362";
      const state = parseMapState(url);

      expect(state.zoom).toBe(17);
      expect(state.lat).toBe(29.759);
      expect(state.lng).toBe(-95.362);
      expect(state.yearMin).toBe(1890);
      expect(state.yearMax).toBe(1925);
      expect(state.parcelId).toBe("999");
    });

    it("supports 'property' query parameter as fallback for parcel", () => {
      const url = "?property=0010020000001";
      const state = parseMapState(url);

      expect(state.parcelId).toBe("0010020000001");
      expect(state.zoom).toBe(DEFAULT_MAP_STATE.zoom);
    });

    it("gracefully falls back when coordinate segments are invalid", () => {
      const url = "#invalid/not-a-number/coords?yr_min=1920";
      const state = parseMapState(url);

      expect(state.zoom).toBe(DEFAULT_MAP_STATE.zoom);
      expect(state.lat).toBe(DEFAULT_MAP_STATE.lat);
      expect(state.lng).toBe(DEFAULT_MAP_STATE.lng);
      expect(state.yearMin).toBe(1920);
    });

    it("clamps out-of-bounds years and swaps min/max if inverted", () => {
      const url = "?yr_min=2030&yr_max=1800";
      const state = parseMapState(url);

      // min was 2030 clamped to 2026, max was 1800 clamped to 1836
      // inverted swap: min 1836, max 2026
      expect(state.yearMin).toBe(1836);
      expect(state.yearMax).toBe(2026);
    });

    it("uses custom fallback state when provided", () => {
      const customFallback: MapState = {
        zoom: 12,
        lat: 29.8,
        lng: -95.4,
        yearMin: 1900,
        yearMax: 1950,
        parcelId: "custom",
        swipe: true,
      };

      expect(parseMapState("", customFallback)).toEqual(customFallback);
    });
  });

  describe("serializeMapState & formatting", () => {
    it("serializes full state with parcel and swipe into hash format", () => {
      const state: MapState = {
        zoom: 16,
        lat: 29.7521,
        lng: -95.3621,
        yearMin: 1900,
        yearMax: 1930,
        parcelId: "0010020000001",
        swipe: false,
      };

      const serialized = serializeMapState(state);
      expect(serialized).toBe(
        "#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0"
      );
    });

    it("omits parcel parameter when parcelId is null", () => {
      const state: MapState = {
        zoom: 14.5,
        lat: 29.759,
        lng: -95.362,
        yearMin: 1836,
        yearMax: 2026,
        parcelId: null,
        swipe: true,
      };

      const serialized = serializeMapState(state);
      expect(serialized).toBe("#14.5/29.759/-95.362?yr_min=1836&yr_max=2026&swipe=1");
    });

    it("serializeMapStateToHash is identical to serializeMapState", () => {
      const state: MapState = {
        zoom: 15,
        lat: 29.75,
        lng: -95.36,
        yearMin: 1920,
        yearMax: 1940,
        parcelId: "123",
        swipe: false,
      };
      expect(serializeMapStateToHash(state)).toBe(serializeMapState(state));
    });

    it("serializeMapStateToUrl prepends base pathname", () => {
      const state: MapState = {
        zoom: 16,
        lat: 29.7521,
        lng: -95.3621,
        yearMin: 1900,
        yearMax: 1930,
        parcelId: "0010020000001",
        swipe: false,
      };

      expect(serializeMapStateToUrl(state, "/")).toBe(
        "/#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0"
      );

      expect(serializeMapStateToUrl(state, "/preservation-houston-atlas")).toBe(
        "/preservation-houston-atlas/#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0"
      );
    });
  });

  describe("Round-trip fidelity", () => {
    it("achieves round-trip fidelity between serialize and parse", () => {
      const original: MapState = {
        zoom: 16,
        lat: 29.7521,
        lng: -95.3621,
        yearMin: 1900,
        yearMax: 1930,
        parcelId: "0010020000001",
        swipe: false,
      };

      const serialized = serializeMapState(original);
      const parsed = parseMapState(serialized);
      expect(parsed).toEqual(original);

      const reSerialized = serializeMapState(parsed);
      expect(reSerialized).toBe(serialized);
    });

    it("achieves round-trip fidelity with swipe=true and parcelId=null", () => {
      const original: MapState = {
        zoom: 15.25,
        lat: 29.7612,
        lng: -95.3698,
        yearMin: 1880,
        yearMax: 1914,
        parcelId: null,
        swipe: true,
      };

      const serialized = serializeMapState(original);
      const parsed = parseMapState(serialized);
      expect(parsed).toEqual(original);
    });
  });

  describe("useMapState hook", () => {
    it("initializes with parsed state from window.location.href", () => {
      window.location.href =
        "http://localhost:5173/#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0";
      window.location.hash =
        "#16/29.7521/-95.3621?yr_min=1900&yr_max=1930&parcel=0010020000001&swipe=0";

      const { result } = renderHook(() => useMapState());

      expect(result.current.mapState).toEqual({
        zoom: 16,
        lat: 29.7521,
        lng: -95.3621,
        yearMin: 1900,
        yearMax: 1930,
        parcelId: "0010020000001",
        swipe: false,
      });
      expect(result.current.initialState).toEqual(result.current.mapState);
    });

    it("debounces history.replaceState updates when state changes", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      const { result } = renderHook(() => useMapState({ debounceMs: 200 }));

      // Update camera
      act(() => {
        result.current.updateCamera(16, 29.7521, -95.3621);
      });

      // Before debounce time, history.replaceState should not be called yet
      expect(replaceStateSpy).not.toHaveBeenCalled();

      // Advance by 100ms (still not yet fired)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(replaceStateSpy).not.toHaveBeenCalled();

      // Advance past debounce threshold
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(replaceStateSpy).toHaveBeenCalledTimes(1);
      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("#16/29.7521/-95.3621")
      );
    });

    it("updates year bounds and parcel ID", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      const { result } = renderHook(() => useMapState({ debounceMs: 100 }));

      act(() => {
        result.current.setYearRange(1880, 1914);
        result.current.setParcelId("0050060000005");
        result.current.setSwipe(true);
      });

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("yr_min=1880&yr_max=1914&parcel=0050060000005&swipe=1")
      );
    });

    it("synchronizes controlled props from external caller", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");

      const { rerender } = renderHook(
        (props: any) =>
          useMapState({
            debounceMs: 50,
            yearMin: props.yearMin,
            yearMax: props.yearMax,
            selectedParcelId: props.selectedParcelId,
            showHistoricSwipe: props.showHistoricSwipe,
          }),
        {
          initialProps: {
            yearMin: 1836,
            yearMax: 2026,
            selectedParcelId: null as string | null,
            showHistoricSwipe: false,
          },
        }
      );

      // Re-render with new values
      rerender({
        yearMin: 1915,
        yearMax: 1939,
        selectedParcelId: "1234567890123",
        showHistoricSwipe: true,
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("yr_min=1915&yr_max=1939&parcel=1234567890123&swipe=1")
      );
    });

    it("responds to browser popstate and hashchange events", () => {
      const onPopState = vi.fn();
      const { result } = renderHook(() => useMapState({ onPopState }));

      const newUrl =
        "http://localhost:5173/#17/29.755/-95.365?yr_min=1920&yr_max=1940&parcel=777&swipe=1";
      window.location.href = newUrl;
      window.location.hash =
        "#17/29.755/-95.365?yr_min=1920&yr_max=1940&parcel=777&swipe=1";

      // Trigger popstate event
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      expect(result.current.mapState).toEqual({
        zoom: 17,
        lat: 29.755,
        lng: -95.365,
        yearMin: 1920,
        yearMax: 1940,
        parcelId: "777",
        swipe: true,
      });
      expect(onPopState).toHaveBeenCalledWith(result.current.mapState);

      // Trigger hashchange event with different parcel
      window.location.href =
        "http://localhost:5173/#17/29.755/-95.365?yr_min=1920&yr_max=1940&parcel=888&swipe=0";
      act(() => {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });

      expect(result.current.mapState.parcelId).toBe("888");
      expect(result.current.mapState.swipe).toBe(false);
    });

    it("allows immediate URL flush via syncToUrl", () => {
      const replaceStateSpy = vi.spyOn(window.history, "replaceState");
      const { result } = renderHook(() => useMapState({ debounceMs: 1000 }));

      act(() => {
        result.current.syncToUrl({
          zoom: 16,
          lat: 29.7521,
          lng: -95.3621,
          yearMin: 1900,
          yearMax: 1930,
        });
      });

      // Flushed immediately without waiting for 1000ms timer
      expect(replaceStateSpy).toHaveBeenCalledWith(
        null,
        "",
        expect.stringContaining("#16/29.7521/-95.3621?yr_min=1900&yr_max=1930")
      );
    });
  });
});
