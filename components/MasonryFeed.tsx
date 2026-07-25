"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TidbitCard } from "./TidbitCard";
import type { Tidbit } from "@/lib/db/queries";
import { accentStyle } from "@/lib/design/palette";
import { SkeletonCard } from "./SkeletonCard";
import { packMasonry, type MasonryPlacement } from "@/lib/masonry";

export const RENDER_CAP = 500;
export const BREAKPOINTS = { default: 3, 1024: 2, 640: 1 };
const SKELETON_COUNT = 20;
const MASONRY_GAP = 20;

function columnCountForWidth(width: number) {
  if (width <= 640) return 1;
  if (width <= 1024) return 2;
  return 3;
}

function estimateHeight(bodyLength: number) {
  return Math.max(190, Math.min(280, 176 + bodyLength * 0.28));
}

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
  const layoutRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const [containerWidth, setContainerWidth] = useState(0);
  const [placements, setPlacements] = useState<MasonryPlacement[]>([]);
  const [layoutHeight, setLayoutHeight] = useState(0);

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

  const getLayoutEntries = useCallback(() => [
    ...items.map((tidbit) => ({ key: `tidbit-${tidbit.id}`, height: cardRefs.current.get(`tidbit-${tidbit.id}`)?.getBoundingClientRect().height ?? estimateHeight(tidbit.body.length) })),
    ...(loading ? Array.from({ length: SKELETON_COUNT }, (_, index) => ({ key: `skeleton-${index}`, height: 192 })) : []),
  ], [items, loading]);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(layout.clientWidth);
    });
    resizeObserver.observe(layout);
    setContainerWidth(layout.clientWidth);
    return () => resizeObserver.disconnect();
  }, []);

  const recalculateLayout = useCallback(() => {
    if (!containerWidth) return;
    const result = packMasonry(getLayoutEntries(), columnCountForWidth(containerWidth), MASONRY_GAP);
    setPlacements(result.placements);
    setLayoutHeight(result.height);
  }, [containerWidth, getLayoutEntries]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(recalculateLayout);
    if (typeof ResizeObserver === "undefined") return;
    const resizeObserver = new ResizeObserver(() => recalculateLayout());
    for (const element of cardRefs.current.values()) resizeObserver.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [recalculateLayout, getLayoutEntries]);

  const placementByKey = new Map(placements.map((placement) => [placement.key, placement]));
  const columnCount = columnCountForWidth(containerWidth);
  const columnWidth = containerWidth ? (containerWidth - MASONRY_GAP * (columnCount - 1)) / columnCount : 0;

  const atCap = items.length >= RENDER_CAP;
  const atEnd = !cursor && !loading && items.length > 0;

  return (
    <div>
      <div ref={layoutRef} className="masonry-layout" style={{ height: layoutHeight }}>
        {items.map((tidbit) => (
          <div
            key={tidbit.id}
            ref={(element) => {
              if (element) cardRefs.current.set(`tidbit-${tidbit.id}`, element);
              else cardRefs.current.delete(`tidbit-${tidbit.id}`);
            }}
            className="masonry-item"
            style={(() => {
              const placement = placementByKey.get(`tidbit-${tidbit.id}`);
              return placement ? { width: columnWidth, transform: `translate3d(${placement.column * (columnWidth + MASONRY_GAP)}px, ${placement.top}px, 0)` } : { width: columnWidth };
            })()}
          >
            <TidbitCard tidbit={tidbit} />
          </div>
        ))}
        {loading && Array.from({ length: SKELETON_COUNT }, (_, index) => {
          const placement = placementByKey.get(`skeleton-${index}`);
          return (
            <div
              key={`skeleton-${index}`}
              className="masonry-item"
              style={placement ? { width: columnWidth, transform: `translate3d(${placement.column * (columnWidth + MASONRY_GAP)}px, ${placement.top}px, 0)` } : { width: columnWidth }}
            >
              <SkeletonCard />
            </div>
          );
        })}
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
