import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TimelineBar from "./TimelineBar";
import { HOUSTON_HISTORIC_ERAS } from "./EraShortcuts";

describe("TimelineBar", () => {
  it("renders dual-thumb slider inputs, milestone marks, and structure count", () => {
    render(<TimelineBar totalVisibleCount={1845} />);

    expect(screen.getByLabelText("Start year")).toBeInTheDocument();
    expect(screen.getByLabelText("End year")).toBeInTheDocument();
    expect(screen.getAllByText("1836").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2026").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1,845")).toBeInTheDocument();
    expect(screen.getByLabelText("Play timelapse")).toBeInTheDocument();
  });

  it("toggles play and pause on playhead button click", () => {
    render(<TimelineBar />);

    const playBtn = screen.getByTestId("play-pause-btn");
    expect(screen.getByLabelText("Play timelapse")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(screen.getByLabelText("Pause timelapse")).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(screen.getByLabelText("Play timelapse")).toBeInTheDocument();
  });

  it("allows selecting playback speeds (1x, 2x, 5x)", () => {
    render(<TimelineBar />);

    const speed2x = screen.getByRole("button", { name: "2x" });
    const speed5x = screen.getByRole("button", { name: "5x" });

    fireEvent.click(speed2x);
    expect(speed2x).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(speed5x);
    expect(speed5x).toHaveAttribute("aria-pressed", "true");
    expect(speed2x).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles animation loop state", () => {
    render(<TimelineBar />);

    const loopBtn = screen.getByTestId("loop-toggle-btn");
    expect(loopBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(loopBtn);
    expect(loopBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(loopBtn);
    expect(loopBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("updates start year slider input", () => {
    const onYearChange = vi.fn();
    render(
      <TimelineBar
        yearMin={1836}
        yearMax={2026}
        onYearChange={onYearChange}
      />
    );

    const minSlider = screen.getByLabelText("Start year");
    fireEvent.change(minSlider, { target: { value: "1900" } });

    expect(onYearChange).toHaveBeenCalledWith(1900, 2026);
  });

  it("updates end year slider input", () => {
    const onYearChange = vi.fn();
    render(
      <TimelineBar
        yearMin={1836}
        yearMax={2026}
        onYearChange={onYearChange}
      />
    );

    const maxSlider = screen.getByLabelText("End year");
    fireEvent.change(maxSlider, { target: { value: "1945" } });

    expect(onYearChange).toHaveBeenCalledWith(1836, 1945);
  });

  it("resets timeline when reset button is clicked", () => {
    const onYearChange = vi.fn();
    render(
      <TimelineBar
        yearMin={1910}
        yearMax={1930}
        onYearChange={onYearChange}
      />
    );

    const resetBtn = screen.getByTestId("reset-timeline-btn");
    fireEvent.click(resetBtn);

    expect(onYearChange).toHaveBeenCalledWith(1836, 2026);
  });

  it("selects all 5 historic Houston eras via shortcut buttons", () => {
    const onYearChange = vi.fn();
    render(
      <TimelineBar
        yearMin={1836}
        yearMax={2026}
        onYearChange={onYearChange}
      />
    );

    // 1. Republic & Frontier (1836 - 1879)
    const republicBtn = screen.getByRole("button", {
      name: /Republic & Frontier/i,
    });
    fireEvent.click(republicBtn);
    expect(onYearChange).toHaveBeenCalledWith(1836, 1879);

    // 2. Victorian & Railroad Boom (1880 - 1914)
    const victorianBtn = screen.getByRole("button", {
      name: /Victorian & Railroad Boom/i,
    });
    fireEvent.click(victorianBtn);
    expect(onYearChange).toHaveBeenCalledWith(1880, 1914);

    // 3. Oil Boom & Art Deco (1915 - 1939)
    const oilBoomBtn = screen.getByRole("button", {
      name: /Oil Boom & Art Deco/i,
    });
    fireEvent.click(oilBoomBtn);
    expect(onYearChange).toHaveBeenCalledWith(1915, 1939);

    // 4. Post-War Boom & Mid-Century (1945 - 1969)
    const postWarBtn = screen.getByRole("button", {
      name: /Post-War Boom & Mid-Century/i,
    });
    fireEvent.click(postWarBtn);
    expect(onYearChange).toHaveBeenCalledWith(1945, 1969);

    // 5. Modern Houston (1970 - 2026)
    const modernBtn = screen.getByRole("button", {
      name: /Modern Houston/i,
    });
    fireEvent.click(modernBtn);
    expect(onYearChange).toHaveBeenCalledWith(1970, 2026);
  });

  it("highlights the currently active historic era button", () => {
    const era = HOUSTON_HISTORIC_ERAS[1]; // Victorian: 1880 - 1914
    render(<TimelineBar yearMin={era.startYear} yearMax={era.endYear} />);

    const victorianBtn = screen.getByRole("button", {
      name: /Victorian & Railroad Boom/i,
    });
    expect(victorianBtn).toHaveAttribute("aria-pressed", "true");

    const republicBtn = screen.getByRole("button", {
      name: /Republic & Frontier/i,
    });
    expect(republicBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("delegates to controlled onTogglePlay when provided", () => {
    const onTogglePlay = vi.fn();
    render(
      <TimelineBar
        isPlaying={false}
        onTogglePlay={onTogglePlay}
      />
    );

    const playBtn = screen.getByTestId("play-pause-btn");
    fireEvent.click(playBtn);
    expect(onTogglePlay).toHaveBeenCalled();
  });
});
