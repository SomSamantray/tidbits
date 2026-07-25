// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./TopBar";

afterEach(cleanup);

describe("TopBar", () => {
  it("exposes the About action and system-theme indicator", () => {
    render(<TopBar />);
    expect(screen.getByRole("button", { name: "About" })).toBeDefined();
    expect(screen.getByLabelText(/theme follows your device/i)).toBeDefined();
  });

  it("opens an accessible About dialog and closes with Escape", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByRole("dialog", { name: /about tidbits/i })).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
