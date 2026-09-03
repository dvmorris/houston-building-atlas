import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfills for jsdom environment
if (typeof window !== "undefined") {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => "blob:mock-url";
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}

if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Global fallback mock for maplibre-gl in jsdom
vi.mock("maplibre-gl", () => {
  class MockMap {
    container: any;
    options: any;

    constructor(options: any) {
      this.options = options;
      this.container = options?.container;
    }

    on = vi.fn();
    off = vi.fn();
    addControl = vi.fn();
    addSource = vi.fn();
    getSource = vi.fn();
    addLayer = vi.fn();
    getLayer = vi.fn();
    setPaintProperty = vi.fn();
    setLayoutProperty = vi.fn();
    getCanvas = vi.fn(() => ({ style: { cursor: "" } }));
    getCenter = vi.fn(() => ({ lng: -95.362, lat: 29.759 }));
    getZoom = vi.fn(() => 14.5);
    getBearing = vi.fn(() => 0);
    getPitch = vi.fn(() => 0);
    jumpTo = vi.fn();
    flyTo = vi.fn();
    queryRenderedFeatures = vi.fn(() => []);
    resize = vi.fn();
    remove = vi.fn();
  }

  return {
    default: {
      Map: MockMap,
      NavigationControl: vi.fn(),
      ScaleControl: vi.fn(),
      AttributionControl: vi.fn(),
      addProtocol: vi.fn(),
    },
    Map: MockMap,
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    AttributionControl: vi.fn(),
    addProtocol: vi.fn(),
  };
});
