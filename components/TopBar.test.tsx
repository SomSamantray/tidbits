// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TopBar } from "./TopBar";

afterEach(cleanup);

describe("TopBar", () => {
  it("exposes the About action and functional theme toggle", () => {
    render(<TopBar />);
    expect(screen.getByRole("button", { name: "About" })).toBeDefined();
    const toggle = screen.getByRole("button", { name: "Switch to dark theme" });
    expect(toggle).toBeDefined();
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("tidbits-theme")).toBe("dark");
  });

  it("opens an accessible About dialog and closes with Escape", () => {
    render(<TopBar />);
    fireEvent.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByRole("dialog", { name: /about tidbits/i })).toBeDefined();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
