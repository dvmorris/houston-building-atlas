import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapView, CARTO_POSITRON_RASTER_STYLE } from "./MapView";

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Store current mock map instance for test assertions
let mockMapInstance: any = null;
const eventListeners = new Map<string, Array<(e: any) => void>>();
const sources = new Map<string, any>();
const layers = new Map<string, any>();
const paintProperties = new Map<string, Record<string, any>>();

vi.mock("maplibre-gl", () => {
  class MockMap {
    container: any;
    options: any;
    canvas: any;

    constructor(options: any) {
      this.options = options;
      this.container = options.container;
      this.canvas = { style: { cursor: "" } };
      mockMapInstance = this;
    }

    on = vi.fn((event: string, ...args: any[]) => {
      const callback = typeof args[0] === "function" ? args[0] : args[1];
      const layerId = typeof args[0] === "string" ? args[0] : null;
      const key = layerId ? `${event}:${layerId}` : event;
      if (!eventListeners.has(key)) {
        eventListeners.set(key, []);
      }
      eventListeners.get(key)!.push(callback);
    });

    off = vi.fn();

    addControl = vi.fn();

    addSource = vi.fn((id: string, source: any) => {
      sources.set(id, source);
    });

    getSource = vi.fn((id: string) => sources.get(id));

    addLayer = vi.fn((layer: any) => {
      layers.set(layer.id, layer);
    });

    getLayer = vi.fn((id: string) => layers.get(id));

    setPaintProperty = vi.fn((layerId: string, property: string, value: any) => {
      if (!paintProperties.has(layerId)) {
        paintProperties.set(layerId, {});
      }
      paintProperties.get(layerId)![property] = value;
    });

    getCanvas = vi.fn(() => this.canvas);

    queryRenderedFeatures = vi.fn(() => []);

    resize = vi.fn();

    remove = vi.fn();
  }

  const mockAddProtocol = vi.fn();

  return {
    default: {
      Map: MockMap,
      NavigationControl: vi.fn(),
      ScaleControl: vi.fn(),
      AttributionControl: vi.fn(),
      addProtocol: mockAddProtocol,
    },
    Map: MockMap,
    NavigationControl: vi.fn(),
    ScaleControl: vi.fn(),
    AttributionControl: vi.fn(),
    addProtocol: mockAddProtocol,
  };
});

