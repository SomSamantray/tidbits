// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SearchBar } from "./SearchBar";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  push.mockClear();
  vi.useFakeTimers();
});

describe("SearchBar", () => {
  it("navigates to /?q=<term> after the debounce window, not on every keystroke", () => {
    render(<SearchBar initialValue="" />);
    const input = screen.getByLabelText(/search tidbits/i);

    fireEvent.change(input, { target: { value: "octo" } });
    expect(push).not.toHaveBeenCalled();

    vi.advanceTimersByTime(349);
    expect(push).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(push).toHaveBeenCalledWith("/?q=octo");
    cleanup();
    vi.useRealTimers();
  });

  it("navigates to / (no q param) when the search term is cleared", () => {
    render(<SearchBar initialValue="octo" />);
    const input = screen.getByLabelText(/search tidbits/i);

    fireEvent.change(input, { target: { value: "" } });
    vi.advanceTimersByTime(350);

    expect(push).toHaveBeenCalledWith("/");
    cleanup();
    vi.useRealTimers();
  });
});
