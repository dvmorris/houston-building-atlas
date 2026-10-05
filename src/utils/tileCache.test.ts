import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CachedFetchSource,
  lonLatToTile,
  getTilesForBBox,
  getOrInitCachedPMTiles,
  prefetchTiles,
  DOWNTOWN_BBOX,
  getDataUrl,
} from "./tileCache";

describe("tileCache & Preloader", () => {
  describe("getDataUrl", () => {
    it("resolves clean asset path with fallback", () => {
      const url = getDataUrl("data/parcels_sample.geojson");
      expect(url).toContain("data/parcels_sample.geojson");
      expect(url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")).toBe(true);
    });

    it("strips leading slashes from relative path", () => {
      const url = getDataUrl("/data/houston_parcels.pmtiles");
      expect(url).toContain("data/houston_parcels.pmtiles");
      expect(url).not.toContain("//data");
    });
  });

  describe("lonLatToTile & getTilesForBBox", () => {
    it("converts Downtown Houston coordinates to tile coordinates at zoom 14", () => {
      // Downtown Houston: -95.362, 29.759
      const [x, y] = lonLatToTile(-95.362, 29.759, 14);
      expect(x).toBe(3851);
      expect(y).toBe(6772);
    });

    it("clamps coordinates within valid tile bounds [0, 2^z - 1]", () => {
      const [xMin, yMin] = lonLatToTile(-180, 85.0511, 10);
      expect(xMin).toBeGreaterThanOrEqual(0);
      expect(yMin).toBeGreaterThanOrEqual(0);

      const [xMax, yMax] = lonLatToTile(180, -85.0511, 10);
      expect(xMax).toBeLessThan(1024);
      expect(yMax).toBeLessThan(1024);
    });

    it("generates tiles covering the Downtown bounding box for zoom 14", () => {
      const tiles = getTilesForBBox(DOWNTOWN_BBOX, 14, 14);
      expect(tiles.length).toBeGreaterThan(0);
      tiles.forEach((t) => {
        expect(t.z).toBe(14);
        expect(t.x).toBeGreaterThan(3800);
        expect(t.y).toBeGreaterThan(6700);
      });
    });
  });

  describe("CachedFetchSource", () => {
    const testUrl = "https://example.com/tiles.pmtiles";
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn().mockImplementation(async () => {
        const fakeData = new Uint8Array([1, 2, 3, 4, 5]).buffer;
        return {
          status: 206,
          headers: new Headers({
            "Content-Type": "application/octet-stream",
            "Content-Length": "5",
            Etag: '"test-etag-123"',
          }),
          arrayBuffer: async () => fakeData,
        };
      });
      vi.stubGlobal("fetch", mockFetch);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns the url as key", () => {
      const source = new CachedFetchSource(testUrl);
      expect(source.getKey()).toBe(testUrl);
    });

    it("fetches over network on first call and caches in memory", async () => {
      const source = new CachedFetchSource(testUrl);
      const res1 = await source.getBytes(0, 100);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res1.data.byteLength).toBe(5);

      // Second call for exact same range should hit in-memory cache
      const res2 = await source.getBytes(0, 100);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No new network call!
      expect(res2.data.byteLength).toBe(5);
    });

    it("evicts oldest entry when memoryCache exceeds maxMemoryEntries", async () => {
      const source = new CachedFetchSource(testUrl, 2);
      await source.getBytes(0, 10);
      await source.getBytes(10, 10);
      expect(source.memoryCache.size).toBe(2);

      // Adding 3rd item should evict first item
      await source.getBytes(20, 10);
      expect(source.memoryCache.size).toBe(2);
      expect(source.memoryCache.has(`${testUrl}#range=0-9`)).toBe(false);
      expect(source.memoryCache.has(`${testUrl}#range=10-19`)).toBe(true);
      expect(source.memoryCache.has(`${testUrl}#range=20-29`)).toBe(true);
    });
  });

  describe("getOrInitCachedPMTiles", () => {
    it("returns singleton instance for the same normalized URL", () => {
      const p1 = getOrInitCachedPMTiles("https://example.com/atlas.pmtiles");
      const p2 = getOrInitCachedPMTiles("pmtiles://https://example.com/atlas.pmtiles");
      expect(p1).toBe(p2);
    });
  });

  describe("prefetchTiles", () => {
    it("invokes onProgress callback as tiles are fetched", async () => {
      const mockPMTiles: any = {
        getHeader: vi.fn().mockResolvedValue({ minZoom: 10, maxZoom: 15 }),
        getZxy: vi.fn().mockResolvedValue({ data: new ArrayBuffer(10) }),
      };

      const tiles = [
        { z: 14, x: 3851, y: 6772 },
        { z: 14, x: 3851, y: 6773 },
        { z: 14, x: 3852, y: 6772 },
      ];

      const progressLogs: Array<[number, number]> = [];
      await prefetchTiles(mockPMTiles, tiles, (completed, total) => {
        progressLogs.push([completed, total]);
      });

      expect(mockPMTiles.getHeader).toHaveBeenCalledTimes(1);
      expect(mockPMTiles.getZxy).toHaveBeenCalledTimes(3);
      expect(progressLogs.length).toBe(3);
      expect(progressLogs[progressLogs.length - 1]).toEqual([3, 3]);
    });
  });
});
