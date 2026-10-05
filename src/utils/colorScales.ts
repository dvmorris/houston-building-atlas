/**
 * Preservation Houston Building Atlas - Cartographic Engine Color Scales
 *
 * Implements the 9-interval Preservation Houston YlOrRd ColorBrewer palette,
 * historic architectural era mapping, and MapLibre GL JS expressions for GPU-driven
 * real-time color styling and year filtering.
 */

import type { ExpressionSpecification } from "maplibre-gl";

export interface EraDefinition {
  id: string;
  name: string;
  shortName: string;
  startYear: number;
  endYear: number;
  color: string;
  description: string;
}

export interface ColorInterval {
  minYear: number;
  maxYear: number;
  color: string;
  label: string;
}

/**
 * Neutral light gray for unknown, vacant, or unrecorded build dates.
 */
export const UNKNOWN_COLOR = "#e0e0e0";

/**
 * 6 Main Architectural & Historical Eras for Houston, aligned with
 * preservation guidelines and timeline filtering.
 */
export const HISTORIC_ERAS: EraDefinition[] = [
  {
    id: "republic-frontier",
    name: "Republic of Texas & Frontier",
    shortName: "Frontier",
    startYear: 1836,
    endYear: 1879,
    color: "#7f0000",
    description: "Houston founding, Republic of Texas, early settlement, Greek Revival, and vernacular structures.",
  },
  {
    id: "victorian-railroad",
    name: "Victorian & Railroad Boom",
    shortName: "Victorian",
    startYear: 1880,
    endYear: 1914,
    color: "#7f0000",
    description: "Gilded age, Queen Anne, Italianate, Victorian commercial storefronts, and early rail connectivity.",
  },
  {
    id: "oil-boom-art-deco",
    name: "Oil Boom & 1920s Expansion",
    shortName: "1920s Boom",
    startYear: 1915,
    endYear: 1929,
    color: "#d7301f",
    description: "Spindletop expansion, Houston Ship Channel, Craftsman bungalows, and monumental masonry.",
  },
  {
    id: "art-deco-depression",
    name: "Art Deco & New Deal",
    shortName: "Art Deco",
    startYear: 1930,
    endYear: 1949,
    color: "#fc8d59",
    description: "Art Deco, Streamline Moderne, PWA/WPA civic landmarks, and WWII-era infill.",
  },
  {
    id: "mid-century-post-war",
    name: "Mid-Century Modern & Post-War Growth",
    shortName: "Mid-Century",
    startYear: 1950,
    endYear: 1969,
    color: "#fdd49e",
    description: "Ranch estates, suburban master-planned developments, and mid-century modern civic centers.",
  },
  {
    id: "late-20th-modern",
    name: "Late 20th Century & Modern Infill",
    shortName: "Modern",
    startYear: 1970,
    endYear: 2026,
    color: "#fee8c8",
    description: "Downtown skyscraper boom, postmodern architecture, urban renewal, and modern infill.",
  },
];

/**
 * 9-interval Preservation Houston YlOrRd ColorBrewer scale.
 * Ranging from darkest brick red (#7f0000) for oldest structures
 * to pale yellow (#fff7bc) for modern infill.
 */
export const COLOR_RAMP_9_INTERVALS: ColorInterval[] = [
  { minYear: 1, maxYear: 1899, color: "#7f0000", label: "Pre-1900" },
  { minYear: 1900, maxYear: 1914, color: "#b30000", label: "1900–1914" },
  { minYear: 1915, maxYear: 1929, color: "#d7301f", label: "1915–1929" },
  { minYear: 1930, maxYear: 1939, color: "#ef6548", label: "1930–1939" },
  { minYear: 1940, maxYear: 1949, color: "#fc8d59", label: "1940–1949" },
  { minYear: 1950, maxYear: 1959, color: "#fdbb84", label: "1950–1959" },
  { minYear: 1960, maxYear: 1969, color: "#fdd49e", label: "1960–1969" },
  { minYear: 1970, maxYear: 1989, color: "#fee8c8", label: "1970–1989" },
  { minYear: 1990, maxYear: 2099, color: "#fff7bc", label: "1990–Present" },
];

