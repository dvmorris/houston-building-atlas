/**
 * Preservation Houston Building Atlas - Historic Building Dossier Modal
 *
 * Single-page (8.5" x 11" Letter) printable dossier sheet and preview modal.
 * Provides on-screen preview with Print / Save PDF and Close actions,
 * keyboard accessibility, and media print optimization.
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  Compass,
  Building,
  ShieldCheck,
  AlertTriangle,
  Landmark,
  ExternalLink,
  Edit3,
  Calendar,
  User,
  Hash,
  Layers,
  MapPin,
} from "lucide-react";
import {
  ParcelProperties,
  LandmarkProperties,
  DistrictProperties,
} from "../Map/MapView";
import {
  prepareDossierData,
  triggerPrint,
  generateQrMatrix,
  DOSSIER_PRINT_CSS,
  DossierData,
} from "../../utils/printDossier";

export interface DossierModalProps {
  /**
   * Property to render in the dossier (parcel, landmark, or unified)
   */
  property:
    | ParcelProperties
    | LandmarkProperties
    | (ParcelProperties & Partial<LandmarkProperties>)
    | (LandmarkProperties & Partial<ParcelProperties>)
    | null;
  /**
   * Historic district metadata, if available
   */
  district?: DistrictProperties | null;
  /**
   * Whether the modal is currently open
   */
  isOpen: boolean;
  /**
   * Close callback
   */
  onClose: () => void;
  /**
   * Optional custom thumbnail or map screenshot URL
   */
  mapScreenshotUrl?: string;
  /**
   * Optional callback when print is triggered
   */
  onPrint?: () => void;
  /**
   * Optional custom CSS classes
   */
  className?: string;
}

/**
 * Renders a crisp SVG QR code matrix from a 21x21 boolean grid.
 */
export const QrCodeSvg: React.FC<{
  url: string;
  size?: number;
  label?: string;
}> = ({ url, size = 80, label = "QR Code" }) => {
  const matrix = React.useMemo(() => generateQrMatrix(url), [url]);
  const matrixSize = matrix.length;
  const padding = 2;
  const totalSize = matrixSize + padding * 2;

  return (
    <svg
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      width={size}
      height={size}
      aria-label={label}
      role="img"
      shapeRendering="crispEdges"
      className="bg-white p-0.5 rounded border border-stone-300 flex-shrink-0"
    >
      <rect width={totalSize} height={totalSize} fill="#ffffff" />
      {matrix.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect
              key={`${r}-${c}`}
              x={c + padding}
              y={r + padding}
              width="1"
              height="1"
              fill="#1c1917"
            />
          ) : null
        )
      )}
    </svg>
  );
};

/**
 * Renders an architectural vector site plan & footprint mini-map.
 */
