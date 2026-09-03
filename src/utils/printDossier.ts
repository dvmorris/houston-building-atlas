/**
 * Preservation Houston Building Atlas - Historic Building Dossier Print Utility
 *
 * Prepares normalized property metadata and generates print-ready single-page
 * (8.5" x 11" Letter) dossier data structures, camera-scannable QR code matrices,
 * and print trigger.
 */

import QRCode from "qrcode";
import {
  ParcelProperties,
  LandmarkProperties,
  DistrictProperties,
} from "../components/Map/MapView";
import {
  ContributingStatus,
  resolveContributingStatus,
} from "../components/Drawer/ContributingBadge";
import {
  calculateBuildingAge,
  formatHcadAccountId,
  LAND_USE_DESCRIPTIONS,
  getPropertyDeepLink,
} from "../components/Drawer/PropertyDrawer";
import { getEraColor, getEraName } from "./colorScales";

export interface DossierData {
  /** Unique property identifier (HCAD or Landmark ID) */
  id: string;
  /** Property site address */
  address: string;
  /** Year of construction */
  yearBuilt: number | null;
  /** Building age in years */
  age: number | null;
  /** Human-readable age string (e.g. "Built 1912 • 114 years old") */
  ageLabel: string;
  /** Architectural era name */
  eraName: string;
  /** Architectural era theme color */
  eraColor: string;
  /** Historic district name, if located within one */
  districtName: string | null;
  /** Properly formatted district display name with single 'Historic District' suffix */
  districtDisplayName: string | null;
  /** Resolved contributing status */
  contributingStatus: ContributingStatus;
  /** Status display label */
  contributingLabel: string;
  /** Status description */
  contributingDescription: string;
  /** Legal municipal protection explanation */
  legalContext: string;
  /** Property owner of record */
  owner: string;
  /** HCAD account number details */
  hcadAccount: {
    raw: string;
    formatted: string;
    isValid13Digit: boolean;
  };
  /** Outbound link to official HCAD property record */
  hcadUrl: string;
  /** Outbound link to City of Houston Planning & Historic Preservation Office */
  cohPlanningUrl: string;
  /** Outbound link to Preservation Houston */
  preservationHoustonUrl: string;
  /** Permanent deep link URL to this property in the Atlas */
  atlasDeepLink: string;
  /** Land use classification code */
  landUseCode: string | null;
  /** Land use human-readable description */
  landUseDisplay: string | null;
  /** Number of stories */
  stories: number | null;
  /** Formatted stories string (e.g. "2 Stories") */
  storiesDisplay: string | null;
  /** Whether the property is an official recognized landmark */
  isLandmark: boolean;
  /** Additional landmark fields, if available */
  landmarkDetails?: {
    name?: string;
    architect?: string;
    style?: string;
    designation?: string;
    designationFull?: string;
    description?: string;
    nrhpDate?: string;
  };
  /** Formatted dossier generation date */
  formattedDate: string;
  /** ISO timestamp of generation */
  generatedIsoDate: string;
  /** Document reference ID */
  documentRefId: string;
  /** Custom research notes entered by the user */
  customNotes?: string;
}

/**
 * Formats a historic district name with "Historic District" suffix,
 * preventing duplicate suffixes like "Downtown Historic District Historic District".
 */
export function formatDistrictDisplayName(
  name: string | null | undefined
): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const base = trimmed.replace(/\s+historic\s+district$/i, "").trim();
  return `${base} Historic District`;
}

/**
 * Detailed legal and preservation explanations for each contributing status.
 */
export const STATUS_LEGAL_DESCRIPTIONS: Record<
  ContributingStatus,
  { label: string; description: string; legalContext: string }
