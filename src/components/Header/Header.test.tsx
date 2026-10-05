import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Header from "./Header";
import SearchBar from "./SearchBar";

describe("Header & SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SearchBar Omnibox", () => {
    it("renders search input with placeholder and search icon", () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute(
        "placeholder",
        "Search landmarks, addresses, or 13-digit HCAD #..."
      );
    });

    it("matches designated landmarks instantly (Julia Ideson)", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");
      fireEvent.change(input, { target: { value: "Julia Ideson" } });

      const resultItem = await screen.findByTestId("search-result-lm-julia-ideson");
      expect(resultItem).toBeInTheDocument();
      expect(screen.getByText("Julia Ideson Building")).toBeInTheDocument();
      expect(screen.getByText("Protected Landmark")).toBeInTheDocument();

      // Click the landmark result
      fireEvent.click(resultItem);

      expect(onSelectLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          lng: -95.3695,
          lat: 29.7588,
          landmark: expect.objectContaining({
            name: "Julia Ideson Building",
            yr: 1926,
          }),
        })
      );
    });

    it("matches designated landmarks instantly (Esperson, Heights Theater, Cotton Exchange)", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");

      // Search Esperson
      fireEvent.change(input, { target: { value: "Esperson" } });
      expect(
        await screen.findByText("Niels & Mellie Esperson Buildings")
      ).toBeInTheDocument();

      // Search Heights Theater
      fireEvent.change(input, { target: { value: "Heights Theater" } });
      expect(await screen.findByText("The Heights Theater")).toBeInTheDocument();

      // Search Cotton Exchange
      fireEvent.change(input, { target: { value: "Cotton Exchange" } });
      expect(
        await screen.findByText("1884 Houston Cotton Exchange")
      ).toBeInTheDocument();
    });

    it("matches address queries against sample parcels (1200 Texas Ave, Heights Blvd)", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");

      // Search 1200 Texas Ave
      fireEvent.change(input, { target: { value: "1200 Texas Ave" } });
      const texasAveResult = await screen.findByTestId(
        "search-result-parcel-0010020000001"
      );
      expect(texasAveResult).toBeInTheDocument();
      expect(screen.getByText("1200 TEXAS AVE")).toBeInTheDocument();

      fireEvent.click(texasAveResult);
      expect(onSelectLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          parcelId: "0010020000001",
          lng: -95.3615,
          lat: 29.7599,
        })
      );

      // Search Heights Blvd
      fireEvent.change(input, { target: { value: "Heights Blvd" } });
      expect(await screen.findByText("530 HEIGHTS BLVD")).toBeInTheDocument();
    });

    it("identifies and parses 13-digit HCAD Account Number lookup (0010020000001)", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");

      // Enter 13-digit HCAD number
      fireEvent.change(input, { target: { value: "0010020000001" } });

      const hcadResult = await screen.findByTestId(
        "search-result-hcad-0010020000001"
      );
      expect(hcadResult).toBeInTheDocument();
      expect(screen.getByText("HCAD Account #0010020000001")).toBeInTheDocument();
      expect(screen.getByText("HCAD Account")).toBeInTheDocument();

      fireEvent.click(hcadResult);
      expect(onSelectLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          parcelId: "0010020000001",
          zoom: 17.5,
        })
      );
    });

    it("parses formatted 13-digit HCAD Account Numbers with hyphens", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");
      fireEvent.change(input, { target: { value: "001-002-000-0001" } });

      const hcadResult = await screen.findByTestId(
        "search-result-hcad-0010020000001"
      );
      expect(hcadResult).toBeInTheDocument();
    });

    it("handles full keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input");
      fireEvent.change(input, { target: { value: "Travis" } });

      const resultsList = await screen.findByTestId("search-results-list");
      expect(resultsList).toBeInTheDocument();

      // Navigate down
      fireEvent.keyDown(input, { key: "ArrowDown" });
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      // Navigate down again
      fireEvent.keyDown(input, { key: "ArrowDown" });
      expect(options[1]).toHaveAttribute("aria-selected", "true");

      // Navigate back up
      fireEvent.keyDown(input, { key: "ArrowUp" });
      expect(options[0]).toHaveAttribute("aria-selected", "true");

      // Press Enter to select
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onSelectLocation).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId("search-results-list")).not.toBeInTheDocument();

      // Open again and test Escape
      fireEvent.change(input, { target: { value: "Travis" } });
      expect(await screen.findByTestId("search-results-list")).toBeInTheDocument();

      fireEvent.keyDown(input, { key: "Escape" });
      expect(screen.queryByTestId("search-results-list")).not.toBeInTheDocument();
    });

    it("clears search query and active dropdown with clear button", async () => {
      const onSelectLocation = vi.fn();
      render(<SearchBar onSelectLocation={onSelectLocation} />);

      const input = screen.getByTestId("search-bar-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Dallas" } });

      expect(input.value).toBe("Dallas");
      const clearBtn = screen.getByTestId("search-clear-btn");
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(input.value).toBe("");
      expect(screen.queryByTestId("search-results-list")).not.toBeInTheDocument();
    });

    it("does not steal focus with slash shortcut when user is typing in another input or textarea", () => {
      const onSelectLocation = vi.fn();
      render(
        <div>
          <SearchBar onSelectLocation={onSelectLocation} />
          <textarea data-testid="other-textarea" />
        </div>
      );

      const searchInput = screen.getByTestId("search-bar-input");
      const textarea = screen.getByTestId("other-textarea");

      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      // Pressing "/" inside textarea should NOT steal focus to search input
      fireEvent.keyDown(textarea, { key: "/" });
      expect(document.activeElement).toBe(textarea);
      expect(document.activeElement).not.toBe(searchInput);
    });
  });

  describe("Header Component", () => {
    it("renders Preservation Houston branding, logo mark, and atlas badge", () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      expect(screen.getByText("Preservation Houston")).toBeInTheDocument();
      expect(screen.getByText("Atlas V2")).toBeInTheDocument();
    });

    it("renders SearchBar omnibox in Header", () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      expect(screen.getByTestId("search-bar-input")).toBeInTheDocument();
    });

    it("handles 'Compare Historic Map' toggle action", () => {
      const onSelectLocation = vi.fn();
      const onToggleHistoricSwipe = vi.fn();

      const { rerender } = render(
        <Header
          onSelectLocation={onSelectLocation}
          showHistoricSwipe={false}
          onToggleHistoricSwipe={onToggleHistoricSwipe}
        />
      );

      const swipeBtn = screen.getByTestId("historic-swipe-toggle-btn");
      expect(swipeBtn).toHaveTextContent("Compare 1915 Map");
      expect(swipeBtn).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(swipeBtn);
      expect(onToggleHistoricSwipe).toHaveBeenCalledTimes(1);

      // Rerender as active
      rerender(
        <Header
          onSelectLocation={onSelectLocation}
          showHistoricSwipe={true}
          onToggleHistoricSwipe={onToggleHistoricSwipe}
        />
      );

      expect(swipeBtn).toHaveTextContent("Exit Swipe");
      expect(swipeBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("renders 'Locate Me' GPS walking tour button and pulses when isLocating is true", () => {
      const onSelectLocation = vi.fn();
      const onLocateMe = vi.fn();

      const { rerender } = render(
        <Header
          onSelectLocation={onSelectLocation}
          isLocating={false}
          onLocateMe={onLocateMe}
        />
      );

      const locateBtn = screen.getByTestId("locate-me-btn");
      expect(locateBtn).toHaveTextContent("Locate Me");
      expect(locateBtn).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(locateBtn);
      expect(onLocateMe).toHaveBeenCalledTimes(1);

      // Rerender in active locating state
      rerender(
        <Header
          onSelectLocation={onSelectLocation}
          isLocating={true}
          onLocateMe={onLocateMe}
        />
      );

      expect(locateBtn).toHaveTextContent("Locating...");
      expect(locateBtn).toHaveAttribute("aria-pressed", "true");
      expect(locateBtn.className).toContain("animate-pulse");
    });

    it("displays active district badge when district is selected", () => {
      const onSelectLocation = vi.fn();
      render(
        <Header
          onSelectLocation={onSelectLocation}
          selectedDistrict={{
            id: "dist-downtown",
            name: "Downtown Historic District",
            full_name: "Main Street Market Square Historic District",
            designated_year: 1997,
            description: "Historic downtown commercial core",
          }}
        />
      );

      const badge = screen.getByTestId("selected-district-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("District: Downtown Historic District");
    });

    it("opens and closes 'About the Atlas' modal", () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      const aboutBtn = screen.getByTestId("nav-about-btn");
      fireEvent.click(aboutBtn);

      const modal = screen.getByTestId("about-atlas-modal");
      expect(modal).toBeInTheDocument();
      expect(
        screen.getByText("About Preservation Houston Atlas")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Harris County Appraisal District/i)
      ).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole("button", {
        name: /close about dialog/i,
      });
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId("about-atlas-modal")).not.toBeInTheDocument();
    });

    it("opens and closes 'Historic Districts Guide' modal", () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      const guideBtn = screen.getByTestId("nav-districts-btn");
      fireEvent.click(guideBtn);

      const modal = screen.getByTestId("districts-guide-modal");
      expect(modal).toBeInTheDocument();
      expect(
        screen.getByText("Houston Historic Districts Guide")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Old Sixth Ward")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Houston Heights West")
      ).toBeInTheDocument();

      // Test View on Map button on Old Sixth Ward
      const viewSixthWardBtn = screen.getByTestId("view-district-old-sixth-ward");
      expect(viewSixthWardBtn).toBeInTheDocument();
      fireEvent.click(viewSixthWardBtn);

      expect(onSelectLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          district: expect.objectContaining({
            name: "Old Sixth Ward",
          }),
        })
      );
      expect(screen.queryByTestId("districts-guide-modal")).not.toBeInTheDocument();
    });

    it("opens 'Send Feedback' modal and allows submitting feedback", async () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      const feedbackBtn = screen.getByTestId("nav-feedback-btn");
      fireEvent.click(feedbackBtn);

      const modal = screen.getByTestId("feedback-modal");
      expect(modal).toBeInTheDocument();
      expect(screen.getByText("Send Atlas Feedback")).toBeInTheDocument();

      // Fill in feedback form
      const textarea = screen.getByPlaceholderText(
        /Provide address, correct construction year/i
      );
      fireEvent.change(textarea, {
        target: { value: "The Kellum-Noble House was restored in 1958." },
      });

      const submitBtn = screen.getByTestId("submit-feedback-btn");
      fireEvent.click(submitBtn);

      expect(
        await screen.findByTestId("feedback-success-message")
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Thank You for Your Contribution!/i)
      ).toBeInTheDocument();
    });

    it("opens mobile drawer when clicking mobile menu toggle button", () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      const mobileToggleBtn = screen.getByTestId("mobile-menu-toggle-btn");
      expect(mobileToggleBtn).toBeInTheDocument();

      // Initially closed
      expect(
        screen.queryByTestId("mobile-nav-drawer")
      ).not.toBeInTheDocument();

      fireEvent.click(mobileToggleBtn);
      expect(screen.getByTestId("mobile-nav-drawer")).toBeInTheDocument();

      fireEvent.click(mobileToggleBtn);
      expect(
        screen.queryByTestId("mobile-nav-drawer")
      ).not.toBeInTheDocument();
    });

    it("closes open modals when Escape key is pressed", () => {
      const onSelectLocation = vi.fn();
      render(<Header onSelectLocation={onSelectLocation} />);

      // Open About modal
      const aboutBtn = screen.getByTestId("nav-about-btn");
      fireEvent.click(aboutBtn);
      expect(screen.getByTestId("about-atlas-modal")).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("about-atlas-modal")).not.toBeInTheDocument();

      // Open Districts Guide modal
      const districtsBtn = screen.getByTestId("nav-districts-btn");
      fireEvent.click(districtsBtn);
      expect(screen.getByTestId("districts-guide-modal")).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByTestId("districts-guide-modal")).not.toBeInTheDocument();
    });
  });
});
