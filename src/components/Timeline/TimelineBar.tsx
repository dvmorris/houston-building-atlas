/**
 * Preservation Houston Building Atlas - TimelineBar Component
 *
 * Interactive bottom scrubber bar with dual-thumb year range slider (1836 to 2026),
 * timelapse playhead controls (Play/Pause, 1x/2x/5x speed selector, loop toggle),
 * 5 historic era shortcut buttons, and live visible structure counter.
 */

import React from "react";
import { Play, Pause, RotateCcw, Repeat, Building2 } from "lucide-react";
import {
  useTimelinePlayer,
  TimelineSpeed,
  DEFAULT_MIN_BOUND,
  DEFAULT_MAX_BOUND,
} from "../../hooks/useTimelinePlayer";
import { EraShortcuts } from "./EraShortcuts";
import { getEraName } from "../../utils/colorScales";

export interface TimelineBarProps {
  /**
   * Current start year bound (controlled)
   */
  yearMin?: number;
  /**
   * Current end year bound (controlled)
   */
  yearMax?: number;
  /**
   * Callback fired when year range changes (controlled)
   */
  onYearChange?: (yearMin: number, yearMax: number) => void;
  /**
   * Minimum allowable year bound (default: 1836)
   */
  minBound?: number;
  /**
   * Maximum allowable year bound (default: 2026)
   */
  maxBound?: number;
  /**
   * Controlled timelapse play state
   */
  isPlaying?: boolean;
  /**
   * Controlled play/pause toggle callback
   */
  onTogglePlay?: () => void;
  /**
   * Controlled playback speed multiplier
   */
  speed?: TimelineSpeed;
  /**
   * Controlled speed change callback
   */
  onSpeedChange?: (speed: TimelineSpeed) => void;
  /**
   * Controlled loop state
   */
  loop?: boolean;
  /**
   * Controlled loop toggle callback
   */
  onToggleLoop?: () => void;
  /**
   * Live count of visible structures within the active year range
   */
  totalVisibleCount?: number;
  /**
   * Whether map tiles are currently buffering during playback
   */
  isBuffering?: boolean;
  /**
   * Optional custom CSS class name
   */
  className?: string;
}

export const SPEED_OPTIONS: TimelineSpeed[] = ["1x", "2x", "5x"];

