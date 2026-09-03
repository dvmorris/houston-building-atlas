import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders Preservation Houston Atlas title", () => {
    render(<App />);
    expect(screen.getByText(/Preservation Houston/i)).toBeInTheDocument();
  });

  it("mounts TimelineBar connected with playback controls and era shortcuts", () => {
    render(<App />);

    expect(screen.getByTestId("play-pause-btn")).toBeInTheDocument();
    expect(screen.getByLabelText("Start year")).toBeInTheDocument();
    expect(screen.getByLabelText("End year")).toBeInTheDocument();
    expect(screen.getByTestId("visible-structure-count")).toBeInTheDocument();

    // Verify historic era buttons exist
    expect(
      screen.getByRole("button", { name: /Victorian & Railroad Boom/i })
    ).toBeInTheDocument();
  });

  it("updates year range when clicking an era shortcut in App", () => {
    render(<App />);

    const victorianBtn = screen.getByRole("button", {
      name: /Victorian & Railroad Boom/i,
    });
    fireEvent.click(victorianBtn);

    const fromInput = screen.getByLabelText("Filter from year") as HTMLInputElement;
    const toInput = screen.getByLabelText("Filter to year") as HTMLInputElement;

    expect(fromInput.value).toBe("1880");
    expect(toInput.value).toBe("1914");
  });

  it("does not render PropertyDrawer initially when no parcel is selected", () => {
    render(<App />);
    expect(screen.queryByTestId("property-drawer")).not.toBeInTheDocument();
  });

  it("toggles HistoricSwipe comparison mode when clicking the Compare 1915 Map button", () => {
    render(<App />);

    // Initially closed
    expect(
      screen.queryByTestId("historic-swipe-wrapper")
    ).not.toBeInTheDocument();

    const toggleBtn = screen.getByTestId("historic-swipe-toggle-btn");
    expect(toggleBtn).toHaveTextContent("Compare 1915 Map");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "false");

    // Click to activate
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("historic-swipe-wrapper")).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: /Map comparison swipe divider/i })
    ).toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("Exit Swipe");
    expect(toggleBtn).toHaveAttribute("aria-pressed", "true");

    // Click to deactivate
    fireEvent.click(toggleBtn);
    expect(
      screen.queryByTestId("historic-swipe-wrapper")
    ).not.toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("Compare 1915 Map");
  });

  it("closes HistoricSwipe when clicking the close button inside HistoricSwipe control bar", () => {
    render(<App />);

    const toggleBtn = screen.getByTestId("historic-swipe-toggle-btn");
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("historic-swipe-wrapper")).toBeInTheDocument();

    const closeBtn = screen.getByTestId("historic-swipe-close-btn");
    fireEvent.click(closeBtn);

    expect(
      screen.queryByTestId("historic-swipe-wrapper")
    ).not.toBeInTheDocument();
  });

  it("mounts Header with SearchBar and GPS walking tour locator", () => {
    render(<App />);

    expect(screen.getByTestId("search-bar-input")).toBeInTheDocument();
    expect(screen.getByTestId("locate-me-btn")).toBeInTheDocument();
  });

  it("selects landmark from search omnibox and opens PropertyDrawer", async () => {
    render(<App />);

    const searchInput = screen.getByTestId("search-bar-input");
    fireEvent.change(searchInput, { target: { value: "Julia Ideson" } });

    const result = await screen.findByTestId("search-result-lm-julia-ideson");
    fireEvent.click(result);

    // PropertyDrawer should now be open displaying Julia Ideson Building
    const drawer = await screen.findByTestId("property-drawer");
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText("Julia Ideson Building")).toBeInTheDocument();
  });

  it("opens DossierModal when clicking Export Building Dossier in PropertyDrawer", async () => {
    render(<App />);

    const searchInput = screen.getByTestId("search-bar-input");
    fireEvent.change(searchInput, { target: { value: "Julia Ideson" } });

    const result = await screen.findByTestId("search-result-lm-julia-ideson");
    fireEvent.click(result);

    const drawer = await screen.findByTestId("property-drawer");
    expect(drawer).toBeInTheDocument();

    const exportBtn = screen.getByTestId("export-dossier-btn");
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);

    // Verify DossierModal opens
    const dossierModal = await screen.findByTestId("dossier-modal");
    expect(dossierModal).toBeInTheDocument();
    expect(screen.getByTestId("printable-dossier")).toBeInTheDocument();
    expect(screen.getByTestId("dossier-landmark-name")).toHaveTextContent(
      "Julia Ideson Building"
    );

    // Verify closing DossierModal
    const closeBtn = screen.getByTestId("close-dossier-btn");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("dossier-modal")).not.toBeInTheDocument();
  });

  it("triggers GPS walking tour locateUser when Locate Me button is clicked", () => {
    const mockGetCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    render(<App />);

    const locateBtn = screen.getByTestId("locate-me-btn");
    fireEvent.click(locateBtn);

    expect(mockGetCurrentPosition).toHaveBeenCalled();
  });

  it("displays dismissible toast notification when geolocation error occurs", () => {
    let errorCallback: any = null;
    const mockGetCurrentPosition = vi.fn((_success: any, error: any) => {
      errorCallback = error;
    });

    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    render(<App />);

    const locateBtn = screen.getByTestId("locate-me-btn");
    fireEvent.click(locateBtn);

    expect(mockGetCurrentPosition).toHaveBeenCalled();

    // Trigger permission denied error
    act(() => {
      errorCallback({
        code: 1,
        message: "User denied Geolocation",
      });
    });

    // Verify toast appears
    const toast = screen.getByTestId("geolocation-error-toast");
    expect(toast).toBeInTheDocument();
    expect(
      screen.getByText(/Location permission denied/i)
    ).toBeInTheDocument();

    // Dismiss toast
    const dismissBtn = screen.getByTestId("dismiss-geo-error-btn");
    fireEvent.click(dismissBtn);

    expect(
      screen.queryByTestId("geolocation-error-toast")
    ).not.toBeInTheDocument();
  });
});