describe("MapView component", () => {
  beforeEach(() => {
    mockMapInstance = null;
    eventListeners.clear();
    sources.clear();
    layers.clear();
    paintProperties.clear();
    vi.clearAllMocks();
  });

  it("mounts cleanly and renders container div", () => {
    render(<MapView />);
    const container = screen.getByTestId("map-view-container");
    expect(container).toBeDefined();
    expect(mockMapInstance).not.toBeNull();
  });

  it("configures CARTO Positron raster basemap and Houston center by default", () => {
    render(<MapView />);
    expect(mockMapInstance.options.style).toBe(CARTO_POSITRON_RASTER_STYLE);
    expect(mockMapInstance.options.center).toEqual([-95.362, 29.759]);
    expect(mockMapInstance.options.zoom).toBe(14.5);
  });

  it("adds navigation, scale, and attribution controls", () => {
    render(<MapView />);
    expect(mockMapInstance.addControl).toHaveBeenCalledTimes(3);
  });

  it("registers sources and layers on map load event", () => {
    render(<MapView />);

    // Simulate map load event
    const loadCallbacks = eventListeners.get("load") || [];
    expect(loadCallbacks.length).toBeGreaterThan(0);

    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    // Verify historic districts source and layers
    expect(mockMapInstance.addSource).toHaveBeenCalledWith(
      "historic-districts",
      expect.objectContaining({ type: "geojson" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "historic-districts-fill" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "historic-districts-line" })
    );

    // Verify parcels source and fill layer
    expect(mockMapInstance.addSource).toHaveBeenCalledWith(
      "parcels",
      expect.objectContaining({ type: "geojson" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "parcels-fill" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "parcels-highlight" })
    );

    // Verify landmarks source and pins
    expect(mockMapInstance.addSource).toHaveBeenCalledWith(
      "landmarks",
      expect.objectContaining({ type: "geojson" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "landmarks-outer" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "landmarks-inner" })
    );
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: "landmarks-highlight" })
    );
  });

  it("configures PMTiles vector source when pmtilesUrl is provided", () => {
    render(<MapView pmtilesUrl="https://example.com/houston.pmtiles" />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    expect(mockMapInstance.addSource).toHaveBeenCalledWith(
      "parcels",
      expect.objectContaining({
        type: "vector",
        url: "pmtiles://https://example.com/houston.pmtiles",
      })
    );
  });

  it("updates GPU shader year filter opacity when year bounds change", () => {
    const { rerender } = render(<MapView yearMin={1850} yearMax={1920} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    // Rerender with new year bounds
    rerender(<MapView yearMin={1900} yearMax={1940} />);

    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith(
      "parcels-fill",
      "fill-opacity",
      [
        "case",
        ["all", [">=", ["get", "yr"], 1900], ["<=", ["get", "yr"], 1940]],
        0.75,
        0.05,
      ]
    );
  });

  it("updates parcel highlight opacity when selectedParcelId changes", () => {
    const { rerender } = render(<MapView selectedParcelId={null} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    rerender(<MapView selectedParcelId="0010020000001" />);

    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith(
      "parcels-highlight",
      "line-opacity",
      ["case", ["==", ["get", "id"], "0010020000001"], 1, 0]
    );
  });

  it("updates landmark highlight opacity when selectedLandmarkId changes", () => {
    const { rerender } = render(<MapView selectedLandmarkId={null} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    rerender(<MapView selectedLandmarkId="lm-kellum-noble" />);

    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith(
      "landmarks-highlight",
      "circle-opacity",
      ["case", ["==", ["get", "id"], "lm-kellum-noble"], 0.6, 0]
    );
  });

  it("emits onSelectParcel when parcel polygon is clicked", () => {
    const onSelectParcel = vi.fn();
    render(<MapView onSelectParcel={onSelectParcel} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    const parcelClickCallbacks = eventListeners.get("click:parcels-fill") || [];
    expect(parcelClickCallbacks.length).toBeGreaterThan(0);

    const mockParcelData = {
      id: "0010020000001",
      yr: 1925,
      addr: "1200 TEXAS AVE",
      owner: "HISTORIC TRUST LLC",
      use: "RES",
      contrib: 1,
    };

    act(() => {
      parcelClickCallbacks.forEach((cb) =>
        cb({
          point: { x: 100, y: 100 },
          features: [{ properties: mockParcelData }],
        })
      );
    });

    expect(onSelectParcel).toHaveBeenCalledWith(mockParcelData);
  });

  it("emits onSelectLandmark when landmark marker is clicked", () => {
    const onSelectLandmark = vi.fn();
    render(<MapView onSelectLandmark={onSelectLandmark} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    const landmarkClickCallbacks =
      eventListeners.get("click:landmarks-inner") || [];
    expect(landmarkClickCallbacks.length).toBeGreaterThan(0);

    const mockLandmarkData = {
      id: "lm-kellum-noble",
      name: "Kellum-Noble House",
      addr: "212 DALLAS ST",
      yr: 1847,
      designation: "PLM",
    };

    act(() => {
      landmarkClickCallbacks.forEach((cb) =>
        cb({
          features: [{ properties: mockLandmarkData }],
        })
      );
    });

    expect(onSelectLandmark).toHaveBeenCalledWith(mockLandmarkData);
  });

  it("emits onSelectDistrict when historic district boundary is clicked", () => {
    const onSelectDistrict = vi.fn();
    render(<MapView onSelectDistrict={onSelectDistrict} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    const districtClickCallbacks =
      eventListeners.get("click:historic-districts-fill") || [];
    expect(districtClickCallbacks.length).toBeGreaterThan(0);

    const mockDistrictData = {
      id: "dist-downtown",
      name: "Downtown",
      full_name: "Downtown Historic District",
      designated_year: 1995,
      description: "Downtown commercial center",
    };

    act(() => {
      districtClickCallbacks.forEach((cb) =>
        cb({
          point: { x: 50, y: 50 },
          features: [{ properties: mockDistrictData }],
        })
      );
    });

    expect(onSelectDistrict).toHaveBeenCalledWith(mockDistrictData);
  });

  it("emits null selection when background map is clicked", () => {
    const onSelectParcel = vi.fn();
    const onSelectLandmark = vi.fn();
    const onSelectDistrict = vi.fn();

    render(
      <MapView
        onSelectParcel={onSelectParcel}
        onSelectLandmark={onSelectLandmark}
        onSelectDistrict={onSelectDistrict}
      />
    );

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    const bgClickCallbacks = eventListeners.get("click") || [];
    expect(bgClickCallbacks.length).toBeGreaterThan(0);

    act(() => {
      bgClickCallbacks.forEach((cb) => cb({ point: { x: 10, y: 10 } }));
    });

    expect(onSelectParcel).toHaveBeenCalledWith(null);
    expect(onSelectLandmark).toHaveBeenCalledWith(null);
    expect(onSelectDistrict).toHaveBeenCalledWith(null);
  });

  it("cleans up map instance on unmount", () => {
    const { unmount } = render(<MapView />);
    expect(mockMapInstance).not.toBeNull();

    unmount();
    expect(mockMapInstance.remove).toHaveBeenCalled();
  });
});