export const SiteFootprintVectorMap: React.FC<{
  address: string;
  stories?: number | null;
  eraColor?: string;
}> = ({ address, stories, eraColor = "#d97706" }) => {
  // Extract simple street name from address
  const streetName = address
    ? address.replace(/^\d+\s+/, "").toUpperCase()
    : "PUBLIC RIGHT-OF-WAY";

  return (
    <div
      data-testid="dossier-minimap"
      className="relative w-full h-44 bg-stone-50 border border-stone-300 rounded overflow-hidden flex flex-col items-center justify-center select-none"
    >
      <svg
        viewBox="0 0 340 180"
        className="w-full h-full"
        aria-label="Building footprint and parcel boundary diagram"
      >
        <defs>
          <pattern
            id="siteGrid"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="0.75"
            />
          </pattern>
        </defs>

        {/* Blueprint background grid */}
        <rect width="340" height="180" fill="url(#siteGrid)" />

        {/* Adjacent Parcels / Lot lines (dashed) */}
        <line
          x1="25"
          y1="10"
          x2="25"
          y2="135"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <line
          x1="315"
          y1="10"
          x2="315"
          y2="135"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Surveyed Property Parcel Boundary */}
        <rect
          x="35"
          y="15"
          width="270"
          height="120"
          fill="#ffffff"
          stroke="#78716c"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Building Footprint Polygon */}
        <rect
          x="90"
          y="35"
          width="160"
          height="75"
          fill="#fef3c7"
          stroke={eraColor}
          strokeWidth="2"
          className="shadow-sm"
        />

        {/* Front Porch / Architectural Bay Portico */}
        <rect
          x="125"
          y="110"
          width="90"
          height="14"
          fill="#ffffff"
          stroke={eraColor}
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <text
          x="170"
          y="120"
          textAnchor="middle"
          fontSize="7.5"
          fill="#78716c"
          fontWeight="bold"
        >
          PORCH
        </text>

        {/* Building Footprint Label */}
        <text
          x="170"
          y="70"
          textAnchor="middle"
          fontSize="9.5"
          fontWeight="bold"
          fill="#78350f"
        >
          HISTORIC FOOTPRINT
        </text>
        <text
          x="170"
          y="83"
          textAnchor="middle"
          fontSize="8"
          fill="#92400e"
        >
          {stories ? `${stories}-Story Structure` : "Primary Structure"}
        </text>

        {/* Setback dimension lines */}
        <line
          x1="60"
          y1="35"
          x2="60"
          y2="110"
          stroke="#94a3b8"
          strokeWidth="0.75"
          markerEnd="arrow"
        />
        <text
          x="55"
          y="75"
          textAnchor="middle"
          fontSize="7"
          fill="#64748b"
          transform="rotate(-90 55 75)"
        >
          LOT DEPTH: 100 FT
        </text>

        {/* Street Frontage Corridor */}
        <rect x="0" y="135" width="340" height="45" fill="#f1f5f9" />
        <line
          x1="0"
          y1="135"
          x2="340"
          y2="135"
          stroke="#94a3b8"
          strokeWidth="1.5"
        />
        <line
          x1="0"
          y1="158"
          x2="340"
          y2="158"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <text
          x="170"
          y="152"
          textAnchor="middle"
          fontSize="8.5"
          fontWeight="bold"
          fill="#475569"
          letterSpacing="1"
        >
          {streetName}
        </text>

        {/* Compass North Indicator (Upper Right) */}
        <g transform="translate(305, 30)">
          <circle cx="0" cy="0" r="13" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="0,-10 3,1 0,3 -3,1" fill="#b45309" />
          <polygon points="0,10 3,-1 0,-3 -3,-1" fill="#cbd5e1" />
          <text
            x="0"
            y="-12"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="#b45309"
          >
            N
          </text>
        </g>

        {/* Scale Bar (Bottom Right) */}
        <g transform="translate(245, 172)">
          <rect x="0" y="0" width="40" height="3" fill="#64748b" />
          <rect x="40" y="0" width="40" height="3" fill="#cbd5e1" />
          <text x="0" y="-2" fontSize="6.5" fill="#64748b">0</text>
          <text x="40" y="-2" fontSize="6.5" fill="#64748b">25</text>
          <text x="80" y="-2" fontSize="6.5" fill="#64748b">50 FT</text>
        </g>

        {/* Site Plan Title Badge (Upper Left) */}
        <rect
          x="8"
          y="8"
          width="100"
          height="15"
          rx="2"
          fill="#ffffff"
          stroke="#cbd5e1"
        />
        <text
          x="12"
          y="18.5"
          fontSize="7"
          fontWeight="bold"
          fill="#475569"
        >
          SITE PLAN & FOOTPRINT
        </text>
      </svg>
    </div>
  );
};

