/**
 * Preservation Houston Building Atlas - DossierModal Component Tests
 */

import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DossierModal } from "./DossierModal";
import {
  prepareDossierData,
  generateQrMatrix,
  triggerPrint,
} from "../../utils/printDossier";
import { ParcelProperties, LandmarkProperties } from "../Map/MapView";

describe("printDossier utilities", () => {
  const sampleParcel: ParcelProperties = {
    id: "0010020000001",
    yr: 1912,
    addr: "1200 TEXAS AVE",
    owner: "HISTORIC TRUST LLC",
    use: "RES",
    dist: "Downtown",
    contrib: 1,
    st: 3,
  };

  it("prepares complete dossier data for a contributing parcel", () => {
    const fixedDate = new Date("2026-09-03T12:00:00Z");
    const data = prepareDossierData(sampleParcel, null, {
      currentDate: fixedDate,
    });

    expect(data.address).toBe("1200 TEXAS AVE");
    expect(data.yearBuilt).toBe(1912);
    expect(data.age).toBe(114);
    expect(data.ageLabel).toContain("114 years old");
    expect(data.eraName).toContain("Victorian & Railroad Boom");
    expect(data.districtName).toBe("Downtown");
    expect(data.contributingStatus).toBe("contributing");
    expect(data.contributingLabel).toBe("Contributing Structure");
    expect(data.hcadAccount.isValid13Digit).toBe(true);
    expect(data.hcadAccount.formatted).toBe("001-002-000-0001");
    expect(data.hcadUrl).toBe(
      "https://hcad.org/property-search/account/0010020000001"
    );
    expect(data.landUseDisplay).toBe("Residential (RES)");
    expect(data.storiesDisplay).toBe("3 Stories");
    expect(data.formattedDate).toBe("September 3, 2026");
    expect(data.documentRefId).toContain("PH-DOSSIER-0010020000001");
  });

  it("handles unknown build year gracefully", () => {
    const data = prepareDossierData({
      id: "unknown-year-parcel",
      yr: 0,
      addr: "100 MAIN ST",
      owner: "UNKNOWN",
      use: "COM",
      contrib: -1,
    });

    expect(data.yearBuilt).toBeNull();
    expect(data.age).toBeNull();
    expect(data.ageLabel).toBe("Year Built: Unknown");
    expect(data.contributingStatus).toBe("outside");
  });

  it("generates 21x21 QR code matrix with finder patterns", () => {
    const matrix = generateQrMatrix("https://atlas.preservationhouston.org");
    expect(matrix.length).toBe(21);
    expect(matrix[0].length).toBe(21);

    // Top-left finder center (row 3, col 3) should be filled
    expect(matrix[3][3]).toBe(true);
    // Top-right finder center (row 3, col 17) should be filled
    expect(matrix[3][17]).toBe(true);
    // Bottom-left finder center (row 17, col 3) should be filled
    expect(matrix[17][3]).toBe(true);
  });

  it("triggers window.print when called", () => {
    const originalPrint = window.print;
    window.print = vi.fn();

    const result = triggerPrint();
    expect(result).toBe(true);
    expect(window.print).toHaveBeenCalledTimes(1);

    window.print = originalPrint;
  });
});

