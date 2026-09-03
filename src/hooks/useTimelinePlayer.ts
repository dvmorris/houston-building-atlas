/**
 * Preservation Houston Building Atlas - useTimelinePlayer Hook
 *
 * Provides timeline playback state and ticker engine for timelapse growth animations.
 * Supports variable playback speeds (1x: 150ms, 2x: 75ms, 5x: 30ms), playhead bounds clamping,
 * looping, and boundary stopping at 2026.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export type TimelineSpeed = "1x" | "2x" | "5x";

export const SPEED_INTERVALS: Record<TimelineSpeed, number> = {
  "1x": 150, // 1 year per 150ms (~6.6 yrs/sec)
  "2x": 75,  // 1 year per 75ms  (~13.3 yrs/sec)
  "5x": 30,  // 1 year per 30ms  (~33.3 yrs/sec)
};

export const DEFAULT_MIN_BOUND = 1836;
export const DEFAULT_MAX_BOUND = 2026;

export interface UseTimelinePlayerOptions {
  /**
   * Absolute lowest year bound (default: 1836 - founding of Houston)
   */
  minBound?: number;
  /**
   * Absolute highest year bound (default: 2026 - present day)
   */
  maxBound?: number;
  /**
   * Initial start year (default: minBound)
   */
  initialYearMin?: number;
  /**
   * Initial end year (default: maxBound)
   */
  initialYearMax?: number;
  /**
   * Initial playback speed multiplier (default: "1x")
   */
  initialSpeed?: TimelineSpeed;
  /**
   * Whether to start playing immediately on mount (default: false)
   */
  initialPlaying?: boolean;
  /**
   * Whether to loop back to start year when reaching maxBound (default: false)
   */
  loop?: boolean;
  /**
   * Callback fired when year range updates via drag or playback tick
   */
  onYearChange?: (yearMin: number, yearMax: number) => void;
}

export interface UseTimelinePlayerReturn {
  yearMin: number;
  yearMax: number;
  isPlaying: boolean;
  speed: TimelineSpeed;
  loop: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: TimelineSpeed) => void;
  setLoop: (loop: boolean) => void;
  toggleLoop: () => void;
  setYearRange: (min: number, max: number) => void;
  setYearMin: (min: number) => void;
  setYearMax: (max: number) => void;
  reset: () => void;
}

export function useTimelinePlayer(
  options: UseTimelinePlayerOptions = {}
): UseTimelinePlayerReturn {
  const {
    minBound = DEFAULT_MIN_BOUND,
    maxBound = DEFAULT_MAX_BOUND,
    initialYearMin = DEFAULT_MIN_BOUND,
    initialYearMax = DEFAULT_MAX_BOUND,
    initialSpeed = "1x",
    initialPlaying = false,
    loop: initialLoop = false,
    onYearChange,
  } = options;

  const [yearMin, setYearMinState] = useState<number>(() =>
    Math.max(minBound, Math.min(initialYearMin, maxBound))
  );
  const [yearMax, setYearMaxState] = useState<number>(() =>
    Math.max(yearMin, Math.min(initialYearMax, maxBound))
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(initialPlaying);
  const [speed, setSpeed] = useState<TimelineSpeed>(initialSpeed);
  const [loop, setLoop] = useState<boolean>(initialLoop);

  // References to avoid stale closures in tick intervals
  const yearMinRef = useRef(yearMin);
  yearMinRef.current = yearMin;

  const yearMaxRef = useRef(yearMax);
  yearMaxRef.current = yearMax;

  const loopRef = useRef(loop);
  loopRef.current = loop;

  const onYearChangeRef = useRef(onYearChange);
  onYearChangeRef.current = onYearChange;

  const setYearRange = useCallback(
    (min: number, max: number) => {
      const clampedMin = Math.max(minBound, Math.min(min, maxBound));
      const clampedMax = Math.max(clampedMin, Math.min(max, maxBound));

      setYearMinState(clampedMin);
      setYearMaxState(clampedMax);
      yearMinRef.current = clampedMin;
      yearMaxRef.current = clampedMax;

      onYearChangeRef.current?.(clampedMin, clampedMax);
    },
    [minBound, maxBound]
  );

  const setYearMin = useCallback(
    (min: number) => {
      const clampedMin = Math.max(minBound, Math.min(min, maxBound));
      const currentMax = yearMaxRef.current;
      const clampedMax = Math.max(clampedMin, currentMax);

      setYearMinState(clampedMin);
      setYearMaxState(clampedMax);
      yearMinRef.current = clampedMin;
      yearMaxRef.current = clampedMax;

      onYearChangeRef.current?.(clampedMin, clampedMax);
    },
    [minBound, maxBound]
  );

  const setYearMax = useCallback(
    (max: number) => {
      const clampedMax = Math.max(minBound, Math.min(max, maxBound));
      const currentMin = yearMinRef.current;
      const clampedMin = Math.min(clampedMax, currentMin);

      setYearMinState(clampedMin);
      setYearMaxState(clampedMax);
      yearMinRef.current = clampedMin;
      yearMaxRef.current = clampedMax;

      onYearChangeRef.current?.(clampedMin, clampedMax);
    },
    [minBound, maxBound]
  );

  const play = useCallback(() => {
    // If playhead is already at maxBound, restart from yearMin
    if (yearMaxRef.current >= maxBound) {
      const startYear =
        yearMinRef.current >= maxBound ? minBound : yearMinRef.current;
      setYearMaxState(startYear);
      yearMaxRef.current = startYear;
      onYearChangeRef.current?.(yearMinRef.current, startYear);
    }
    setIsPlaying(true);
  }, [maxBound, minBound]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const toggleLoop = useCallback(() => {
    setLoop((prev) => !prev);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setYearRange(minBound, maxBound);
  }, [minBound, maxBound, setYearRange]);

  // Main timelapse playback tick interval
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = SPEED_INTERVALS[speed] ?? 150;
    const intervalId = setInterval(() => {
      const currentMax = yearMaxRef.current;
      const currentMin = yearMinRef.current;

      // Check if we need to loop back
      if (currentMax >= maxBound) {
        if (loopRef.current) {
          const resetYear = currentMin >= maxBound ? minBound : currentMin;
          setYearMaxState(resetYear);
          yearMaxRef.current = resetYear;
          onYearChangeRef.current?.(currentMin, resetYear);
        } else {
          setIsPlaying(false);
        }
        return;
      }

      // Normal progression: step forward 1 year
      const nextMax = currentMax + 1;

      if (nextMax >= maxBound) {
        setYearMaxState(maxBound);
        yearMaxRef.current = maxBound;
        onYearChangeRef.current?.(currentMin, maxBound);

        if (!loopRef.current) {
          setIsPlaying(false);
        }
      } else {
        setYearMaxState(nextMax);
        yearMaxRef.current = nextMax;
        onYearChangeRef.current?.(currentMin, nextMax);
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [isPlaying, speed, maxBound, minBound]);

  return {
    yearMin,
    yearMax,
    isPlaying,
    speed,
    loop,
    play,
    pause,
    togglePlay,
    setSpeed,
    setLoop,
    toggleLoop,
    setYearRange,
    setYearMin,
    setYearMax,
    reset,
  };
}

export default useTimelinePlayer;
