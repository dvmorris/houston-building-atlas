import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronsLeftRight,
  X,
  Layers,
  History,
} from "lucide-react";
import {
  HISTORIC_LAYERS,
  DEFAULT_HISTORIC_LAYER_ID,
  getHistoricLayer,
  HistoricMapLayer,
} from "../../utils/historicLayers";

export interface HistoricSwipeProps {
  /**
   * Current split position percentage from 0 to 100 (default: 50)
   */
  position?: number;
  /**
   * Callback fired when split position changes
   */
  onPositionChange: (position: number) => void;
  /**
   * Callback fired when toggle/close button is clicked
   */
  onToggle?: (active: boolean) => void;
  /**
   * Currently active historic layer ID (e.g. 'usgs-1915', 'sanborn-1924')
   */
  layerId?: string;
  /**
   * Callback fired when user selects a different historic layer
   */
  onLayerChange?: (layerId: string) => void;
  /**
   * Custom label for the left side (default: "Modern")
   */
  leftLabel?: string;
  /**
   * Custom label for the right side (default: "1915 Historic")
   */
  rightLabel?: string;
  /**
   * Optional container ref for bounding rect calculation
   */
  containerRef?: React.RefObject<HTMLElement | null>;
  /**
   * Additional CSS class name
   */
  className?: string;
}

/**
 * Returns CSS clip-path string for the historic overlay based on swipe position.
 * The right side (position% to 100%) displays the historic map.
 */
export function getHistoricClipPath(position: number): string {
  const clamped = Math.max(0, Math.min(100, position));
  return `polygon(${clamped}% 0, 100% 0, 100% 100%, ${clamped}% 100%)`;
}