describe("DossierModal Component", () => {
  const mockParcel: ParcelProperties = {
    id: "0010020000001",
    yr: 1912,
    addr: "1200 TEXAS AVE",
    owner: "HISTORIC TRUST LLC",
    use: "RES",
    dist: "Downtown",
    contrib: 1,
    st: 3,
  };

  const mockNonContribParcel: ParcelProperties = {
    id: "0010020000002",
    yr: 1985,
    addr: "800 MAIN ST",
    owner: "COMMERCIAL HOLDINGS INC",
    use: "COM",
    dist: "Main Street Market Square",
    contrib: 0,
    st: 12,
  };

  const mockLandmark: LandmarkProperties = {
    id: "lm-kellum-noble",
    name: "Kellum-Noble House",
    addr: "212 DALLAS ST",
    yr: 1847,
    architect: "Nathaniel Kellum",
    style: "Texas Republic / Greek Revival",
    designation: "PLM",
    designation_full: "City of Houston Protected Landmark",
    description:
      "The oldest surviving building in Houston on its original brick foundation.",
  };

  beforeEach(() => {
    window.print = vi.fn();
  });

  it("does not render when isOpen is false", () => {
    render(<DossierModal property={mockParcel} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("dossier-modal")).not.toBeInTheDocument();
  });

  it("does not render when property is null", () => {
    render(<DossierModal property={null} isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByTestId("dossier-modal")).not.toBeInTheDocument();
  });

  it("renders Preservation Houston letterhead and branding", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const sheet = screen.getByTestId("printable-dossier");
    expect(sheet).toBeInTheDocument();
    expect(
      within(sheet).getByRole("heading", { name: /Preservation Houston/i, level: 1 })
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText(/Houston's Only Citywide Historic Preservation Organization/i)
    ).toBeInTheDocument();
    expect(within(sheet).getByText(/HISTORIC BUILDING DOSSIER/i)).toBeInTheDocument();
  });

  it("renders property address, year built, age, and architectural era badge", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("dossier-address")).toHaveTextContent("1200 TEXAS AVE");
    expect(screen.getByTestId("dossier-built-age")).toHaveTextContent(/Built 1912/);
    expect(screen.getByTestId("dossier-built-age")).toHaveTextContent(/114 years old/);
    expect(screen.getByTestId("dossier-era-tag")).toHaveTextContent(
      /Victorian & Railroad Boom/i
    );
  });

  it("renders Contributing Structure status badge and historic district name", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("dossier-contributing-status")).toHaveTextContent(
      "Contributing Structure"
    );
    expect(screen.getByTestId("dossier-district")).toHaveTextContent(
      "Downtown Historic District"
    );
    expect(screen.getByTestId("dossier-legal-context")).toHaveTextContent(
      /Chapter 33/i
    );
  });

  it("renders Non-Contributing Structure status badge for altered properties", () => {
    render(
      <DossierModal
        property={mockNonContribParcel}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("dossier-contributing-status")).toHaveTextContent(
      "Non-Contributing Structure"
    );
    expect(screen.getByTestId("dossier-district")).toHaveTextContent(
      "Main Street Market Square Historic District"
    );
  });

  it("renders property records: owner name, formatted 13-digit HCAD account, land use, and stories", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("dossier-owner")).toHaveTextContent(
      "HISTORIC TRUST LLC"
    );
    expect(screen.getByTestId("dossier-hcad-account")).toHaveTextContent(
      "001-002-000-0001"
    );
    expect(screen.getByTestId("dossier-hcad-account")).toHaveTextContent(
      "0010020000001"
    );
    expect(screen.getByTestId("dossier-land-use")).toHaveTextContent(
      "Residential (RES)"
    );
    expect(screen.getByTestId("dossier-stories")).toHaveTextContent("3 Stories");
  });

  it("renders Landmark specific details for historic landmarks", () => {
    render(<DossierModal property={mockLandmark} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("dossier-landmark-name")).toHaveTextContent(
      "Kellum-Noble House"
    );
    expect(screen.getByTestId("dossier-architect")).toHaveTextContent(
      "Nathaniel Kellum"
    );
    expect(screen.getByTestId("dossier-style")).toHaveTextContent(
      "Texas Republic / Greek Revival"
    );
    expect(screen.getByTestId("dossier-designation")).toHaveTextContent(
      "City of Houston Protected Landmark"
    );
    expect(screen.getByTestId("dossier-description")).toHaveTextContent(
      /oldest surviving building in Houston/i
    );
  });

  it("renders site footprint mini-map with vector site plan", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    const minimap = screen.getByTestId("dossier-minimap");
    expect(minimap).toBeInTheDocument();
    expect(screen.getByText("SITE PLAN & FOOTPRINT")).toBeInTheDocument();
    expect(screen.getByText("HISTORIC FOOTPRINT")).toBeInTheDocument();
    expect(within(minimap).getByText(/TEXAS AVE/i)).toBeInTheDocument();
  });

  it("renders custom map screenshot when provided", () => {
    render(
      <DossierModal
        property={mockParcel}
        isOpen={true}
        onClose={vi.fn()}
        mapScreenshotUrl="https://example.com/map-thumbnail.png"
      />
    );

    const minimap = screen.getByTestId("dossier-minimap");
    expect(minimap).toBeInTheDocument();
    const img = screen.getByRole("img", { name: /Map view of 1200 TEXAS AVE/i });
    expect(img).toHaveAttribute("src", "https://example.com/map-thumbnail.png");
  });

  it("renders verification QR cards with outbound links to HCAD and City Planning", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    const hcadLink = screen.getByTestId("dossier-hcad-link");
    expect(hcadLink).toHaveAttribute(
      "href",
      "https://hcad.org/property-search/account/0010020000001"
    );

    const planningLink = screen.getByTestId("dossier-planning-link");
    expect(planningLink).toHaveAttribute(
      "href",
      "https://www.houstontx.gov/planning/HistoricPres/"
    );

    const atlasLink = screen.getByTestId("dossier-atlas-link");
    expect(atlasLink).toHaveAttribute(
      "href",
      expect.stringContaining("0010020000001")
    );
  });

  it("allows entering research notes and reflects them in the dossier", () => {
    render(<DossierModal property={mockParcel} isOpen={true} onClose={vi.fn()} />);

    // Initially displays blank notes lines
    expect(screen.getByTestId("dossier-notes-lines")).toBeInTheDocument();

    const notesInput = screen.getByTestId("dossier-notes-input");
    fireEvent.change(notesInput, {
      target: { value: "Inspected original cypress siding and pocket doors." },
    });

    expect(screen.getByTestId("dossier-printed-notes")).toHaveTextContent(
      "Inspected original cypress siding and pocket doors."
    );
  });

  it("triggers window.print and onPrint callback when clicking Print / Save PDF", () => {
    const handlePrint = vi.fn();
    render(
      <DossierModal
        property={mockParcel}
        isOpen={true}
        onClose={vi.fn()}
        onPrint={handlePrint}
      />
    );

    const printBtn = screen.getByTestId("print-dossier-btn");
    expect(printBtn).toHaveTextContent(/Print \/ Save PDF/i);

    fireEvent.click(printBtn);
    expect(handlePrint).toHaveBeenCalledTimes(1);
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when clicking Close button", () => {
    const handleClose = vi.fn();
    render(
      <DossierModal
        property={mockParcel}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByTestId("close-dossier-btn");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when clicking the backdrop overlay", () => {
    const handleClose = vi.fn();
    render(
      <DossierModal
        property={mockParcel}
        isOpen={true}
        onClose={handleClose}
      />
    );

    const backdrop = screen.getByTestId("dossier-backdrop");
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onClose when pressing Escape key", () => {
    const handleClose = vi.fn();
    render(
      <DossierModal
        property={mockParcel}
        isOpen={true}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
