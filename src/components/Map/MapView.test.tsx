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

    setLayoutProperty = vi.fn((layerId: string, property: string, value: any) => {
      const layer = layers.get(layerId);
      if (layer) {
        if (!layer.layout) layer.layout = {};
        layer.layout[property] = value;
      }
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

    // Verify historic district line is added AFTER parcels so boundaries remain crisp
    const layerCalls = mockMapInstance.addLayer.mock.calls.map(
      (call: any[]) => call[0].id
    );
    const districtLineIndex = layerCalls.indexOf("historic-districts-line");
    const parcelsFillIndex = layerCalls.indexOf("parcels-fill");
    expect(districtLineIndex).toBeGreaterThan(parcelsFillIndex);

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

  it("emits onSelectLandmark once on landmarks-outer without duplicate callbacks", () => {
    const onSelectLandmark = vi.fn();
    render(<MapView onSelectLandmark={onSelectLandmark} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    // Ensure no duplicate listener is registered on landmarks-inner
    expect(eventListeners.get("click:landmarks-inner")).toBeUndefined();

    const landmarkClickCallbacks =
      eventListeners.get("click:landmarks-outer") || [];
    expect(landmarkClickCallbacks.length).toBe(1);

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

    expect(onSelectLandmark).toHaveBeenCalledTimes(1);
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

  it("does not destroy or recreate map when inline initialCenter array is passed across renders", () => {
    const { rerender } = render(<MapView initialCenter={[-95.362, 29.759]} />);
    const initialMap = mockMapInstance;
    expect(initialMap).not.toBeNull();

    // Rerender with fresh array reference of same coordinates
    rerender(<MapView initialCenter={[-95.362, 29.759]} />);
    expect(mockMapInstance).toBe(initialMap);
    expect(initialMap.remove).not.toHaveBeenCalled();
  });

  it("cleans up map instance on unmount", () => {
    const { unmount } = render(<MapView />);
    expect(mockMapInstance).not.toBeNull();

    unmount();
    expect(mockMapInstance.remove).toHaveBeenCalled();
  });

  it("registers historic raster source and layer on map load", () => {
    render(<MapView />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    expect(mockMapInstance.addSource).toHaveBeenCalledWith(
      "historic-raster-source",
      expect.objectContaining({
        type: "raster",
        tiles: expect.any(Array),
      })
    );

    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "historic-raster-layer",
        type: "raster",
        source: "historic-raster-source",
      })
    );
  });

  it("toggles historic raster layer visibility and opacity when showHistoricSwipe changes", () => {
    const { rerender } = render(<MapView showHistoricSwipe={false} />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    // Rerender with showHistoricSwipe = true
    rerender(<MapView showHistoricSwipe={true} />);

    expect(mockMapInstance.setLayoutProperty).toHaveBeenCalledWith(
      "historic-raster-layer",
      "visibility",
      "visible"
    );

    expect(mockMapInstance.setPaintProperty).toHaveBeenCalledWith(
      "historic-raster-layer",
      "raster-opacity",
      expect.any(Number)
    );

    // Rerender back to false
    rerender(<MapView showHistoricSwipe={false} />);

    expect(mockMapInstance.setLayoutProperty).toHaveBeenCalledWith(
      "historic-raster-layer",
      "visibility",
      "none"
    );
  });

  it("renders historic map overlay container with clipPath according to swipePosition", () => {
    const { rerender } = render(
      <MapView showHistoricSwipe={true} swipePosition={65} />
    );

    const overlay = screen.getByTestId("historic-map-overlay");
    expect(overlay).toBeInTheDocument();
    expect(overlay.style.clipPath).toBe(
      "polygon(65% 0, 100% 0, 100% 100%, 65% 100%)"
    );

    rerender(<MapView showHistoricSwipe={true} swipePosition={30} />);
    expect(overlay.style.clipPath).toBe(
      "polygon(30% 0, 100% 0, 100% 100%, 30% 100%)"
    );
  });

  it("updates historic raster source when historicLayerId changes", () => {
    const mockSetTiles = vi.fn();
    const { rerender } = render(<MapView historicLayerId="usgs-1915" />);

    const loadCallbacks = eventListeners.get("load") || [];
    act(() => {
      loadCallbacks.forEach((cb) => cb({}));
    });

    const source = mockMapInstance.getSource("historic-raster-source");
    source.setTiles = mockSetTiles;

    rerender(<MapView historicLayerId="sanborn-1924" />);

    expect(mockSetTiles).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("Houston_1924_Sanborn")])
    );
  });
});
