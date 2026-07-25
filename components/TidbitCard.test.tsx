// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TidbitCard } from "./TidbitCard";
import type { Tidbit } from "@/lib/db/queries";

vi.mock("@/app/actions/engagement", () => ({
  like: vi.fn(),
  share: vi.fn(),
}));

function makeTidbit(): Tidbit {
  return {
    id: 1,
    header: "A Curious Header",
    body: "A long body that should start in a compact reading window and become fully readable after the card is toggled on a touch device.",
    createdAt: Date.now(),
    likeCount: 0,
    shareCount: 0,
    category: { slug: "science", name: "Science", accentColor: "#9BF6FF" },
  };
}

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

afterEach(cleanup);

describe("TidbitCard", () => {
  it("starts compact and toggles the complete body on card activation", () => {
    render(<TidbitCard tidbit={makeTidbit()} />);

    const card = screen.getByRole("article");
    const body = screen.getByText(/a long body/i);
    expect(card.getAttribute("data-expanded")).toBe("false");
    expect(body.classList.contains("tidbit-body")).toBe(true);

    fireEvent.click(card);
    expect(card.getAttribute("data-expanded")).toBe("true");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(card.getAttribute("data-expanded")).toBe("false");
  });

  it("does not toggle when an engagement control is activated", () => {
    render(<TidbitCard tidbit={makeTidbit()} />);

    fireEvent.click(screen.getByRole("button", { name: /like this tidbit/i }));
    expect(screen.getByRole("article").getAttribute("data-expanded")).toBe("false");
  });
});
