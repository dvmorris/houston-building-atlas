import React, { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Share2,
  Check,
  FileText,
  Flag,
  Building,
  Calendar,
  Layers,
  User,
  Hash,
  Compass,
} from "lucide-react";
import {
  ParcelProperties,
  LandmarkProperties,
  DistrictProperties,
} from "../Map/MapView";
import { ContributingBadge } from "./ContributingBadge";
import { getEraColor, getEraName } from "../../utils/colorScales";

export interface PropertyDrawerProps {
  /**
   * Selected parcel properties, if a parcel is selected
   */
  parcel?: ParcelProperties | null;
  /**
   * Selected landmark properties, if a landmark is selected
   */
  landmark?: LandmarkProperties | null;
  /**
   * Selected or parent historic district, if available
   */
  district?: DistrictProperties | null;
  /**
   * Generic unified property object (supports either parcel or landmark)
   */
  property?: (ParcelProperties & Partial<LandmarkProperties>) | (LandmarkProperties & Partial<ParcelProperties>) | null;
  /**
   * Controls drawer visibility
   */
  isOpen?: boolean;
  /**
   * Close callback
   */
  onClose: () => void;
  /**
   * Callback fired when clicking "Export Building Dossier" (Task 8 hook)
   */
  onExportDossier?: (
    property: ParcelProperties | LandmarkProperties
  ) => void;
  /**
   * Optional custom CSS class
   */
  className?: string;
}

/**
 * Common HCAD land use code definitions
 */
export const LAND_USE_DESCRIPTIONS: Record<string, string> = {
  RES: "Residential (RES)",
  COM: "Commercial (COM)",
  IND: "Industrial (IND)",
  CIV: "Civic / Institutional (CIV)",
  VAC: "Vacant Land (VAC)",
  PUB: "Public / Municipal (PUB)",
  REL: "Religious / Non-profit (REL)",
};

/**
 * Calculates building age and human-readable age text.
 */
export function calculateBuildingAge(
  year: number | string | null | undefined,
  currentYear = new Date().getFullYear()
): { age: number | null; label: string } {
  if (year === null || year === undefined) {
    return { age: null, label: "Year Built: Unknown" };
  }
  const yr = typeof year === "string" ? parseInt(year, 10) : year;
  if (isNaN(yr) || yr <= 0) {
    return { age: null, label: "Year Built: Unknown" };
  }

  const age = currentYear - yr;
  if (age < 0) {
    return { age, label: `Built ${yr}` };
  }
  if (age === 0) {
    return { age, label: `Built ${yr} • Under 1 year old` };
  }
  return {
    age,
    label: `Built ${yr} • ${age} ${age === 1 ? "year" : "years"} old`,
  };
}

/**
 * Formats a 13-digit HCAD account number with dashes (e.g. 001-002-000-0001).
 */
export function formatHcadAccountId(id: string | null | undefined): {
  raw: string;
  formatted: string;
  isValid13Digit: boolean;
} {
  if (!id) return { raw: "", formatted: "", isValid13Digit: false };
  const raw = String(id).trim();
  const digits = raw.replace(/\D/g, "");
  const isValid13Digit = digits.length === 13;
  if (isValid13Digit) {
    const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
    return { raw, formatted, isValid13Digit };
  }
  return { raw, formatted: raw, isValid13Digit: false };
}

/**
 * Generates deep link URL for sharing
 */
export function getPropertyDeepLink(id: string): string {
  if (typeof window === "undefined") {
    return `https://atlas.preservationhouston.org/?property=${encodeURIComponent(id)}`;
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("property", id);
    return url.toString();
  } catch {
    return `${window.location.origin}${window.location.pathname}?property=${encodeURIComponent(id)}`;
  }
}

