import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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
});