/**
 * Visual badge colors for historic designation and contributing status.
 */
export const CONTRIBUTING_COLORS = {
  contributing: "#16a34a",       // Emerald / Green (Architectural Integrity)
  nonContributing: "#d97706",    // Amber / Orange (Altered / Modern Infill)
  outside: "#9ca3af",            // Neutral Gray (Outside Historic District)
  landmark: "#2563eb",           // Blue (City Landmark - LM)
  protectedLandmark: "#7c3aed",  // Royal Purple (Protected Landmark - PLM)
} as const;

/**
 * Resolves the color of an architectural era or parcel year.
 * Ensures any valid year yr > 0 && yr < 1900 maps to #7f0000 (Pre-1900)
 * rather than unknown gray.
 * Consistent with the MapLibre GPU step shader.
 */
export function getEraColor(year: number | string | null | undefined): string {
  if (year === null || year === undefined) return UNKNOWN_COLOR;
  const yr = typeof year === "string" ? parseFloat(year) : year;
  if (isNaN(yr) || yr <= 0) {
    return UNKNOWN_COLOR;
  }

  if (yr < 1900) {
    return "#7f0000";
  }

  for (const interval of COLOR_RAMP_9_INTERVALS) {
    if (yr >= interval.minYear && yr <= interval.maxYear) {
      return interval.color;
    }
  }

  // Fallback for years past the last interval max
  return COLOR_RAMP_9_INTERVALS[COLOR_RAMP_9_INTERVALS.length - 1].color;
}

/**
 * Returns a human-friendly architectural era name for a given year built.
 */
export function getEraName(year: number | string | null | undefined): string {
  if (year === null || year === undefined) return "Unknown Era";
  const yr = typeof year === "string" ? parseFloat(year) : year;
  if (isNaN(yr) || yr <= 0) return "Unknown Era";

  if (yr < 1880) return "Republic of Texas & Frontier (1836–1879)";
  if (yr <= 1914) return "Victorian & Railroad Boom (1880–1914)";
  if (yr <= 1929) return "Oil Boom & 1920s Boom (1915–1929)";
  if (yr <= 1949) return "Art Deco & New Deal (1930–1949)";
  if (yr <= 1969) return "Mid-Century Modern & Post-War (1950–1969)";
  if (yr <= 1989) return "Late 20th Century (1970–1989)";
  return "Modern & Contemporary Infill (1990–Present)";
}

/**
 * Generates a MapLibre GL JS step expression for parcel fill color.
 * The GPU evaluates this instantly across millions of vertices without CPU overhead.
 *
 * Syntax: ["step", ["get", "yr"], default_color, stop1, color1, stop2, color2, ...]
 */
export function getMapLibreColorExpression(): ExpressionSpecification {
  return [
    "step",
    ["get", "yr"],
    UNKNOWN_COLOR,
    1, "#7f0000",
    1900, "#b30000",
    1915, "#d7301f",
    1930, "#ef6548",
    1940, "#fc8d59",
    1950, "#fdbb84",
    1960, "#fdd49e",
    1970, "#fee8c8",
    1990, "#fff7bc",
  ];
}

/**
 * Generates a dynamic MapLibre GL JS GPU expression for parcel opacity year filtering.
 * Filtering happens directly inside the fragment shader, enabling 60fps animations
 * and scrubber interactions without querying the network or rebuilding vector buffers.
 *
 * Syntax:
 * [
 *   "case",
 *   ["all", [">=", ["get", "yr"], minYear], ["<=", ["get", "yr"], maxYear]],
 *   activeOpacity,
 *   inactiveOpacity
 * ]
 */
export function getMapLibreYearFilterExpression(
  minYear: number,
  maxYear: number,
  activeOpacity = 0.75,
  inactiveOpacity = 0
): ExpressionSpecification {
  return [
    "case",
    ["all", [">=", ["get", "yr"], minYear], ["<=", ["get", "yr"], maxYear]],
    activeOpacity,
    inactiveOpacity,
  ];
}
