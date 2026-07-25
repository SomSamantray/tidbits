// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("renders the complete long body without expansion or clipping semantics", () => {
    render(<TidbitCard tidbit={makeTidbit()} />);

    const bodyRegion = screen.getByText(/a long body/i).closest(".tidbit-card-body");
    expect(bodyRegion).not.toBeNull();
    expect(bodyRegion?.getAttribute("role")).toBeNull();
    expect(bodyRegion?.getAttribute("tabindex")).toBeNull();
    expect(bodyRegion?.getAttribute("data-collapsible")).toBeNull();
    expect(screen.getByText(/fully readable after the card is toggled/i)).toBeDefined();
    expect(screen.getByRole("article").querySelector(".read-more-hint")).toBeNull();
  });
});