export const DossierModal: React.FC<DossierModalProps> = ({
  property,
  district,
  isOpen,
  onClose,
  mapScreenshotUrl,
  onPrint,
  className = "",
}) => {
  const [customNotes, setCustomNotes] = useState<string>("");

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !property) {
    return null;
  }

  const dossierData: DossierData = prepareDossierData(property, district, {
    customNotes,
  });

  const handlePrint = () => {
    if (onPrint) onPrint();
    triggerPrint();
  };

  // Status icon selector
  const StatusIcon =
    dossierData.contributingStatus === "contributing"
      ? ShieldCheck
      : dossierData.contributingStatus === "non-contributing"
      ? AlertTriangle
      : Landmark;

  // Status badge styling in print sheet
  const statusBadgeStyle = {
    contributing: "bg-emerald-100 text-emerald-900 border-emerald-400",
    "non-contributing": "bg-amber-100 text-amber-900 border-amber-400",
    "protected-landmark": "bg-purple-100 text-purple-900 border-purple-400",
    landmark: "bg-blue-100 text-blue-900 border-blue-400",
    outside: "bg-stone-200 text-stone-800 border-stone-400",
  }[dossierData.contributingStatus];

  return (
    <>
      {/* Inject single-page media print styles */}
      <style>{DOSSIER_PRINT_CSS}</style>

      {/* Screen Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 transition-opacity no-print"
        onClick={onClose}
        data-testid="dossier-backdrop"
        aria-hidden="true"
      />

      {/* Modal Dialog Window Container */}
      <div className="fixed inset-0 z-50 no-print flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Historic Building Dossier for ${dossierData.address}`}
          data-testid="dossier-modal"
          className={`relative w-full max-w-4xl bg-stone-900 border border-stone-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] pointer-events-auto ${className}`}
        >
          {/* Modal Header Toolbar (Hidden during print) */}
          <header className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-stone-900/95 flex-shrink-0 no-print">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-100">
                  Historic Building Dossier Preview
                </h3>
                <p className="text-[11px] text-stone-400">
                  Formatted for 8.5" x 11" Letter Sheet • Single-Page Preservation Export
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Print / Save PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                data-testid="print-dossier-btn"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                data-testid="close-dossier-btn"
                aria-label="Close dossier modal"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-950/60 custom-scrollbar">
            {/* 8.5" x 11" Single-Page Letter Printable Sheet */}
            <article
              id="printable-dossier"
              data-testid="printable-dossier"
              className="bg-white text-stone-900 mx-auto w-full max-w-[816px] p-6 sm:p-8 rounded-sm shadow-2xl border border-stone-200 text-xs leading-normal"
              style={{ minHeight: "1056px", boxSizing: "border-box" }}
            >
              {/* ========================================================= */}
              {/* 1. Official Preservation Houston Letterhead & Logo Mark */}
              {/* ========================================================= */}
              <header className="border-b-2 border-stone-900 pb-3 mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Compass Brand Mark */}
                    <div className="w-12 h-12 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Compass className="w-7 h-7 transform rotate-12" />
                    </div>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-stone-950 uppercase font-serif">
                        Preservation Houston
                      </h1>
                      <p className="text-[11px] font-semibold tracking-wider text-amber-800 uppercase">
                        Houston's Only Citywide Historic Preservation Organization • Founded 1978
                      </p>
                      <p className="text-[9.5px] text-stone-600">
                        3272 Westheimer Rd, Suite 102 • Houston, TX 77098 • (713) 510-3990 • www.preservationhouston.org
                      </p>
                    </div>
                  </div>

                  {/* Document Archive Reference */}
                  <div className="text-right flex-shrink-0">
                    <span className="inline-block bg-stone-900 text-stone-100 font-mono text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      HISTORIC BUILDING DOSSIER
                    </span>
                    <div className="text-[9.5px] font-mono text-stone-600 mt-1">
                      {dossierData.documentRefId}
                    </div>
                    <div className="text-[9.5px] text-stone-500 font-medium">
                      Date: {dossierData.formattedDate}
                    </div>
                  </div>
                </div>
              </header>

              {/* ========================================================= */}
              {/* 2. Primary Subject Header: Address, Built Year, Age, Era */}
              {/* ========================================================= */}
              <section className="bg-stone-50 border border-stone-300 rounded p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {dossierData.landmarkDetails?.name && (
                      <div
                        data-testid="dossier-landmark-name"
                        className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-0.5"
                      >
                        <Building className="w-3.5 h-3.5 text-amber-700" />
                        <span>{dossierData.landmarkDetails.name}</span>
                      </div>
                    )}
                    <h2
                      data-testid="dossier-address"
                      className="text-xl font-black text-stone-950 tracking-tight font-serif"
                    >
                      {dossierData.address}
                    </h2>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {/* Year Built & Calculated Age */}
                      <span
                        data-testid="dossier-built-age"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-800"
                      >
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>{dossierData.ageLabel}</span>
                      </span>

                      {/* Era Tag with Color Swatch */}
                      <span
                        data-testid="dossier-era-tag"
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-white px-2 py-0.5 rounded border border-stone-300 text-stone-800"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-stone-400"
                          style={{ backgroundColor: dossierData.eraColor }}
                          aria-hidden="true"
                        />
                        <span>{dossierData.eraName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Historic District & Contributing Badge */}
                  <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1.5 flex-shrink-0">
                    <span
                      data-testid="dossier-contributing-status"
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm ${statusBadgeStyle}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{dossierData.contributingLabel}</span>
                    </span>

                    {dossierData.districtDisplayName && (
                      <div
                        data-testid="dossier-district"
                        className="text-xs font-semibold text-stone-700 flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3 text-amber-700" />
                        <span>{dossierData.districtDisplayName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ========================================================= */}
              {/* 3. Historic Designation Explanation & Legal Protections  */}
              {/* ========================================================= */}
              <section className="border border-stone-300 rounded p-3 mb-4 bg-amber-50/40">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
                  <span>Historic Designation & Legal Preservation Framework</span>
                </div>
                <p className="text-stone-800 text-[11px] leading-relaxed mb-1 font-medium">
                  {dossierData.contributingDescription}
                </p>
                <p
                  data-testid="dossier-legal-context"
                  className="text-stone-600 text-[10px] leading-relaxed italic"
                >
                  {dossierData.legalContext}
                </p>
              </section>

              {/* ========================================================= */}
              {/* 4. Core Grid: Official Records + Footprint Mini-Map       */}
              {/* ========================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Column A: Property Records & Architectural Metadata */}
                <div className="border border-stone-300 rounded p-3 bg-white flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-stone-700 pb-1 mb-2 border-b border-stone-200">
                      Harris County & Property Records
                    </div>

                    <dl className="grid grid-cols-1 gap-1.5 text-[11px]">
                      {/* Owner */}
                      <div className="flex items-start gap-1.5">
                        <User className="w-3.5 h-3.5 text-stone-500 mt-0.5 flex-shrink-0" />
                        <dt className="text-stone-500 min-w-[70px]">Owner:</dt>
                        <dd
                          data-testid="dossier-owner"
                          className="font-semibold text-stone-900 break-words flex-1"
                        >
                          {dossierData.owner}
                        </dd>
                      </div>

                      {/* 13-Digit HCAD Account */}
                      <div className="flex items-start gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-stone-500 mt-0.5 flex-shrink-0" />
                        <dt className="text-stone-500 min-w-[70px]">HCAD Acct:</dt>
                        <dd
                          data-testid="dossier-hcad-account"
                          className="font-mono font-bold text-stone-900 flex-1"
                        >
                          {dossierData.hcadAccount.isValid13Digit ? (
                            <>
                              <span>{dossierData.hcadAccount.formatted}</span>
                              <span className="text-stone-500 font-normal ml-1 text-[10px]">
                                ({dossierData.hcadAccount.raw})
                              </span>
                            </>
                          ) : (
                            dossierData.hcadAccount.raw || "Unassigned"
                          )}
                        </dd>
                      </div>

                      {/* Land Use */}
                      <div className="flex items-start gap-1.5">
                        <Building className="w-3.5 h-3.5 text-stone-500 mt-0.5 flex-shrink-0" />
                        <dt className="text-stone-500 min-w-[70px]">Land Use:</dt>
                        <dd
                          data-testid="dossier-land-use"
                          className="font-medium text-stone-900 flex-1"
                        >
                          {dossierData.landUseDisplay || "Residential (RES)"}
                        </dd>
                      </div>

                      {/* Stories */}
                      <div className="flex items-start gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-stone-500 mt-0.5 flex-shrink-0" />
                        <dt className="text-stone-500 min-w-[70px]">Height:</dt>
                        <dd
                          data-testid="dossier-stories"
                          className="font-medium text-stone-900 flex-1"
                        >
                          {dossierData.storiesDisplay || "1 Story"}
                        </dd>
                      </div>

                      {/* Landmark Specific Details (if landmark) */}
                      {dossierData.landmarkDetails && (
                        <div className="pt-2 mt-1 border-t border-stone-200 space-y-1 text-[10.5px]">
                          {dossierData.landmarkDetails.architect && (
                            <div className="flex items-start gap-1.5">
                              <dt className="text-stone-500 min-w-[70px]">Architect:</dt>
                              <dd
                                data-testid="dossier-architect"
                                className="font-semibold text-amber-900 flex-1"
                              >
                                {dossierData.landmarkDetails.architect}
                              </dd>
                            </div>
                          )}
                          {dossierData.landmarkDetails.style && (
                            <div className="flex items-start gap-1.5">
                              <dt className="text-stone-500 min-w-[70px]">Style:</dt>
                              <dd
                                data-testid="dossier-style"
                                className="font-semibold text-stone-800 flex-1"
                              >
                                {dossierData.landmarkDetails.style}
                              </dd>
                            </div>
                          )}
                          {dossierData.landmarkDetails.designationFull && (
                            <div className="flex items-start gap-1.5">
                              <dt className="text-stone-500 min-w-[70px]">Status:</dt>
                              <dd
                                data-testid="dossier-designation"
                                className="font-semibold text-purple-900 flex-1"
                              >
                                {dossierData.landmarkDetails.designationFull}
                              </dd>
                            </div>
                          )}
                          {dossierData.landmarkDetails.description && (
                            <p
                              data-testid="dossier-description"
                              className="text-stone-700 text-[10px] leading-relaxed pt-1 italic"
                            >
                              {dossierData.landmarkDetails.description}
                            </p>
                          )}
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Column B: Site Footprint & Neighborhood Plan */}
                <div className="border border-stone-300 rounded p-3 bg-white flex flex-col justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-700 pb-1 mb-2 border-b border-stone-200 flex items-center justify-between">
                    <span>Site Plan & Parcel Footprint</span>
                    <span className="text-[9px] font-mono text-stone-500 lowercase">
                      scale 1:600
                    </span>
                  </div>

                  {mapScreenshotUrl ? (
                    <div
                      data-testid="dossier-minimap"
                      className="w-full h-44 rounded overflow-hidden border border-stone-200"
                    >
                      <img
                        src={mapScreenshotUrl}
                        alt={`Map view of ${dossierData.address}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <SiteFootprintVectorMap
                      address={dossierData.address}
                      stories={dossierData.stories}
                      eraColor={dossierData.eraColor}
                    />
                  )}
                </div>
              </div>

              {/* ========================================================= */}
              {/* 5. Official Verification & Digital Archive Links (QR)     */}
              {/* ========================================================= */}
              <section className="border border-stone-300 rounded p-3 mb-4 bg-stone-50">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-800 mb-2 pb-1 border-b border-stone-200 flex items-center justify-between">
                  <span>Digital Verification & Primary Research Portals</span>
                  <span className="text-[9px] text-stone-500 italic">
                    Scan with smartphone camera to verify records
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* QR 1: Harris County Appraisal District */}
                  <div className="bg-white border border-stone-200 rounded p-2.5 flex items-center gap-2.5">
                    <QrCodeSvg
                      url={dossierData.hcadUrl}
                      size={60}
                      label="HCAD Property Record QR"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-bold text-stone-900 leading-tight">
                        HCAD Official Record
                      </div>
                      <p className="text-[9px] text-stone-500 mt-0.5">
                        Harris County deed rolls & appraised tax values
                      </p>
                      <a
                        href={dossierData.hcadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="dossier-hcad-link"
                        className="inline-flex items-center gap-1 text-[9.5px] text-amber-800 font-medium hover:underline mt-1 truncate max-w-full"
                      >
                        <span>hcad.org record</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* QR 2: City of Houston Planning & Preservation */}
                  <div className="bg-white border border-stone-200 rounded p-2.5 flex items-center gap-2.5">
                    <QrCodeSvg
                      url={dossierData.cohPlanningUrl}
                      size={60}
                      label="City of Houston Planning QR"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-bold text-stone-900 leading-tight">
                        City Historic Office
                      </div>
                      <p className="text-[9px] text-stone-500 mt-0.5">
                        Chapter 33 ordinances & COA design guidelines
                      </p>
                      <a
                        href={dossierData.cohPlanningUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="dossier-planning-link"
                        className="inline-flex items-center gap-1 text-[9.5px] text-amber-800 font-medium hover:underline mt-1 truncate max-w-full"
                      >
                        <span>houstontx.gov</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  </div>

                  {/* QR 3: Preservation Houston Atlas Archive */}
                  <div className="bg-white border border-stone-200 rounded p-2.5 flex items-center gap-2.5">
                    <QrCodeSvg
                      url={dossierData.atlasDeepLink}
                      size={60}
                      label="Atlas Permanent Deep Link QR"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-bold text-stone-900 leading-tight">
                        Building Atlas Deep Link
                      </div>
                      <p className="text-[9px] text-stone-500 mt-0.5">
                        Interactive GIS timeline & 1915 map swipe
                      </p>
                      <a
                        href={dossierData.atlasDeepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="dossier-atlas-link"
                        className="inline-flex items-center gap-1 text-[9.5px] text-amber-800 font-medium hover:underline mt-1 truncate max-w-full"
                      >
                        <span>atlas archive</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              {/* ========================================================= */}
              {/* 6. Field Research & Architectural Survey Notes            */}
              {/* ========================================================= */}
              <section className="border border-stone-300 rounded p-3 mb-4 bg-white">
                <div className="flex items-center justify-between pb-1 mb-2 border-b border-stone-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-stone-600" />
                    <span>Field Research & Architectural Survey Notes</span>
                  </div>
                  <span className="text-[9.5px] text-stone-500 italic">
                    For homeowner alterations, site inspection, and archival citations
                  </span>
                </div>

                {/* On-screen editable notes input (Hidden during print if user types notes or wants ruled lines) */}
                <div className="no-print mb-2">
                  <textarea
                    data-testid="dossier-notes-input"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Type custom research notes here, or leave blank to print blank survey lines for handwritten field notes..."
                    rows={2}
                    className="w-full text-xs p-2 rounded border border-stone-300 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Printable Field Notes View */}
                {customNotes.trim() ? (
                  <div
                    data-testid="dossier-printed-notes"
                    className="text-[10.5px] text-stone-800 leading-relaxed whitespace-pre-wrap p-2 bg-stone-50 rounded border border-stone-200 font-mono"
                  >
                    {customNotes}
                  </div>
                ) : (
                  <div
                    data-testid="dossier-notes-lines"
                    className="space-y-3 pt-1 pb-1"
                  >
                    <div className="border-b border-stone-300 h-3" />
                    <div className="border-b border-stone-300 h-3" />
                    <div className="border-b border-stone-300 h-3" />
                  </div>
                )}
              </section>

              {/* ========================================================= */}
              {/* 7. Official Document Footer & Legal Disclaimer            */}
              {/* ========================================================= */}
              <footer className="pt-2 border-t-2 border-stone-900 text-[9px] text-stone-600 leading-tight">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-stone-800">
                      Preservation Houston • Dedicated to protecting Houston's architectural heritage since 1978.
                    </p>
                    <p className="mt-0.5 text-stone-500">
                      Sources: Harris County Appraisal District (HCAD), City of Houston Planning & Development Dept., and National Register of Historic Places.
                      For binding legal designations, consult the Houston Archaeological and Historical Commission (HAHC).
                    </p>
                  </div>
                  <div className="text-left sm:text-right font-mono text-[8.5px] text-stone-500 flex-shrink-0">
                    <div>Page 1 of 1</div>
                    <div>Atlas V2 Export</div>
                  </div>
                </div>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </>
  );
};

export default DossierModal;
