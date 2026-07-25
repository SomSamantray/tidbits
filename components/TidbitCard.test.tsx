// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TidbitCard } from "./TidbitCard";
import type { Tidbit } from "@/lib/db/queries";

vi.mock("@/app/actions/engagement", () => ({
  like: vi.fn(),
  share: vi.fn(),
}));

function makeTidbit(overrides: Partial<Tidbit> = {}): Tidbit {
  return {
    id: 1,
    header: "A Curious Header",
    body: "A long body that should start in a compact reading window and become fully readable after the card is toggled on a touch device.",
    createdAt: Date.now(),
    likeCount: 0,
    shareCount: 0,
    category: { slug: "science", name: "Science", accentColor: "#9BF6FF" },
    ...overrides,
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
  it("renders blank-line-separated body segments as spaced paragraphs", () => {
    render(<TidbitCard tidbit={makeTidbit({ body: "First paragraph.\n\nSecond paragraph." })} />);

    const paragraphs = screen.getByRole("article").querySelectorAll(".tidbit-paragraph");
    expect([...paragraphs].map((paragraph) => paragraph.textContent)).toEqual([
      "First paragraph.",
      "Second paragraph.",
    ]);
    expect(paragraphs[1]?.classList.contains("tidbit-paragraph-spaced")).toBe(true);
  });

  it("keeps single line breaks inside one paragraph", () => {
    render(<TidbitCard tidbit={makeTidbit({ body: "First line\nsecond line" })} />);

    expect(screen.getByRole("article").querySelectorAll(".tidbit-paragraph")).toHaveLength(1);
  });

  it("renders a visible circular category badge while preserving the category name", () => {
    render(<TidbitCard tidbit={makeTidbit()} />);

    expect(screen.getByRole("article").querySelector(".tidbit-category-badge")?.textContent).toBe("🔬");
    expect(screen.getByText("Science")).toBeDefined();
  });

  it("uses the fallback emoji for an unknown category slug", () => {
    render(<TidbitCard tidbit={makeTidbit({ category: { slug: "other", name: "Other", accentColor: "#FFD6A5" } })} />);

    expect(screen.getByRole("article").querySelector(".tidbit-category-badge")?.textContent).toBe("✨");
  });

  it("keeps a short body natural and non-expandable", async () => {
    render(<TidbitCard tidbit={makeTidbit({ body: "A short fact." })} />);

    const bodyRegion = screen.getByRole("article").querySelector(".tidbit-card-body");
    await waitFor(() => expect(bodyRegion?.getAttribute("data-collapsible")).toBe("false"));
    expect(bodyRegion?.getAttribute("data-expanded")).toBeNull();
    expect(screen.getByRole("article").querySelector(".read-more-hint")).toBeNull();
  });

  it("keeps a short body natural on mobile", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    render(<TidbitCard tidbit={makeTidbit({ body: "A short fact." })} />);

    const bodyRegion = screen.getByRole("article").querySelector(".tidbit-card-body");
    await waitFor(() => expect(bodyRegion?.getAttribute("data-collapsible")).toBe("false"));
    expect(bodyRegion?.getAttribute("data-expanded")).toBeNull();
    expect(screen.getByRole("article").querySelector(".read-more-hint")).toBeNull();
  });

  it("is expanded on desktop and does not change on pointer movement", async () => {
    render(<TidbitCard tidbit={makeTidbit()} />);

    const bodyRegion = screen.getByText(/a long body/i).closest(".tidbit-card-body");
    expect(bodyRegion).not.toBeNull();
    await waitFor(() => expect(bodyRegion?.getAttribute("data-collapsible")).toBe("true"));
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("true");
    expect(screen.getByRole("article").querySelector(".tidbit-body")?.classList.contains("tidbit-body")).toBe(true);

    fireEvent.pointerEnter(bodyRegion!, { pointerType: "mouse" });
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("true");

    fireEvent.pointerEnter(screen.getByRole("button", { name: /like this tidbit/i }), { pointerType: "mouse" });
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("true");

    fireEvent.pointerLeave(screen.getByRole("article"), { pointerType: "mouse" });
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("true");
    expect(screen.getByRole("article").querySelector(".read-more-hint")).toBeNull();
  });

  it("toggles a long body on body activation for mobile-sized interaction", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    render(<TidbitCard tidbit={makeTidbit()} />);

    const bodyRegion = screen.getByText(/a long body/i).closest(".tidbit-card-body");
    await waitFor(() => expect(bodyRegion?.getAttribute("data-collapsible")).toBe("true"));
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("false");
    fireEvent.click(bodyRegion!);
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("true");

    fireEvent.click(bodyRegion!);
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("false");

    fireEvent.keyDown(bodyRegion!, { key: "Enter" });
    expect(bodyRegion?.getAttribute("data-expanded")).toBe("true");
  });

  it("does not toggle when an engagement control is activated", async () => {
    render(<TidbitCard tidbit={makeTidbit()} />);

    const bodyRegion = screen.getByRole("article").querySelector(".tidbit-card-body");
    await waitFor(() => expect(bodyRegion?.getAttribute("data-collapsible")).toBe("true"));

    const likeButton = screen.getByRole("button", { name: /like this tidbit/i });
    fireEvent.click(likeButton);
    fireEvent.keyDown(likeButton, { key: "Enter" });
    fireEvent.keyDown(likeButton, { key: " " });
    expect(screen.getByRole("article").querySelector(".tidbit-card-body")?.getAttribute("data-expanded")).toBe("true");
  });
});
