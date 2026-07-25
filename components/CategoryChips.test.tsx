// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CategoryChips } from "./CategoryChips";
import type { Category } from "@/lib/db/queries";

const CATEGORIES: Category[] = [
  { id: 1, slug: "science", name: "Science", accent_color: "#9BF6FF" },
  { id: 2, slug: "history", name: "History", accent_color: "#FFD6A5" },
];

afterEach(cleanup);

describe("CategoryChips", () => {
  it("renders an All chip plus one chip per category", () => {
    render(<CategoryChips categories={CATEGORIES} activeSlug={null} searchTerm={null} />);
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getByText("Science")).toBeDefined();
    expect(screen.getByText("History")).toBeDefined();
  });

  it("marks All active and links to / when no category is selected", () => {
    render(<CategoryChips categories={CATEGORIES} activeSlug={null} searchTerm={null} />);
    const allChip = screen.getByText("All").closest("a");
    expect(allChip?.getAttribute("data-active")).toBe("true");
    expect(allChip?.getAttribute("href")).toBe("/");
  });

  it("marks the selected category active and preserves the search term in its link", () => {
    render(<CategoryChips categories={CATEGORIES} activeSlug="science" searchTerm="octopus" />);
    const scienceChip = screen.getByText("Science").closest("a");
    expect(scienceChip?.getAttribute("data-active")).toBe("true");
    expect(scienceChip?.getAttribute("href")).toBe("/?category=science&q=octopus");

    const allChip = screen.getByText("All").closest("a");
    expect(allChip?.getAttribute("data-active")).toBe("false");
    expect(allChip?.getAttribute("href")).toBe("/?q=octopus");
  });
});
