import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Landmark,
  CircleSlash,
  Info,
} from "lucide-react";
import { CONTRIBUTING_COLORS } from "../../utils/colorScales";

export type ContributingStatus =
  | "contributing"
  | "non-contributing"
  | "protected-landmark"
  | "landmark"
  | "outside";

export interface ContributingBadgeProps {
  /**
   * Explicit status or automatically resolved from contrib/designation
   */
  status?: ContributingStatus;
  /**
   * Parcel contributing flag: 1 = Contributing, 0 = Non-Contributing, -1 = Outside
   */
  contrib?: number | null;
  /**
   * Landmark designation: "PLM" (Protected Landmark) or "LM" (Landmark)
   */
  designation?: string | null;
  /**
   * Optional name of the historic district (e.g. "Houston Heights", "Downtown")
   */
  districtName?: string | null;
  /**
   * Optional custom CSS classes
   */
  className?: string;
  /**
   * Visual size of badge
   */
  size?: "sm" | "md" | "lg";
  /**
   * Whether to display the district name appended to the badge
   */
  showDistrict?: boolean;
}

/**
 * Resolves the ContributingStatus based on provided props.
 */
export function resolveContributingStatus({
  status,
  contrib,
  designation,
}: {
  status?: ContributingStatus;
  contrib?: number | null;
  designation?: string | null;
}): ContributingStatus {
  if (status) return status;
  if (designation === "PLM") return "protected-landmark";
  if (designation === "LM") return "landmark";
  if (contrib === 1) return "contributing";
  if (contrib === 0) return "non-contributing";
  return "outside";
}

interface StatusConfig {
  label: string;
  shortLabel: string;
  tooltip: string;
  colorHex: string;
  badgeClasses: string;
  dotClasses: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_CONFIG: Record<ContributingStatus, StatusConfig> = {
  contributing: {
    label: "Contributing Structure",
    shortLabel: "Contributing",
    tooltip:
      "Intact historic fabric in designated district: retains historic architectural integrity and character-defining features.",
    colorHex: CONTRIBUTING_COLORS.contributing,
    badgeClasses:
      "bg-emerald-950/80 border-emerald-500/60 text-emerald-200 shadow-emerald-950/40",
    dotClasses: "bg-emerald-400",
    icon: ShieldCheck,
  },
  "non-contributing": {
    label: "Non-Contributing Structure",
    shortLabel: "Non-Contributing",
    tooltip:
      "Altered or modern infill in designated district: does not contribute to the historic character of the district.",
    colorHex: CONTRIBUTING_COLORS.nonContributing,
    badgeClasses:
      "bg-amber-950/80 border-amber-500/60 text-amber-200 shadow-amber-950/40",
    dotClasses: "bg-amber-400",
    icon: AlertTriangle,
  },
  "protected-landmark": {
    label: "City Protected Landmark",
    shortLabel: "Protected Landmark",
    tooltip:
      "City Protected Landmark (PLM): highest level of municipal historic protection; demolition and major alterations prohibited.",
    colorHex: CONTRIBUTING_COLORS.protectedLandmark,
    badgeClasses:
      "bg-purple-950/80 border-purple-500/60 text-purple-200 shadow-purple-950/40",
    dotClasses: "bg-purple-400",
    icon: Landmark,
  },
  landmark: {
    label: "City Landmark",
    shortLabel: "Landmark",
    tooltip:
      "City Landmark (LM): officially recognized by Houston City Council; subject to 90-day demolition delay review.",
    colorHex: CONTRIBUTING_COLORS.landmark,
    badgeClasses:
      "bg-blue-950/80 border-blue-500/60 text-blue-200 shadow-blue-950/40",
    dotClasses: "bg-blue-400",
    icon: Landmark,
  },
  outside: {
    label: "Outside Historic District",
    shortLabel: "Outside District",
    tooltip:
      "Outside Historic District: property is located outside recognized municipal historic districts.",
    colorHex: CONTRIBUTING_COLORS.outside,
    badgeClasses:
      "bg-stone-800/90 border-stone-600/60 text-stone-300 shadow-stone-900/40",
    dotClasses: "bg-stone-400",
    icon: CircleSlash,
  },
};

export const ContributingBadge: React.FC<ContributingBadgeProps> = ({
  status,
  contrib,
  designation,
  districtName,
  className = "",
  size = "md",
  showDistrict = false,
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const resolvedStatus = resolveContributingStatus({
    status,
    contrib,
    designation,
  });
  const config = STATUS_CONFIG[resolvedStatus];
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  }[size];

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  }[size];

  return (
    <div
      className={`group relative inline-flex items-center rounded-full border shadow-sm select-none font-medium transition-colors ${config.badgeClasses} ${sizeClasses} ${className}`}
      role="status"
      aria-label={`${config.label}: ${config.tooltip}`}
      title={config.tooltip}
      data-testid="contributing-badge"
      data-status={resolvedStatus}
      tabIndex={0}
      onMouseEnter={() => setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
      onFocus={() => setIsTooltipOpen(true)}
      onBlur={() => setIsTooltipOpen(false)}
    >
      {/* Visual Dot / Icon */}
      <span className="relative flex items-center justify-center">
        <span
          className={`h-2 w-2 rounded-full ${config.dotClasses} animate-pulse`}
          style={{ animationDuration: "3s" }}
        />
      </span>

      <IconComponent className={`${iconSizes} opacity-85 flex-shrink-0`} />

      <span>{config.label}</span>

      {/* Optional District Name */}
      {showDistrict && districtName && (
        <span className="text-stone-300/80 font-normal pl-0.5 border-l border-current/20 ml-0.5">
          {districtName}
        </span>
      )}

      {/* Info Icon */}
      <Info
        className="w-3 h-3 opacity-60 hover:opacity-100 transition-opacity ml-0.5 cursor-pointer flex-shrink-0"
        aria-hidden="true"
      />

      {/* Accessible Hover / Focus Popover Tooltip */}
      <div
        role="tooltip"
        data-testid="contributing-tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-stone-900/95 border border-stone-700 p-2.5 text-xs text-stone-200 shadow-2xl z-50 backdrop-blur transition-all duration-150 ${
          isTooltipOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-1"
        }`}
      >
        <div className="flex items-center gap-1.5 font-semibold text-stone-100 mb-1 pb-1 border-b border-stone-800 text-[11px]">
          <span
            className="w-2 h-2 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: config.colorHex }}
          />
          <span className="text-stone-300 uppercase tracking-wider text-[10px]">
            Designation Info
          </span>
          {districtName && (
            <span className="text-amber-400 font-normal ml-auto text-[10px] truncate max-w-[120px]">
              {districtName}
            </span>
          )}
        </div>
        <div className="text-stone-300 leading-snug">{config.tooltip}</div>
        {/* Tooltip beak / arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-stone-700" />
      </div>
    </div>
  );
};

export default ContributingBadge;