> = {
  contributing: {
    label: "Contributing Structure",
    description:
      "Retains historic architectural integrity and character-defining fabric from the district's period of significance.",
    legalContext:
      "Protected under City of Houston Code of Ordinances Chapter 33 (Historic Preservation). Mandatory Certificate of Appropriateness (COA) required for exterior alterations, additions, or demolition. Eligible for municipal historic tax exemptions.",
  },
  "non-contributing": {
    label: "Non-Contributing Structure",
    description:
      "Altered or modern infill construction located within the designated historic district boundary.",
    legalContext:
      "Subject to City of Houston Chapter 33 design guidelines for alterations and new construction to maintain streetscape character. Does not qualify for historic contributing tax incentives.",
  },
  "protected-landmark": {
    label: "City Protected Landmark (PLM)",
    description:
      "The highest tier of municipal historic preservation protection under Houston municipal law.",
    legalContext:
      "Designated by Houston City Council. Strict prohibition against demolition, demolition by neglect, or unsanctioned alterations. Mandatory HAHC approval. Eligible for maximum preservation tax relief.",
  },
  landmark: {
    label: "City Landmark (LM)",
    description:
      "Officially recognized historic landmark designated by Houston City Council.",
    legalContext:
      "Subject to Houston Archaeological and Historical Commission (HAHC) review with a statutory 90-day demolition delay to allow preservation alternatives to be developed.",
  },
  outside: {
    label: "Outside Historic District",
    description:
      "Property is located outside Houston's recognized municipal historic districts.",
    legalContext:
      "Not currently governed by City of Houston Chapter 33 historic district preservation overlay zoning. Governed by standard municipal building codes and private deed restrictions.",
  },
};

/**
 * Normalizes property and district metadata into a complete DossierData structure.
 */
export function prepareDossierData(
  property:
    | ParcelProperties
    | LandmarkProperties
    | (ParcelProperties & Partial<LandmarkProperties>)
    | (LandmarkProperties & Partial<ParcelProperties>)
    | null
    | undefined,
  district?: DistrictProperties | null,
  options?: {
    customNotes?: string;
    currentDate?: Date;
  }
): DossierData {
  const safeProp = property || ({} as any);
  const id = String(safeProp.id || "PH-PROP-000000");
  const address = safeProp.addr || "Unknown Address";
  const yearBuilt =
    typeof safeProp.yr === "number" && safeProp.yr > 0 ? safeProp.yr : null;

  const now = options?.currentDate || new Date();
  const currentYear = now.getFullYear();
  const { age, label: ageLabel } = calculateBuildingAge(yearBuilt, currentYear);
  const eraName = yearBuilt ? getEraName(yearBuilt) : "Historical Houston";
  const eraColor = yearBuilt ? getEraColor(yearBuilt) : "#d97706";

  // Resolve landmark identity
  const isLandmark = Boolean(
    safeProp.designation || safeProp.architect || safeProp.style || safeProp.name
  );
  const landmarkName = safeProp.name || (isLandmark ? address : undefined);

  // Resolve historic district name
  const districtName =
    safeProp.dist ||
    district?.name ||
    (isLandmark && (safeProp as any).dist) ||
    null;
  const districtDisplayName = formatDistrictDisplayName(districtName);

  // Resolve contributing status
  const contributingStatus = resolveContributingStatus({
    contrib: safeProp.contrib,
    designation: safeProp.designation,
  });
  const statusInfo = STATUS_LEGAL_DESCRIPTIONS[contributingStatus];

  // HCAD Account formatting
  const isHcadNumeric = /^\d+$/.test(id.replace(/\D/g, ""));
  const { raw: rawHcad, formatted: formattedHcad, isValid13Digit } =
    formatHcadAccountId(
      safeProp.id && (isHcadNumeric || safeProp.contrib !== undefined)
        ? safeProp.id
        : ""
    );

  // URLs
  const hcadUrl = rawHcad
    ? `https://hcad.org/property-search/account/${rawHcad}`
    : "https://hcad.org/property-search";
  const cohPlanningUrl = "https://www.houstontx.gov/planning/HistoricPres/";
  const preservationHoustonUrl = "https://www.preservationhouston.org";
  const atlasDeepLink = getPropertyDeepLink(id);

  // Owner Name
  const owner =
    safeProp.owner ||
    (isLandmark ? "Public / Designated Landmark" : "Harris County Property Owner");

  // Land Use
  const rawLandUse = safeProp.use;
  const landUseDisplay = rawLandUse
    ? LAND_USE_DESCRIPTIONS[rawLandUse.toUpperCase()] || rawLandUse
    : null;

  // Stories
  const rawStories = safeProp.st;
  const stories =
    typeof rawStories === "number" ? rawStories : null;
  const storiesDisplay =
    stories !== null
      ? `${stories} ${stories === 1 ? "Story" : "Stories"}`
      : null;

  // Formatted Dates
  const formattedDate = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const generatedIsoDate = now.toISOString();

  // Document reference ID
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, "");
  const documentRefId = `PH-DOSSIER-${cleanId || "ARCHIVE"}-${now.getFullYear()}`;

  const landmarkDetails = isLandmark
    ? {
        name: landmarkName,
        architect: safeProp.architect,
        style: safeProp.style,
        designation: safeProp.designation,
        designationFull:
          safeProp.designation_full ||
          (safeProp.designation === "PLM"
            ? "City of Houston Protected Landmark"
            : safeProp.designation === "LM"
            ? "City of Houston Landmark"
            : undefined),
        description: safeProp.description,
        nrhpDate: safeProp.nrhp_date,
      }
    : undefined;

  return {
    id,
    address,
    yearBuilt,
    age,
    ageLabel,
    eraName,
    eraColor,
    districtName,
    districtDisplayName,
    contributingStatus,
    contributingLabel: statusInfo.label,
    contributingDescription: statusInfo.description,
    legalContext: statusInfo.legalContext,
    owner,
    hcadAccount: {
      raw: rawHcad,
      formatted: formattedHcad,
      isValid13Digit,
    },
    hcadUrl,
    cohPlanningUrl,
    preservationHoustonUrl,
    atlasDeepLink,
    landUseCode: rawLandUse || null,
    landUseDisplay,
    stories,
    storiesDisplay,
    isLandmark,
    landmarkDetails,
    formattedDate,
    generatedIsoDate,
    documentRefId,
    customNotes: options?.customNotes,
  };
}