export const HistoricSwipe: React.FC<HistoricSwipeProps> = ({
  position = 50,
  onPositionChange,
  onToggle,
  layerId = DEFAULT_HISTORIC_LAYER_ID,
  onLayerChange,
  leftLabel = "Modern",
  rightLabel,
  containerRef,
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);
  const layerMenuRef = useRef<HTMLDivElement>(null);
  const layerBtnRef = useRef<HTMLButtonElement>(null);

  // Close layer menu on click-outside or Escape key
  useEffect(() => {
    if (!isLayerMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLayerMenuOpen(false);
        layerBtnRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        layerMenuRef.current &&
        !layerMenuRef.current.contains(target) &&
        layerBtnRef.current &&
        !layerBtnRef.current.contains(target)
      ) {
        setIsLayerMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isLayerMenuOpen]);

  // Clamp position between 0 and 100
  const clampedPosition = Math.max(0, Math.min(100, Number(position) || 0));

  const activeLayer = getHistoricLayer(layerId);
  const displayRightLabel =
    rightLabel || (activeLayer.year === 1915 ? "1915 Historic" : activeLayer.shortName);

  // Calculate new position from viewport clientX
  const updatePositionFromClientX = useCallback(
    (clientX: number) => {
      let rect: DOMRect | null = null;

      if (containerRef?.current) {
        rect = containerRef.current.getBoundingClientRect();
      } else if (dividerRef.current?.parentElement) {
        rect = dividerRef.current.parentElement.getBoundingClientRect();
      }

      if (!rect || rect.width === 0) {
        // Fallback to window width
        const pct = (clientX / window.innerWidth) * 100;
        const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
        onPositionChange(clamped);
        return;
      }

      const offsetX = clientX - rect.left;
      const pct = (offsetX / rect.width) * 100;
      const clamped = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
      onPositionChange(clamped);
    },
    [containerRef, onPositionChange]
  );

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePositionFromClientX(e.clientX);
  };

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      updatePositionFromClientX(e.touches[0].clientX);
    }
  };

  // Global mousemove/mouseup and touchmove/touchend listeners during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updatePositionFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePositionFromClientX(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDragging, updatePositionFromClientX]);

  // Accessible keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        onPositionChange(Math.max(0, clampedPosition - step));
        break;
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        onPositionChange(Math.min(100, clampedPosition + step));
        break;
      case "Home":
        e.preventDefault();
        onPositionChange(0);
        break;
      case "End":
        e.preventDefault();
        onPositionChange(100);
        break;
      case "r":
      case "R":
        e.preventDefault();
        onPositionChange(50);
        break;
    }
  };

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-20 overflow-hidden ${className}`}
      data-testid="historic-swipe-wrapper"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-stone-900/90 border border-stone-700/80 rounded-full px-3 py-1.5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-xs text-stone-200 font-medium">
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Historic Swipe Comparison</span>
        </div>

        {/* Layer Selector Dropdown Toggle */}
        <div className="relative">
          <button
            ref={layerBtnRef}
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 transition-colors"
            aria-label="Select historic map layer"
            aria-expanded={isLayerMenuOpen}
            data-testid="historic-layer-select-btn"
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span>{activeLayer.shortName}</span>
          </button>

          {isLayerMenuOpen && (
            <div
              ref={layerMenuRef}
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl py-1 z-40"
              data-testid="historic-layer-menu"
            >
              <div className="px-3 py-1.5 border-b border-stone-800 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Choose Historic Layer
              </div>
              {HISTORIC_LAYERS.map((layer: HistoricMapLayer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => {
                    onLayerChange?.(layer.id);
                    setIsLayerMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col gap-0.5 ${
                    layer.id === activeLayer.id
                      ? "bg-amber-500/15 text-amber-300 font-medium"
                      : "text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                  }`}
                  data-testid={`historic-layer-option-${layer.id}`}
                >
                  <span className="font-semibold">{layer.name}</span>
                  <span className="text-[10px] text-stone-400 line-clamp-1">
                    {layer.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Close comparison mode */}
        {onToggle && (
          <button
            type="button"
            onClick={() => onToggle(false)}
            aria-label="Close historic swipe"
            data-testid="historic-swipe-close-btn"
            className="p-1 rounded-full text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Side Badges (hidden on narrow mobile to avoid colliding with center toolbar) */}
      <div
        className="hidden sm:block absolute top-4 left-4 z-10 pointer-events-none bg-stone-900/90 border border-stone-700/80 rounded-md px-2.5 py-1 text-xs font-semibold text-stone-200 shadow-lg backdrop-blur-sm"
        data-testid="historic-swipe-left-label"
      >
        {leftLabel}
      </div>

      <div
        className="hidden sm:block absolute top-4 right-4 z-10 pointer-events-none bg-amber-950/90 border border-amber-600/70 rounded-md px-2.5 py-1 text-xs font-semibold text-amber-200 shadow-lg backdrop-blur-sm"
        data-testid="historic-swipe-right-label"
      >
        {displayRightLabel}
      </div>

      {/* Draggable Vertical Divider Bar */}
      <div
        ref={dividerRef}
        role="slider"
        aria-label="Map comparison swipe divider"
        aria-valuenow={Math.round(clampedPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${Math.round(clampedPosition)}% modern, ${
          100 - Math.round(clampedPosition)
        }% historic`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={`absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize select-none touch-none focus:outline-none group ${
          isDragging ? "cursor-grabbing" : ""
        }`}
        style={{
          left: `${clampedPosition}%`,
          transform: "translateX(-50%)",
          width: "36px", // Generous touch/mouse target area
        }}
        data-testid="historic-swipe-divider"
      >
        {/* Visible vertical divider line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />

        {/* Circular Drag Handle */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-stone-900 border-2 border-amber-400 text-amber-300 shadow-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-focus:ring-2 group-focus:ring-amber-400 group-focus:ring-offset-2 group-focus:ring-offset-stone-900 ${
            isDragging ? "scale-110 ring-2 ring-amber-400" : ""
          }`}
          data-testid="historic-swipe-handle"
        >
          <ChevronsLeftRight className="w-4 h-4 text-amber-300" />
        </div>
      </div>
    </div>
  );
};

export default HistoricSwipe;
