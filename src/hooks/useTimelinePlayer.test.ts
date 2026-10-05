import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useTimelinePlayer, SPEED_INTERVALS } from "./useTimelinePlayer";

describe("useTimelinePlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("initializes with default values (1836 to 2026, paused, 1x speed, loop false)", () => {
    const { result } = renderHook(() => useTimelinePlayer());

    expect(result.current.yearMin).toBe(1836);
    expect(result.current.yearMax).toBe(2026);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.speed).toBe("1x");
    expect(result.current.loop).toBe(false);
  });

  it("accepts custom initial options", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        minBound: 1850,
        maxBound: 2000,
        initialYearMin: 1860,
        initialYearMax: 1940,
        initialSpeed: "2x",
        loop: true,
        initialPlaying: false,
      })
    );

    expect(result.current.yearMin).toBe(1860);
    expect(result.current.yearMax).toBe(1940);
    expect(result.current.speed).toBe("2x");
    expect(result.current.loop).toBe(true);
  });

  it("toggles play and pause state", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1920,
      })
    );

    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it("advances yearMax on tick at 1x speed (150ms per year)", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
        initialSpeed: "1x",
      })
    );

    act(() => {
      result.current.play();
    });

    expect(result.current.yearMax).toBe(1900);

    // Advance 150ms -> +1 year
    act(() => {
      vi.advanceTimersByTime(SPEED_INTERVALS["1x"]);
    });
    expect(result.current.yearMax).toBe(1901);

    // Advance another 300ms -> +2 years
    act(() => {
      vi.advanceTimersByTime(SPEED_INTERVALS["1x"] * 2);
    });
    expect(result.current.yearMax).toBe(1903);
  });

  it("respects 2x speed multiplier (75ms per year)", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
        initialSpeed: "2x",
      })
    );

    act(() => {
      result.current.play();
    });

    act(() => {
      vi.advanceTimersByTime(SPEED_INTERVALS["2x"]);
    });
    expect(result.current.yearMax).toBe(1901);

    act(() => {
      vi.advanceTimersByTime(SPEED_INTERVALS["2x"] * 3);
    });
    expect(result.current.yearMax).toBe(1904);
  });

  it("respects 5x speed multiplier (30ms per year)", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
        initialSpeed: "5x",
      })
    );

    act(() => {
      result.current.play();
    });

    act(() => {
      vi.advanceTimersByTime(SPEED_INTERVALS["5x"]);
    });
    expect(result.current.yearMax).toBe(1901);

    act(() => {
      vi.advanceTimersByTime(SPEED_INTERVALS["5x"] * 5);
    });
    expect(result.current.yearMax).toBe(1906);
  });

  it("stops at maxBound (2026) when loop is false", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        minBound: 1836,
        maxBound: 2026,
        initialYearMin: 1836,
        initialYearMax: 2024,
        initialSpeed: "1x",
        loop: false,
      })
    );

    act(() => {
      result.current.play();
    });

    // 2024 -> 2025
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(2025);
    expect(result.current.isPlaying).toBe(true);

    // 2025 -> 2026 (hits maxBound)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(2026);
    expect(result.current.isPlaying).toBe(false);

    // Additional time should not advance past 2026
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.yearMax).toBe(2026);
    expect(result.current.isPlaying).toBe(false);
  });

  it("loops back to yearMin when loop is true and maxBound is reached", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        minBound: 1836,
        maxBound: 2026,
        initialYearMin: 1900,
        initialYearMax: 2025,
        initialSpeed: "1x",
        loop: true,
      })
    );

    act(() => {
      result.current.play();
    });

    // 2025 -> 2026
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(2026);
    expect(result.current.isPlaying).toBe(true);

    // 2026 -> loops to yearMin (1900)
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(1900);
    expect(result.current.isPlaying).toBe(true);
  });

  it("resets yearMax to yearMin when starting play while already at maxBound", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        minBound: 1836,
        maxBound: 2026,
        initialYearMin: 1836,
        initialYearMax: 2026,
      })
    );

    expect(result.current.yearMax).toBe(2026);

    act(() => {
      result.current.play();
    });

    // Automatically resets to yearMin to start timelapse
    expect(result.current.yearMax).toBe(1836);
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(1837);
  });

  it("clamps setYearRange to minBound and maxBound", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        minBound: 1836,
        maxBound: 2026,
      })
    );

    act(() => {
      result.current.setYearRange(1800, 2100);
    });
    expect(result.current.yearMin).toBe(1836);
    expect(result.current.yearMax).toBe(2026);

    act(() => {
      result.current.setYearRange(1950, 1920);
    });
    // If min > max, max is clamped to at least min
    expect(result.current.yearMin).toBe(1950);
    expect(result.current.yearMax).toBe(1950);
  });

  it("clamps setYearMin so it does not exceed yearMax", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1940,
      })
    );

    act(() => {
      result.current.setYearMin(1960);
    });
    expect(result.current.yearMin).toBe(1960);
    expect(result.current.yearMax).toBe(1960);
  });

  it("clamps setYearMax so it is not less than yearMin", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1920,
        initialYearMax: 1940,
      })
    );

    act(() => {
      result.current.setYearMax(1910);
    });
    expect(result.current.yearMin).toBe(1910);
    expect(result.current.yearMax).toBe(1910);
  });

  it("calls onYearChange callback when year range changes or ticks", () => {
    const onYearChange = vi.fn();
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1905,
        onYearChange,
      })
    );

    act(() => {
      result.current.setYearRange(1910, 1930);
    });
    expect(onYearChange).toHaveBeenCalledWith(1910, 1930);

    act(() => {
      result.current.play();
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onYearChange).toHaveBeenCalledWith(1910, 1931);
  });

  it("supports changing playback speed during active playback", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
        initialSpeed: "1x",
      })
    );

    act(() => {
      result.current.play();
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(1901);

    act(() => {
      result.current.setSpeed("5x");
    });
    expect(result.current.speed).toBe("5x");

    act(() => {
      vi.advanceTimersByTime(30);
    });
    expect(result.current.yearMax).toBe(1902);
  });

  it("cleans up timer on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
      })
    );

    act(() => {
      result.current.play();
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });
  });

  it("synchronizes playback with map render when mapRef is provided", () => {
    let renderListener: (() => void) | null = null;
    const mockMap = {
      areTilesLoaded: vi.fn(() => true),
      once: vi.fn((event: string, cb: () => void) => {
        if (event === "render") {
          renderListener = cb;
        }
      }),
      off: vi.fn(),
    };
    const mapRef = { current: mockMap };

    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
        initialSpeed: "1x",
        mapRef,
      })
    );

    act(() => {
      result.current.play();
    });

    // Advance 150ms to trigger first tick
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Year advanced to 1901 and registered once('render')
    expect(result.current.yearMax).toBe(1901);
    expect(mockMap.once).toHaveBeenCalledWith("render", expect.any(Function));

    // Simulate map completing render
    act(() => {
      renderListener?.();
    });

    // Next tick should advance to 1902 after 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(1902);
  });

  it("pauses progression when map tiles are loading until idle event", () => {
    let tilesLoaded = false;
    let idleListener: (() => void) | null = null;
    const mockMap = {
      areTilesLoaded: vi.fn(() => tilesLoaded),
      once: vi.fn((event: string, cb: () => void) => {
        if (event === "idle") {
          idleListener = cb;
        } else if (event === "render") {
          cb();
        }
      }),
      off: vi.fn(),
    };
    const mapRef = { current: mockMap };

    const { result } = renderHook(() =>
      useTimelinePlayer({
        initialYearMin: 1900,
        initialYearMax: 1900,
        initialSpeed: "1x",
        mapRef,
      })
    );

    act(() => {
      result.current.play();
    });

    // Tiles are not loaded initially, so playback holds until idle
    expect(mockMap.once).toHaveBeenCalledWith("idle", expect.any(Function));
    expect(result.current.yearMax).toBe(1900);
    expect(result.current.isBuffering).toBe(true);

    // Simulate tiles finishing loading
    tilesLoaded = true;
    act(() => {
      idleListener?.();
    });
    expect(result.current.isBuffering).toBe(false);

    // Advance 150ms
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current.yearMax).toBe(1901);
  });
});