export const TimelineBar: React.FC<TimelineBarProps> = ({
  yearMin: controlledYearMin,
  yearMax: controlledYearMax,
  onYearChange: controlledOnYearChange,
  minBound = DEFAULT_MIN_BOUND,
  maxBound = DEFAULT_MAX_BOUND,
  isPlaying: controlledIsPlaying,
  isBuffering: controlledIsBuffering,
  onTogglePlay: controlledOnTogglePlay,
  speed: controlledSpeed,
  onSpeedChange: controlledOnSpeedChange,
  loop: controlledLoop,
  onToggleLoop: controlledOnToggleLoop,
  totalVisibleCount,
  className = "",
}) => {
  // Always initialize player hook for fallback or tick execution
  const internalPlayer = useTimelinePlayer({
    minBound,
    maxBound,
    initialYearMin: controlledYearMin ?? minBound,
    initialYearMax: controlledYearMax ?? maxBound,
    initialSpeed: controlledSpeed ?? "1x",
    loop: controlledLoop ?? false,
    onYearChange: controlledOnYearChange,
  });

  const isControlled =
    controlledYearMin !== undefined && controlledYearMax !== undefined;

  const yearMin = isControlled ? controlledYearMin : internalPlayer.yearMin;
  const yearMax = isControlled ? controlledYearMax : internalPlayer.yearMax;

  const isPlaying =
    controlledIsPlaying !== undefined
      ? controlledIsPlaying
      : internalPlayer.isPlaying;

  const isBuffering =
    controlledIsBuffering !== undefined
      ? controlledIsBuffering
      : internalPlayer.isBuffering;

  const speed =
    controlledSpeed !== undefined ? controlledSpeed : internalPlayer.speed;

  const loop =
    controlledLoop !== undefined ? controlledLoop : internalPlayer.loop;

  const handleTogglePlay = controlledOnTogglePlay ?? internalPlayer.togglePlay;
  const handleSpeedChange = controlledOnSpeedChange ?? internalPlayer.setSpeed;
  const handleToggleLoop = controlledOnToggleLoop ?? internalPlayer.toggleLoop;

  const handleYearRangeChange = (min: number, max: number) => {
    const clampedMin = Math.max(minBound, Math.min(min, maxBound));
    const clampedMax = Math.max(clampedMin, Math.min(max, maxBound));

    if (controlledOnYearChange) {
      controlledOnYearChange(clampedMin, clampedMax);
    }
    internalPlayer.setYearRange(clampedMin, clampedMax);
  };

  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const safeMin = Math.min(val, yearMax);
    handleYearRangeChange(safeMin, yearMax);
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const safeMax = Math.max(val, yearMin);
    handleYearRangeChange(yearMin, safeMax);
  };

  const handleReset = () => {
    handleYearRangeChange(minBound, maxBound);
    if (isPlaying) {
      handleTogglePlay();
    }
  };

  // Percentage calculations for dual-slider visual fill
  const totalSpan = maxBound - minBound;
  const minPercent = Math.max(
    0,
    Math.min(100, ((yearMin - minBound) / totalSpan) * 100)
  );
  const maxPercent = Math.max(
    0,
    Math.min(100, ((yearMax - minBound) / totalSpan) * 100)
  );
  const fillWidth = Math.max(0, maxPercent - minPercent);

  // Active era descriptive name
  const currentEra = getEraName(yearMax);

  // Formatted structure count
  const countDisplay =
    totalVisibleCount !== undefined
      ? totalVisibleCount.toLocaleString()
      : Math.round(
          ((yearMax - yearMin + 1) / totalSpan) * 425000
        ).toLocaleString();

  return (
    <footer
      aria-label="Timeline and timelapse growth controls"
      className={`border-t border-stone-800 bg-stone-900/95 p-3.5 backdrop-blur-md shadow-2xl transition-all ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5">
        {/* Top Control Bar: Playhead Controls, Year Badges, Structure Count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Play/Pause, Speed Pills, Loop, Reset */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Pause timelapse" : "Play timelapse"}
              data-testid="play-pause-btn"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 cursor-pointer shadow-md ${
                isPlaying
                  ? "bg-amber-500 text-stone-950 hover:bg-amber-400 ring-2 ring-amber-400/50 animate-pulse"
                  : "bg-amber-600 text-white hover:bg-amber-500"
              }`}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Speed Selector */}
            <div
              role="group"
              aria-label="Playback speed selector"
              className="flex items-center rounded-lg border border-stone-700 bg-stone-800/80 p-0.5"
            >
              {SPEED_OPTIONS.map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleSpeedChange(spd)}
                  aria-pressed={speed === spd}
                  title={`Set playback speed to ${spd}`}
                  className={`px-2 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer ${
                    speed === spd
                      ? "bg-stone-700 text-amber-300 shadow-xs"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={handleToggleLoop}
              aria-pressed={loop}
              aria-label="Toggle animation loop"
              title={loop ? "Looping enabled" : "Looping disabled"}
              data-testid="loop-toggle-btn"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                loop
                  ? "border-amber-500/70 bg-amber-500/20 text-amber-300"
                  : "border-stone-700 bg-stone-800/80 text-stone-400 hover:text-stone-200"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
            </button>

            {/* Reset / All Years */}
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset timeline to all years"
              title="Reset timeline (1836–2026)"
              data-testid="reset-timeline-btn"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-700 bg-stone-800/80 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Buffering Indicator */}
            {isBuffering && (
              <span
                role="status"
                aria-label="Buffering map tiles"
                data-testid="timeline-buffering-indicator"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/70 border border-amber-600/50 rounded-full animate-pulse shadow-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Buffering...
              </span>
            )}
          </div>

          {/* Center: Current Active Year Span & Era Badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-xs text-stone-400">Year:</span>
              <span className="text-base font-bold text-amber-400 tracking-tight">
                {yearMin}
              </span>
              <span className="text-xs text-stone-500">—</span>
              <span className="text-base font-bold text-amber-400 tracking-tight">
                {yearMax}
              </span>
            </div>
            <span
              className="hidden lg:inline-block max-w-[260px] truncate rounded-full border border-stone-700/80 bg-stone-800/60 px-2.5 py-0.5 text-[11px] font-medium text-stone-300"
              title={currentEra}
            >
              {currentEra}
            </span>
          </div>

          {/* Right: Visible Structure Counter Pill */}
          <div
            data-testid="visible-structure-count"
            className="flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-800/90 px-3 py-1 text-xs font-mono shadow-inner"
          >
            <Building2 className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-bold text-amber-300">{countDisplay}</span>
            <span className="text-stone-400 hidden sm:inline">structures</span>
          </div>
        </div>

        {/* Middle: Dual Range Slider Scrubber */}
        <div className="relative py-1.5 px-1">
          {/* Slider Rail Track */}
          <div className="relative h-2 w-full rounded-full bg-stone-700/70 overflow-hidden">
            {/* Active Range Fill */}
            <div
              data-testid="range-slider-fill"
              className={`absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 ${
                isPlaying && speed === "5x" ? "transition-none" : "transition-[width,left] duration-75"
              }`}
              style={{
                left: `${minPercent}%`,
                width: `${fillWidth}%`,
              }}
            />
          </div>

          {/* Start Year Range Input */}
          <input
            type="range"
            min={minBound}
            max={maxBound}
            value={yearMin}
            onChange={handleMinSliderChange}
            aria-label="Start year"
            className="absolute top-0 left-0 h-5 w-full appearance-none bg-transparent pointer-events-none cursor-pointer
              [&::-webkit-slider-thumb]:pointer-events-auto
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-amber-400
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-stone-950
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:pointer-events-auto
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-amber-400
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-stone-950
              [&::-moz-range-thumb]:shadow-md"
            style={{
              zIndex: yearMin > maxBound - 10 ? 25 : 20,
            }}
          />

          {/* End Year Range Input */}
          <input
            type="range"
            min={minBound}
            max={maxBound}
            value={yearMax}
            onChange={handleMaxSliderChange}
            aria-label="End year"
            className="absolute top-0 left-0 h-5 w-full appearance-none bg-transparent pointer-events-none cursor-pointer
              [&::-webkit-slider-thumb]:pointer-events-auto
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-amber-300
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-stone-950
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:pointer-events-auto
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-amber-300
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-stone-950
              [&::-moz-range-thumb]:shadow-md"
            style={{
              zIndex: 21,
            }}
          />

          {/* Century Milestone Markers */}
          <div className="mt-2.5 flex justify-between text-[10px] font-mono text-stone-500 select-none px-0.5">
            <span>1836</span>
            <span className="hidden sm:inline">1880</span>
            <span>1920</span>
            <span className="hidden sm:inline">1960</span>
            <span>2000</span>
            <span>2026</span>
          </div>
        </div>

        {/* Bottom: Era Shortcuts Row */}
        <EraShortcuts
          yearMin={yearMin}
          yearMax={yearMax}
          onSelectEra={handleYearRangeChange}
        />
      </div>
    </footer>
  );
};

export default TimelineBar;
