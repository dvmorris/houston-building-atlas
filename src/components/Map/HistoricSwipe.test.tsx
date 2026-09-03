import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  HistoricSwipe,
  getHistoricClipPath,
} from "./HistoricSwipe";

describe("HistoricSwipe component", () => {
  it("renders comparison divider slider with Modern and 1915 Historic labels", () => {
    const onPositionChange = vi.fn();
    render(
      <HistoricSwipe
        position={50}
        onPositionChange={onPositionChange}
      />
    );

    const slider = screen.getByRole("slider", {
      name: /Map comparison swipe divider/i,
    });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");

    expect(screen.getByTestId("historic-swipe-left-label")).toHaveTextContent(
      "Modern"
    );
    expect(screen.getByTestId("historic-swipe-right-label")).toHaveTextContent(
      "1915 Historic"
    );
    expect(screen.getByTestId("historic-swipe-handle")).toBeInTheDocument();
  });

  it("clamps position between 0% and 100%", () => {
    const onPositionChange = vi.fn();
    const { rerender } = render(
      <HistoricSwipe
        position={-20}
        onPositionChange={onPositionChange}
      />
    );

    let slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
    expect(slider.style.left).toBe("0%");

    rerender(
      <HistoricSwipe
        position={150}
        onPositionChange={onPositionChange}
      />
    );
    slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "100");
    expect(slider.style.left).toBe("100%");
  });

  it("handles keyboard navigation (left, right, home, end, reset)", () => {
    const onPositionChange = vi.fn();
    render(
      <HistoricSwipe
        position={50}
        onPositionChange={onPositionChange}
      />
    );

    const slider = screen.getByRole("slider");

    // ArrowLeft decrements by 2
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(onPositionChange).toHaveBeenCalledWith(48);

    // ArrowRight increments by 2
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(onPositionChange).toHaveBeenCalledWith(52);

    // Shift + ArrowLeft decrements by 10
    fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
    expect(onPositionChange).toHaveBeenCalledWith(40);

    // Shift + ArrowRight increments by 10
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(onPositionChange).toHaveBeenCalledWith(60);

    // Home jumps to 0
    fireEvent.keyDown(slider, { key: "Home" });
    expect(onPositionChange).toHaveBeenCalledWith(0);

    // End jumps to 100
    fireEvent.keyDown(slider, { key: "End" });
    expect(onPositionChange).toHaveBeenCalledWith(100);

    // 'r' resets to 50
    fireEvent.keyDown(slider, { key: "r" });
    expect(onPositionChange).toHaveBeenCalledWith(50);
  });

  it("handles mouse dragging and updates position", () => {
    const onPositionChange = vi.fn();
    const parent = document.createElement("div");
    vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 600,
      right: 1000,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const containerRef = { current: parent };

    render(
      <HistoricSwipe
        position={50}
        onPositionChange={onPositionChange}
        containerRef={containerRef}
      />
    );

    const slider = screen.getByRole("slider");

    // Start drag
    fireEvent.mouseDown(slider, { clientX: 500 });
    expect(onPositionChange).toHaveBeenCalledWith(50);

    // Drag move to 750px (75%)
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 750 }));
    });
    expect(onPositionChange).toHaveBeenCalledWith(75);

    // Drag move clamped past right edge
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 1200 }));
    });
    expect(onPositionChange).toHaveBeenCalledWith(100);

    // Drag move clamped past left edge
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: -100 }));
    });
    expect(onPositionChange).toHaveBeenCalledWith(0);

    // Mouse up ends drag
    act(() => {
      window.dispatchEvent(new MouseEvent("mouseup"));
    });

    // Subsequent mousemove should not fire onPositionChange
    onPositionChange.mockClear();
    act(() => {
      window.dispatchEvent(new MouseEvent("mousemove", { clientX: 300 }));
    });
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it("handles touch dragging on mobile viewports", () => {
    const onPositionChange = vi.fn();
    const parent = document.createElement("div");
    vi.spyOn(parent, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 500,
      height: 400,
      right: 500,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const containerRef = { current: parent };

    render(
      <HistoricSwipe
        position={50}
        onPositionChange={onPositionChange}
        containerRef={containerRef}
      />
    );

    const slider = screen.getByRole("slider");

    // Touch start
    fireEvent.touchStart(slider, {
      touches: [{ clientX: 250 }],
    });
    expect(onPositionChange).toHaveBeenCalledWith(50);

    // Touch move to 350px (70%)
    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [{ clientX: 350 } as unknown as Touch],
        })
      );
    });
    expect(onPositionChange).toHaveBeenCalledWith(70);

    // Touch end
    act(() => {
      window.dispatchEvent(new TouchEvent("touchend"));
    });

    onPositionChange.mockClear();
    act(() => {
      window.dispatchEvent(
        new TouchEvent("touchmove", {
          touches: [{ clientX: 100 } as unknown as Touch],
        })
      );
    });
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it("triggers onToggle callback when close button is clicked", () => {
    const onToggle = vi.fn();
    render(
      <HistoricSwipe
        position={50}
        onPositionChange={vi.fn()}
        onToggle={onToggle}
      />
    );

    const closeBtn = screen.getByTestId("historic-swipe-close-btn");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("opens historic layer menu and switches active layer", () => {
    const onLayerChange = vi.fn();
    render(
      <HistoricSwipe
        position={50}
        onPositionChange={vi.fn()}
        layerId="usgs-1915"
        onLayerChange={onLayerChange}
      />
    );

    const selectBtn = screen.getByTestId("historic-layer-select-btn");
    expect(selectBtn).toHaveTextContent("1915 USGS Topo");

    // Click to open menu
    fireEvent.click(selectBtn);
    expect(screen.getByTestId("historic-layer-menu")).toBeInTheDocument();

    // Select Sanborn 1924 option
    const sanbornOption = screen.getByTestId(
      "historic-layer-option-sanborn-1924"
    );
    expect(sanbornOption).toBeInTheDocument();
    fireEvent.click(sanbornOption);

    expect(onLayerChange).toHaveBeenCalledWith("sanborn-1924");
  });

  it("calculates correct clip-path string for various swipe positions", () => {
    expect(getHistoricClipPath(50)).toBe(
      "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)"
    );
    expect(getHistoricClipPath(0)).toBe(
      "polygon(0% 0, 100% 0, 100% 100%, 0% 100%)"
    );
    expect(getHistoricClipPath(100)).toBe(
      "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)"
    );
    // Clamping test
    expect(getHistoricClipPath(-10)).toBe(
      "polygon(0% 0, 100% 0, 100% 100%, 0% 100%)"
    );
    expect(getHistoricClipPath(120)).toBe(
      "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)"
    );
  });
});
