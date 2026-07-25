"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Masonry from "react-masonry-css";
import { TidbitCard } from "./TidbitCard";
import type { Tidbit } from "@/lib/db/queries";

// react-masonry-css distributes children round-robin (item i -> column i % N),
// preserving each column's relative order — the "column-major" reading order
// R4 settles for, since a single global chronological DOM order isn't
// achievable with this library.
export const RENDER_CAP = 500;
const BREAKPOINTS = { default: 3, 1024: 2, 640: 1 };

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
  const sentinelRef = useRef<HTMLDivElement>(null);

  // No prop-sync effect needed: page.tsx keys MasonryFeed by
  // `${category}-${search}`, so a filter change remounts this component
  // fresh rather than updating props on the same instance.

  const loadMore = useCallback(async () => {
    if (loading || !cursor || items.length >= RENDER_CAP) return;
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
      setCursor(data.nextCursor);
    } catch {
      // Keep the previously-loaded items visible; surface a retry affordance instead.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, items.length, categorySlug, searchTerm]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const atCap = items.length >= RENDER_CAP;
  const atEnd = !cursor && !loading && items.length > 0;

  return (
    <div>
      <Masonry
        breakpointCols={BREAKPOINTS}
        className="flex w-auto -ml-5"
        columnClassName="pl-5 bg-clip-padding"
      >
        {items.map((tidbit) => (
          <TidbitCard key={tidbit.id} tidbit={tidbit} />
        ))}
      </Masonry>

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
            style={{ "--accent": "var(--accent-sky)" } as React.CSSProperties}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
