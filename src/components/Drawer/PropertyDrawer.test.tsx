import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PropertyDrawer, calculateBuildingAge, formatHcadAccountId } from "./PropertyDrawer";
import { ContributingBadge, resolveContributingStatus } from "./ContributingBadge";
import { ParcelProperties, LandmarkProperties } from "../Map/MapView";

describe("ContributingBadge", () => {
  it("resolves status correctly across inputs", () => {
    expect(resolveContributingStatus({ contrib: 1 })).toBe("contributing");
    expect(resolveContributingStatus({ contrib: 0 })).toBe("non-contributing");
    expect(resolveContributingStatus({ contrib: -1 })).toBe("outside");
    expect(resolveContributingStatus({ designation: "PLM" })).toBe("protected-landmark");
    expect(resolveContributingStatus({ designation: "LM" })).toBe("landmark");
    expect(resolveContributingStatus({ status: "contributing" })).toBe("contributing");
  });

  it("renders Contributing Structure badge with green pill and tooltip", () => {
    render(<ContributingBadge contrib={1} districtName="Downtown" />);

    const badge = screen.getByTestId("contributing-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status", "contributing");
    expect(screen.getByText("Contributing Structure")).toBeInTheDocument();

    const tooltip = screen.getByTestId("contributing-tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(/intact historic fabric/i);
  });

  it("renders Non-Contributing Structure badge with amber pill and tooltip", () => {
    render(<ContributingBadge contrib={0} />);

    const badge = screen.getByTestId("contributing-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status", "non-contributing");
    expect(screen.getByText("Non-Contributing Structure")).toBeInTheDocument();

    const tooltip = screen.getByTestId("contributing-tooltip");
    expect(tooltip).toHaveTextContent(/altered or modern infill/i);
  });

  it("renders City Protected Landmark badge for PLM designation", () => {
    render(<ContributingBadge designation="PLM" />);

    const badge = screen.getByTestId("contributing-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status", "protected-landmark");
    expect(screen.getByText("City Protected Landmark")).toBeInTheDocument();

    const tooltip = screen.getByTestId("contributing-tooltip");
    expect(tooltip).toHaveTextContent(/highest level of municipal historic protection/i);
  });

  it("renders City Landmark badge for LM designation", () => {
    render(<ContributingBadge designation="LM" />);

    const badge = screen.getByTestId("contributing-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status", "landmark");
    expect(screen.getByText("City Landmark")).toBeInTheDocument();

    const tooltip = screen.getByTestId("contributing-tooltip");
    expect(tooltip).toHaveTextContent(/demolition delay/i);
  });

  it("renders Outside Historic District badge when contrib is -1", () => {
    render(<ContributingBadge contrib={-1} />);

    const badge = screen.getByTestId("contributing-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status", "outside");
    expect(screen.getByText("Outside Historic District")).toBeInTheDocument();
  });
});

describe("PropertyDrawer Helpers", () => {
  it("calculates age correctly for 2026", () => {
    // 2026 - 1912 = 114
    expect(calculateBuildingAge(1912, 2026).label).toBe("Built 1912 • 114 years old");
    // 2026 - 1914 = 112
    expect(calculateBuildingAge(1914, 2026).label).toBe("Built 1914 • 112 years old");
    // Unknown build dates
    expect(calculateBuildingAge(0, 2026).label).toBe("Year Built: Unknown");
    expect(calculateBuildingAge(null, 2026).label).toBe("Year Built: Unknown");
  });

  it("formats 13-digit HCAD accounts correctly", () => {
    const formatted = formatHcadAccountId("0010020000001");
    expect(formatted.isValid13Digit).toBe(true);
    expect(formatted.formatted).toBe("001-002-000-0001");
    expect(formatted.raw).toBe("0010020000001");

    const non13 = formatHcadAccountId("lm-kellum-noble");
    expect(non13.isValid13Digit).toBe(false);
    expect(non13.formatted).toBe("lm-kellum-noble");
  });
});

describe("PropertyDrawer Component", () => {
  const mockParcel: ParcelProperties = {
    id: "0010020000001",
    yr: 1912,
    addr: "1200 TEXAS AVE",
    owner: "HISTORIC TRUST LLC",
    use: "RES",
    dist: "Downtown",
    contrib: 1,
    st: 3.0,
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
    description: "The oldest surviving building in Houston on its original brick foundation.",
  };

  beforeEach(() => {
    // Setup navigator clipboard mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders parcel header address, built year, and age", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("property-address")).toHaveTextContent("1200 TEXAS AVE");
    expect(screen.getByTestId("property-built-age")).toHaveTextContent(/Built 1912/);
    expect(screen.getByTestId("property-built-age")).toHaveTextContent(/114 years old/);
    expect(screen.getByTestId("era-tag")).toBeInTheDocument();
    expect(screen.getByTestId("era-color-swatch")).toBeInTheDocument();
  });

  it("renders Contributing badge and historic district name", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Contributing Structure")).toBeInTheDocument();
    expect(screen.getByTestId("district-info")).toHaveTextContent("Downtown");
  });

  it("renders Non-Contributing badge for altered structures", () => {
    render(<PropertyDrawer parcel={mockNonContribParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Non-Contributing Structure")).toBeInTheDocument();
    expect(screen.getByTestId("district-info")).toHaveTextContent("Main Street Market Square");
  });

  it("renders Owner name, HCAD 13-digit account, stories, and land use code", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("property-owner")).toHaveTextContent("HISTORIC TRUST LLC");
    expect(screen.getByTestId("hcad-account-number")).toHaveTextContent("001-002-000-0001");
    expect(screen.getByTestId("hcad-account-number")).toHaveTextContent("0010020000001");
    expect(screen.getByTestId("property-stories")).toHaveTextContent("3 Stories");
    expect(screen.getByTestId("property-land-use")).toHaveTextContent("Residential (RES)");
  });

  it("renders outbound link to official HCAD record with correct account URL", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);

    const hcadLink = screen.getByTestId("hcad-link");
    expect(hcadLink).toBeInTheDocument();
    expect(hcadLink).toHaveAttribute(
      "href",
      "https://hcad.org/property-search/account/0010020000001"
    );
    expect(hcadLink).toHaveAttribute("target", "_blank");
    expect(hcadLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("copies deep link to clipboard when clicking Share Property button", async () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);

    const shareBtn = screen.getByTestId("share-property-btn");
    expect(shareBtn).toHaveTextContent(/Share Property/i);

    fireEvent.click(shareBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("0010020000001")
    );

    await waitFor(() => {
      expect(screen.getByText("Link Copied!")).toBeInTheDocument();
    });
  });

  it("calls onExportDossier callback when clicking Export Building Dossier", () => {
    const handleExport = vi.fn();
    render(
      <PropertyDrawer
        parcel={mockParcel}
        isOpen={true}
        onClose={vi.fn()}
        onExportDossier={handleExport}
      />
    );

    const exportBtn = screen.getByTestId("export-dossier-btn");
    expect(exportBtn).toHaveTextContent(/Export Dossier/i);

    fireEvent.click(exportBtn);
    expect(handleExport).toHaveBeenCalledWith(mockParcel);
  });

  it("renders Report Historic Info link to Preservation Houston feedback", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);

    const feedbackLink = screen.getByTestId("feedback-link");
    expect(feedbackLink).toHaveAttribute(
      "href",
      "https://www.preservationhouston.org/atlas/feedback"
    );
    expect(feedbackLink).toHaveAttribute("target", "_blank");
  });

  it("renders landmark specific details when landmark is provided", () => {
    render(<PropertyDrawer landmark={mockLandmark} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("landmark-name")).toHaveTextContent("Kellum-Noble House");
    expect(screen.getByTestId("property-address")).toHaveTextContent("212 DALLAS ST");
    expect(screen.getByText("City Protected Landmark")).toBeInTheDocument();
    expect(screen.getByText("Nathaniel Kellum")).toBeInTheDocument();
    expect(screen.getByText("Texas Republic / Greek Revival")).toBeInTheDocument();
  });

  it("triggers onClose when clicking close button or pressing Escape", () => {
    const handleClose = vi.fn();
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByTestId("drawer-close-btn");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("does not render when isOpen is false", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("property-drawer")).not.toBeInTheDocument();
  });

  it("applies desktop positioning classes to prevent timeline bar overlap", () => {
    render(<PropertyDrawer parcel={mockParcel} isOpen={true} onClose={vi.fn()} />);
    const drawer = screen.getByTestId("property-drawer");

    // Must be absolute within map container on desktop and bounded top/bottom/left
    expect(drawer.className).toContain("md:absolute");
    expect(drawer.className).toContain("md:inset-auto");
    expect(drawer.className).toContain("md:top-3");
    expect(drawer.className).toContain("md:bottom-3");
    expect(drawer.className).toContain("md:left-4");
    expect(drawer.className).toContain("md:right-auto");

    // Must NOT use old fixed bottom-24 that clashed with the timeline scrubber
    expect(drawer.className).not.toContain("md:bottom-24");
  });
});

