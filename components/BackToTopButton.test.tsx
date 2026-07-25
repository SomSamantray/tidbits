// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BackToTopButton } from "./BackToTopButton";

afterEach(cleanup);

beforeEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  window.scrollTo = vi.fn();
});

describe("BackToTopButton", () => {
  it("appears after scrolling past the visibility threshold", () => {
    render(<BackToTopButton />);
    expect(screen.queryByRole("button", { name: /back to top/i })).toBeNull();

    window.scrollY = 481;
    fireEvent.scroll(window);

    expect(screen.getByRole("button", { name: /back to top/i })).toBeDefined();
  });

  it("scrolls smoothly to the top when motion is allowed", () => {
    render(<BackToTopButton />);
    window.scrollY = 600;
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button", { name: /back to top/i }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("uses instant scrolling when reduced motion is preferred", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    render(<BackToTopButton />);
    window.scrollY = 600;
    fireEvent.scroll(window);

    fireEvent.click(screen.getByRole("button", { name: /back to top/i }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });
});
