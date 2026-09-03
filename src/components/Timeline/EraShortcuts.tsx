/**
 * Preservation Houston Building Atlas - EraShortcuts Component
 *
 * Fast navigation shortcuts for the 5 definitive historic Houston eras:
 * 1. Republic & Frontier (1836 - 1879)
 * 2. Victorian & Railroad Boom (1880 - 1914)
 * 3. Oil Boom & Art Deco (1915 - 1939)
 * 4. Post-War Boom & Mid-Century (1945 - 1969)
 * 5. Modern Houston (1970 - 2026)
 */

import React from "react";

export interface HistoricEra {
  id: string;
  name: string;
  shortName: string;
  startYear: number;
  endYear: number;
  color: string;
  description: string;
}

export const HOUSTON_HISTORIC_ERAS: HistoricEra[] = [
  {
    id: "republic-frontier",
    name: "Republic & Frontier",
    shortName: "Republic",
    startYear: 1836,
    endYear: 1879,
    color: "#7f0000",
    description: "Founding through Reconstruction (1836–1879)",
  },
  {
    id: "victorian-railroad",
    name: "Victorian & Railroad Boom",
    shortName: "Victorian",
    startYear: 1880,
    endYear: 1914,
    color: "#b30000",
    description: "Gilded Age & Queen Anne expansion (1880–1914)",
  },
  {
    id: "oil-boom-art-deco",
    name: "Oil Boom & Art Deco",
    shortName: "Oil Boom",
    startYear: 1915,
    endYear: 1939,
    color: "#d7301f",
    description: "Ship Channel, Craftsman & Art Deco (1915–1939)",
  },
  {
    id: "post-war-mid-century",
    name: "Post-War Boom & Mid-Century",
    shortName: "Post-War",
    startYear: 1945,
    endYear: 1969,
    color: "#fc8d59",
    description: "Mid-Century Modern & Suburban Boom (1945–1969)",
  },
  {
    id: "modern-houston",
    name: "Modern Houston",
    shortName: "Modern",
    startYear: 1970,
    endYear: 2026,
    color: "#fee8c8",
    description: "Downtown Skyscrapers & Urban Infill (1970–2026)",
  },
];

export interface EraShortcutsProps {
  yearMin: number;
  yearMax: number;
  onSelectEra: (startYear: number, endYear: number) => void;
  className?: string;
}

export const EraShortcuts: React.FC<EraShortcutsProps> = ({
  yearMin,
  yearMax,
  onSelectEra,
  className = "",
}) => {
  return (
    <div
      role="group"
      aria-label="Historic era shortcuts"
      className={`flex flex-wrap items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mr-1 select-none hidden sm:inline">
        Eras:
      </span>
      {HOUSTON_HISTORIC_ERAS.map((era) => {
        const isActive =
          yearMin === era.startYear && yearMax === era.endYear;

        return (
          <button
            key={era.id}
            type="button"
            onClick={() => onSelectEra(era.startYear, era.endYear)}
            aria-pressed={isActive}
            title={`${era.name} (${era.startYear}–${era.endYear})`}
            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 border whitespace-nowrap cursor-pointer ${
              isActive
                ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm shadow-amber-950"
                : "bg-stone-800/80 hover:bg-stone-700/80 border-stone-700 text-stone-300 hover:text-stone-100"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ backgroundColor: era.color }}
              aria-hidden="true"
            />
            <span className="font-medium">
              <span className="hidden md:inline">{era.name}</span>
              <span className="md:hidden">{era.shortName}</span>
            </span>
            <span
              className={`text-[10px] font-mono transition-colors ${
                isActive ? "text-amber-200" : "text-stone-400"
              }`}
            >
              {era.startYear}–{era.endYear}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default EraShortcuts;
