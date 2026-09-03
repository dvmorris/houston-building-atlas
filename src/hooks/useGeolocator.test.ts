import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGeolocator } from "./useGeolocator";

describe("useGeolocator", () => {
  const originalGeolocation = navigator.geolocation;

  let mockGetCurrentPosition: ReturnType<typeof vi.fn>;
  let mockWatchPosition: ReturnType<typeof vi.fn>;
  let mockClearWatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetCurrentPosition = vi.fn();
    mockWatchPosition = vi.fn(() => 42);
    mockClearWatch = vi.fn();

    const mockGeolocation = {
      getCurrentPosition: mockGetCurrentPosition,
      watchPosition: mockWatchPosition,
      clearWatch: mockClearWatch,
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: originalGeolocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("initializes with default idle state", () => {
    const { result } = renderHook(() => useGeolocator());

    expect(result.current.coords).toBeNull();
    expect(result.current.isLocating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("handles successful getCurrentPosition location retrieval", () => {
    const onLocationFound = vi.fn();
    const { result } = renderHook(() => useGeolocator({ onLocationFound }));

    act(() => {
      result.current.locateUser();
    });

    expect(result.current.isLocating).toBe(true);
    expect(mockGetCurrentPosition).toHaveBeenCalled();

    const [successCallback] = mockGetCurrentPosition.mock.calls[0];

    const mockPosition = {
      coords: {
        latitude: 29.759,
        longitude: -95.362,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
    };

    act(() => {
      successCallback(mockPosition);
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.coords).toEqual({
      latitude: 29.759,
      longitude: -95.362,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    });
    expect(onLocationFound).toHaveBeenCalledWith(result.current.coords);
  });

  it("handles permission denied error (code 1)", () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useGeolocator({ onError }));

    act(() => {
      result.current.locateUser();
    });

    const [, errorCallback] = mockGetCurrentPosition.mock.calls[0];

    act(() => {
      errorCallback({
        code: 1,
        message: "User denied Geolocation",
      });
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.coords).toBeNull();
    expect(result.current.error).toMatch(/permission denied/i);
    expect(onError).toHaveBeenCalledWith(result.current.error);
  });

  it("handles position unavailable error (code 2)", () => {
    const { result } = renderHook(() => useGeolocator());

    act(() => {
      result.current.locateUser();
    });

    const [, errorCallback] = mockGetCurrentPosition.mock.calls[0];

    act(() => {
      errorCallback({
        code: 2,
        message: "Position unavailable",
      });
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.error).toMatch(/unavailable/i);
  });

  it("handles timeout error (code 3)", () => {
    const { result } = renderHook(() => useGeolocator());

    act(() => {
      result.current.locateUser();
    });

    const [, errorCallback] = mockGetCurrentPosition.mock.calls[0];

    act(() => {
      errorCallback({
        code: 3,
        message: "Timeout",
      });
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.error).toMatch(/timed out/i);
  });

  it("supports continuous position watching and stopLocating", () => {
    const { result, unmount } = renderHook(() =>
      useGeolocator({ watch: true })
    );

    act(() => {
      result.current.locateUser();
    });

    expect(mockWatchPosition).toHaveBeenCalled();
    expect(result.current.isLocating).toBe(true);

    act(() => {
      result.current.stopLocating();
    });

    expect(mockClearWatch).toHaveBeenCalledWith(42);
    expect(result.current.isLocating).toBe(false);

    // Unmount clears watch if still active
    unmount();
  });

  it("reports error if navigator.geolocation is not supported", () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocator());

    act(() => {
      result.current.locateUser();
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.error).toMatch(/not supported/i);
  });
});
