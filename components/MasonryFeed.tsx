"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TidbitCard } from "./TidbitCard";
import type { Tidbit } from "@/lib/db/queries";
import { accentStyle } from "@/lib/design/palette";
import { SkeletonCard } from "./SkeletonCard";
import posthog from "posthog-js";

export const RENDER_CAP = 500;
export const BREAKPOINTS = { default: 3, 1024: 2, 640: 1 };
const SKELETON_COUNT = 20;

export function MasonryFeed({
  initialItems,
  initialCursor,
  categorySlug,
  searchTerm,
}: {
  initialItems: Tidbit[];
  initialCursor: string | null;
  categorySlug?: string | null;
  searchTerm?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // No prop-sync effect needed: page.tsx keys MasonryFeed by
  // `${category}-${search}`, so a filter change remounts this component
  // fresh rather than updating props on the same instance.

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursor || items.length >= RENDER_CAP) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams();
      params.set("cursor", cursor);
      if (categorySlug) params.set("category", categorySlug);
      if (searchTerm) params.set("q", searchTerm);
      const response = await fetch(`/api/feed?${params.toString()}`);
      if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
      const data: { items: Tidbit[]; nextCursor: string | null } = await response.json();
      setItems((prev) => [...prev, ...data.items]);
      posthog.capture("feed_loaded_more", {
        items_loaded: data.items.length,
        total_items: items.length + data.items.length,
        category_slug: categorySlug ?? null,
      });
      setCursor(data.nextCursor);
    } catch {
      // Keep the previously-loaded items visible; surface a retry affordance instead.
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, items.length, categorySlug, searchTerm]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      }, { rootMargin: "1200px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const atCap = items.length >= RENDER_CAP;
  const atEnd = !cursor && !loading && items.length > 0;

  return (
    <div>
      <div className="masonry-grid">
        {items.map((tidbit) => (
          <div key={tidbit.id} className="masonry-grid-item">
            <TidbitCard tidbit={tidbit} />
          </div>
        ))}
        {loading && Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div key={`skeleton-${index}`} className="masonry-grid-item">
            <SkeletonCard />
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-1" />

      <div className="mt-6 flex flex-col items-center gap-3 pb-12 text-center">
        {loadError && (
          <p className="text-sm text-red-600">
            Couldn&apos;t load more tidbits.{" "}
            <button onClick={loadMore} className="underline">
              Try again
            </button>
          </p>
        )}
        {atCap && (
          <p className="text-sm text-ink-soft">
            Showing the first {RENDER_CAP} tidbits — use search or a category to see more.
          </p>
        )}
        {!atCap && atEnd && <p className="text-sm text-ink-soft">You&apos;ve seen every tidbit. 🎉</p>}
        {!atCap && cursor && !loadError && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="chip rounded-full px-5 py-2 font-display font-semibold disabled:opacity-60"
            style={accentStyle("var(--accent-sky)")}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