/**
 * Triggers the browser print dialog safely.
 * Returns true if window.print was called, false otherwise.
 */
export function triggerPrint(): boolean {
  if (typeof window === "undefined" || typeof window.print !== "function") {
    return false;
  }
  try {
    window.print();
    return true;
  } catch (err) {
    console.warn("Print trigger error:", err);
    return false;
  }
}

/**
 * Generates an authentic ISO/IEC 18004 byte mode QR code module matrix for an input URL string.
 * This guarantees optical scannability with physical smartphone cameras (iOS Camera, Android Google Lens).
 */
export function generateQrMatrix(text: string): boolean[][] {
  if (!text) return [];
  try {
    const qr = QRCode.create(text, {
      errorCorrectionLevel: "M",
    });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(Boolean(qr.modules.get(r, c)));
      }
      matrix.push(row);
    }
    return matrix;
  } catch (err) {
    console.warn("Failed to generate QR code matrix:", err);
    return [];
  }
}

/**
 * CSS stylesheet injection for 8.5" x 11" single-page letter printing.
 */
export const DOSSIER_PRINT_CSS = `
@page {
  size: letter portrait;
  margin: 0.35in 0.45in;
}

@media print {
  html, body {
    background: #ffffff !important;
    color: #1c1917 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    width: 100% !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Hide all interactive elements and page body during print */
  body > * {
    visibility: hidden !important;
  }

  /* Ensure modal backdrop does not obscure or darken the printout */
  [data-testid="dossier-backdrop"] {
    display: none !important;
    background: transparent !important;
  }

  [data-testid="dossier-modal"] {
    position: static !important;
    inset: auto !important;
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    display: block !important;
    visibility: visible !important;
  }

  /* Only printable dossier sheet is visible */
  #printable-dossier,
  #printable-dossier * {
    visibility: visible !important;
  }

  #printable-dossier {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    max-width: 8.5in !important;
    margin: 0 auto !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    background: #ffffff !important;
    color: #1c1917 !important;
    page-break-after: avoid !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .no-print,
  .no-print * {
    display: none !important;
    visibility: hidden !important;
  }
}
`;