export const PropertyDrawer: React.FC<PropertyDrawerProps> = ({
  parcel,
  landmark,
  district,
  property,
  isOpen,
  onClose,
  onExportDossier,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  // Normalize property source
  const activeParcel = parcel || (property && "use" in property ? (property as ParcelProperties) : null);
  const activeLandmark = landmark || (property && ("designation" in property || "architect" in property) ? (property as LandmarkProperties) : null);

  const activeData = activeParcel || activeLandmark || property;

  // Determine if drawer should show
  const shouldShow = isOpen !== undefined ? isOpen : Boolean(activeData);

  // Close on Escape key press
  useEffect(() => {
    if (!shouldShow) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldShow, onClose]);

  if (!shouldShow || !activeData) {
    return null;
  }

  const id = activeData.id || "";
  const address = activeData.addr || "Unknown Address";
  const yearBuilt = activeData.yr || 0;
  const builtAge = calculateBuildingAge(yearBuilt);
  const eraName = getEraName(yearBuilt);
  const eraColor = getEraColor(yearBuilt);

  // District name resolution
  const districtName =
    activeParcel?.dist ||
    district?.name ||
    (activeLandmark as any)?.dist ||
    null;

  // HCAD Account formatting
  const isHcadNumeric = /^\d+$/.test(id.replace(/\D/g, ""));
  const { raw: rawHcad, formatted: formattedHcad, isValid13Digit } = formatHcadAccountId(
    activeParcel?.id || (isHcadNumeric ? id : "")
  );

  // Land use formatting
  const rawLandUse = activeParcel?.use;
  const landUseDisplay = rawLandUse
    ? LAND_USE_DESCRIPTIONS[rawLandUse.toUpperCase()] || rawLandUse
    : null;

  // Stories formatting
  const stories = activeParcel?.st;
  const storiesDisplay =
    stories !== undefined && stories !== null
      ? `${stories} ${stories === 1 ? "Story" : "Stories"}`
      : null;

  // Owner Name
  const ownerName = activeParcel?.owner || (activeLandmark ? "Public / Recognized Landmark" : "Not Available");

  // HCAD Outbound URL
  const hcadUrl = rawHcad
    ? `https://hcad.org/property-search/account/${rawHcad}`
    : "https://hcad.org/property-search";

  // Share Property handler
  const handleShare = async () => {
    const deepLink = getPropertyDeepLink(id);
    const shareData = {
      title: `${address} - Preservation Houston Atlas`,
      text: `Historic property details for ${address} (${builtAge.label})`,
      url: deepLink,
    };

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(deepLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Fallback gracefully
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        data-testid="drawer-backdrop"
      />

      {/* Main Drawer Container: Floating Sidebar Panel on Desktop / Bottom Sheet on Mobile */}
      <section
        role="dialog"
        aria-label={`Property details for ${address}`}
        aria-modal="false"
        data-testid="property-drawer"
        className={`fixed z-40 bg-stone-900/95 text-stone-100 shadow-2xl backdrop-blur-md flex flex-col border-stone-800 transition-all duration-300 ease-in-out
          /* Mobile Bottom Sheet Layout: full width, anchors to bottom */
          inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl border-t
          /* Desktop Sidebar Layout: absolute within map container, never overlaps header or timeline bar */
          md:absolute md:inset-auto md:top-3 md:bottom-3 md:left-4 md:right-auto md:w-96 lg:w-[420px] md:max-h-none md:rounded-2xl md:border md:shadow-stone-950/80
          ${className}`}
      >
        {/* Mobile drag handle bar */}
        <div className="w-12 h-1.5 rounded-full bg-stone-700/80 mx-auto mt-2.5 mb-1 md:hidden flex-shrink-0" />

        {/* Header with Site Address & Close Button */}
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-stone-800/90 flex-shrink-0">
          <div className="min-w-0 flex-1">
            {/* If Landmark, show landmark title */}
            {activeLandmark?.name && (
              <div
                className="text-xs uppercase font-bold tracking-wider text-amber-400 mb-0.5 truncate flex items-center gap-1.5"
                data-testid="landmark-name"
              >
                <Building className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{activeLandmark.name}</span>
              </div>
            )}
            <h2
              data-testid="property-address"
              className="text-lg font-bold text-stone-100 tracking-tight leading-snug break-words"
            >
              {address}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            data-testid="drawer-close-btn"
            className="rounded-lg p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Scrollable Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
          {/* Prominent Year Built, Calculated Age & Era Tag */}
          <div className="rounded-xl bg-stone-800/60 border border-stone-700/60 p-3.5 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <span
                data-testid="property-built-age"
                className="text-sm font-semibold text-stone-100"
              >
                {builtAge.label}
              </span>
            </div>

            {/* Era Tag with Color Swatch */}
            <div
              data-testid="era-tag"
              className="inline-flex items-center gap-2 rounded-lg bg-stone-900/80 px-2.5 py-1 text-xs text-stone-200 border border-stone-700/70"
            >
              <span
                data-testid="era-color-swatch"
                className="w-3 h-3 rounded-full border border-stone-600/70 flex-shrink-0 shadow-inner"
                style={{ backgroundColor: eraColor }}
                aria-hidden="true"
              />
              <span className="font-medium">{eraName}</span>
            </div>
          </div>

          {/* Contributing Status Badge & Historic District */}
          <div className="rounded-xl bg-stone-800/40 border border-stone-700/50 p-3.5 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Historic Designation
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ContributingBadge
                contrib={activeParcel?.contrib}
                designation={activeLandmark?.designation}
                districtName={districtName}
                size="md"
              />
            </div>

            {districtName && (
              <div
                data-testid="district-info"
                className="text-xs text-stone-300 flex items-center gap-1.5 pt-1 border-t border-stone-700/40"
              >
                <Compass className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-stone-400">District:</span>
                <span className="font-medium text-amber-400">{districtName}</span>
              </div>
            )}
          </div>

          {/* Property Specifics: Owner, HCAD Account, Stories, Land Use */}
          <div className="rounded-xl bg-stone-800/40 border border-stone-700/50 p-3.5 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Property Records
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Owner Name */}
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-stone-400">Owner: </span>
                  <span
                    data-testid="property-owner"
                    className="font-medium text-stone-200 break-words"
                  >
                    {ownerName}
                  </span>
                </div>
              </div>

              {/* HCAD Account Number (13-digit) */}
              {(rawHcad || activeParcel) && (
                <div className="flex items-start gap-2">
                  <Hash className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-stone-400">HCAD Account: </span>
                    <span
                      data-testid="hcad-account-number"
                      className="font-mono font-semibold text-stone-100"
                    >
                      {isValid13Digit ? (
                        <>
                          <span>{formattedHcad}</span>
                          <span className="text-stone-500 font-normal ml-1">
                            ({rawHcad})
                          </span>
                        </>
                      ) : (
                        rawHcad || "Unassigned"
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Stories & Land Use */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-700/40">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[11px]">
                      Stories
                    </span>
                    <span
                      data-testid="property-stories"
                      className="font-medium text-stone-200"
                    >
                      {storiesDisplay || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                  <div>
                    <span className="text-stone-400 block text-[11px]">
                      Land Use
                    </span>
                    <span
                      data-testid="property-land-use"
                      className="font-medium text-stone-200 truncate block"
                    >
                      {landUseDisplay || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Landmark Architectural Notes (if landmark) */}
          {activeLandmark && (
            <div className="rounded-xl bg-stone-800/40 border border-stone-700/50 p-3.5 space-y-2 text-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Architectural History
              </div>
              {activeLandmark.architect && (
                <div>
                  <span className="text-stone-400">Architect: </span>
                  <span className="text-stone-200 font-medium">
                    {activeLandmark.architect}
                  </span>
                </div>
              )}
              {activeLandmark.style && (
                <div>
                  <span className="text-stone-400">Style: </span>
                  <span className="text-stone-200 font-medium">
                    {activeLandmark.style}
                  </span>
                </div>
              )}
              {activeLandmark.description && (
                <p className="text-stone-300 leading-relaxed text-[11px] pt-1 border-t border-stone-700/40">
                  {activeLandmark.description}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons Section */}
          <div className="space-y-2 pt-2">
            {/* Outbound Link: View Official HCAD Record */}
            <a
              href={hcadUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="hcad-link"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-medium py-2.5 px-4 text-xs border border-stone-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>View Official HCAD Record</span>
            </a>

            {/* Quick Action Grid: Share Property & Export Dossier */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleShare}
                data-testid="share-property-btn"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-medium py-2 px-3 text-xs border border-stone-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-stone-400" />
                    <span>Share Property</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onExportDossier?.(activeData)}
                data-testid="export-dossier-btn"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-medium py-2 px-3 text-xs border border-amber-500/40 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Dossier</span>
              </button>
            </div>

            {/* Outbound Link: Report Historic Info Feedback */}
            <a
              href="https://www.preservationhouston.org/atlas/feedback"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="feedback-link"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/40 py-1.5 px-3 text-[11px] transition-colors"
            >
              <Flag className="w-3 h-3 text-stone-500" />
              <span>Report Historic Info / Update</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default PropertyDrawer;
