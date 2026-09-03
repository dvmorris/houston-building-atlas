import { describe, it, expect } from "vitest";
import {
  getEraColor,
  getMapLibreColorExpression,
  getMapLibreYearFilterExpression,
  getEraName,
  COLOR_RAMP_9_INTERVALS,
  HISTORIC_ERAS,
  UNKNOWN_COLOR,
  CONTRIBUTING_COLORS,
} from "./colorScales";

describe("colorScales", () => {
  it("returns correct era color for 1895", () => {
    expect(getEraColor(1895)).toBe("#7f0000");
  });

  it("returns correct era color for 1925", () => {
    expect(getEraColor(1925)).toBe("#d7301f");
  });

  it("generates valid MapLibre step expression", () => {
    const expr = getMapLibreColorExpression();
    expect(expr[0]).toBe("step");
    expect(expr[1]).toEqual(["get", "yr"]);
    expect(expr[2]).toBe(UNKNOWN_COLOR);
  });

  it("handles unknown or invalid years gracefully", () => {
    expect(getEraColor(0)).toBe(UNKNOWN_COLOR);
    expect(getEraColor(-1)).toBe(UNKNOWN_COLOR);
    expect(getEraColor(null)).toBe(UNKNOWN_COLOR);
    expect(getEraColor(undefined)).toBe(UNKNOWN_COLOR);
    expect(getEraColor("invalid" as unknown as number)).toBe(UNKNOWN_COLOR);
  });

  it("parses string year inputs correctly", () => {
    expect(getEraColor("1895" as unknown as number)).toBe("#7f0000");
    expect(getEraColor("1925" as unknown as number)).toBe("#d7301f");
  });

  it("provides correct colors across the 9 intervals", () => {
    expect(getEraColor(1850)).toBe("#7f0000"); // < 1900
    expect(getEraColor(1905)).toBe("#b30000"); // 1900–1914
    expect(getEraColor(1920)).toBe("#d7301f"); // 1915–1929
    expect(getEraColor(1935)).toBe("#ef6548"); // 1930–1939
    expect(getEraColor(1945)).toBe("#fc8d59"); // 1940–1949
    expect(getEraColor(1955)).toBe("#fdbb84"); // 1950–1959
    expect(getEraColor(1965)).toBe("#fdd49e"); // 1960–1969
    expect(getEraColor(1980)).toBe("#fee8c8"); // 1970–1989
    expect(getEraColor(2010)).toBe("#fff7bc"); // 1990+
  });

  it("generates valid MapLibre year filter expression with custom opacities", () => {
    const expr = getMapLibreYearFilterExpression(1900, 1950);
    expect(expr).toEqual([
      "case",
      ["all", [">=", ["get", "yr"], 1900], ["<=", ["get", "yr"], 1950]],
      0.75,
      0.05,
    ]);

    const customExpr = getMapLibreYearFilterExpression(1880, 1920, 0.9, 0.1);
    expect(customExpr).toEqual([
      "case",
      ["all", [">=", ["get", "yr"], 1880], ["<=", ["get", "yr"], 1920]],
      0.9,
      0.1,
    ]);
  });

  it("returns appropriate era names", () => {
    expect(getEraName(1870)).toContain("Frontier");
    expect(getEraName(1895)).toContain("Victorian");
    expect(getEraName(1925)).toContain("1920s Boom");
    expect(getEraName(1936)).toContain("Art Deco");
    expect(getEraName(1955)).toContain("Mid-Century");
    expect(getEraName(1985)).toContain("Late 20th Century");
    expect(getEraName(2015)).toContain("Modern");
    expect(getEraName(0)).toBe("Unknown Era");
  });

  it("defines standard 9-interval ramp and historic eras", () => {
    expect(COLOR_RAMP_9_INTERVALS.length).toBe(9);
    expect(HISTORIC_ERAS.length).toBe(6);
    expect(CONTRIBUTING_COLORS.contributing).toBe("#16a34a");
    expect(CONTRIBUTING_COLORS.nonContributing).toBe("#d97706");
  });
});
