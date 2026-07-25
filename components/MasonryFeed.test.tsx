// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MasonryFeed, RENDER_CAP } from "./MasonryFeed";
import type { Tidbit } from "@/lib/db/queries";

function makeTidbit(overrides: Partial<Tidbit> = {}): Tidbit {
  return {
    id: overrides.id ?? Math.random(),
    header: overrides.header ?? "Header",
    body: overrides.body ?? "Body",
    createdAt: overrides.createdAt ?? Date.now(),
    likeCount: overrides.likeCount ?? 0,
    shareCount: overrides.shareCount ?? 0,
    category: overrides.category ?? { slug: "science", name: "Science", accentColor: "#9BF6FF" },
  };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  window.dispatchEvent(new Event("resize"));
}

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  // jsdom has no IntersectionObserver; MasonryFeed only needs it not to throw.
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  setViewportWidth(1280);
});

describe("MasonryFeed", () => {
  it("renders cards as direct, source-ordered masonry items without transforms", () => {
    const { container } = render(<MasonryFeed initialItems={[
      makeTidbit({ id: 1, header: "A" }),
      makeTidbit({ id: 2, header: "B" }),
      makeTidbit({ id: 3, header: "C" }),
      makeTidbit({ id: 4, header: "D" }),
    ]} initialCursor={null} />);
    const grid = container.querySelector(".masonry-grid");
    const items = [...container.querySelectorAll(".masonry-grid-item")];
    expect(grid).not.toBeNull();
    expect(items).toHaveLength(4);
    expect(items.every((item) => item.parentElement === grid)).toBe(true);
    expect(items.map((item) => item.textContent?.includes("A"))).toEqual([true, false, false, false]);
    expect(items.every((item) => item.style.transform === "")).toBe(true);
    cleanup();
  });

  it("shows the end-of-feed message when there is no next cursor and items exist", () => {
    render(<MasonryFeed initialItems={[makeTidbit()]} initialCursor={null} />);
    expect(screen.getByText(/you've seen every tidbit/i)).toBeDefined();
    cleanup();
  });

  it("shows the render-cap prompt instead of a Load more button once the cap is reached", () => {
    const items = Array.from({ length: RENDER_CAP }, (_, i) => makeTidbit({ id: i }));
    render(<MasonryFeed initialItems={items} initialCursor="some-cursor" />);
    expect(screen.getByText(/showing the first/i)).toBeDefined();
    expect(screen.queryByText(/^load more$/i)).toBeNull();
    cleanup();
  });

  it("shows a Load more button when more results are available and under the cap", () => {
    render(<MasonryFeed initialItems={[makeTidbit()]} initialCursor="some-cursor" />);
    expect(screen.getByText(/load more/i)).toBeDefined();
    cleanup();
  });

  it("shows a retry banner and keeps existing items when loading more fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));

    render(<MasonryFeed initialItems={[makeTidbit({ id: 1, header: "Kept" })]} initialCursor="some-cursor" />);
    fireEvent.click(screen.getByText(/load more/i));

    await waitFor(() => expect(screen.getByText(/couldn't load more tidbits/i)).toBeDefined());
    expect(screen.getByText("Kept")).toBeDefined();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows stable skeleton cards while the next page is loading", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((resolve) => {
      resolveRequest = resolve;
    })));

    const { container } = render(<MasonryFeed initialItems={[makeTidbit()]} initialCursor="some-cursor" />);
    fireEvent.click(screen.getByText(/load more/i));
    await waitFor(() => expect(container.querySelectorAll(".skeleton-card").length).toBe(20));
    expect(screen.getByText("Header")).toBeDefined();

    resolveRequest?.({ ok: true, json: async () => ({ items: [], nextCursor: null }) });
    await waitFor(() => expect(container.querySelectorAll(".skeleton-card").length).toBe(0));
    cleanup();
    vi.unstubAllGlobals();
  });
});
