import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders Preservation Houston Atlas title", () => {
    render(<App />);
    expect(screen.getByText(/Preservation Houston/i)).toBeDefined();
  });
});
