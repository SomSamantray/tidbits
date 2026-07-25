"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Tidbit } from "@/lib/db/queries";
import { accentStyle } from "@/lib/design/palette";
import { EngagementButtons } from "./EngagementButtons";
import posthog from "posthog-js";

const CATEGORY_ICONS: Record<string, string> = {
  animals: "🐾",
  food: "🍽️",
  history: "🏛️",
  science: "🔬",
  space: "🚀",
  random: "✨",
};

const PREVIEW_LINES = 5;

function splitBodyIntoParagraphs(body: string) {
  return body
    .replace(/\r\n?/gu, "\n")
    .split(/\n\s*\n/gu)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  const [expanded, setExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsible, setCollapsible] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const paragraphs = splitBodyIntoParagraphs(tidbit.body);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const updateViewportMode = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      setExpanded(!mobile);
    };

    updateViewportMode();
    mediaQuery.addEventListener("change", updateViewportMode);
    return () => mediaQuery.removeEventListener("change", updateViewportMode);
  }, []);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(body).lineHeight) || 24;
      const previewHeight = lineHeight * PREVIEW_LINES;
      const overflowing = body.scrollHeight > previewHeight + 1;
      // jsdom has no layout engine. The fallback keeps interaction tests useful;
      // browsers always use the rendered overflow measurement above.
      const fallbackOverflow = typeof ResizeObserver === "undefined" && tidbit.body.length > 120;
      setCollapsible(overflowing || fallbackOverflow);
      if (!overflowing && !fallbackOverflow) setExpanded(true);
    };

    const frame = requestAnimationFrame(measure);
    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(body);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [tidbit.body]);

  function toggleFromBody(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    if (!collapsible) return;
    if (!isMobile) return;
    const next = !expanded;
    setExpanded(next);
    if (next) posthog.capture("tidbit_expanded", { tidbit_id: tidbit.id, method: "touch_tap" });
  }

  function toggleFromBodyKeyboard(event: KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    if (!collapsible) return;
    if (!isMobile) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const next = !expanded;
    setExpanded(next);
    if (next) posthog.capture("tidbit_expanded", { tidbit_id: tidbit.id, method: "keyboard" });
  }

  return (
    <article
      className="card-shell tidbit-card p-5"
      style={accentStyle(tidbit.category.accentColor)}
    >
      <div
        className="tidbit-category-meta text-sm font-bold"
        style={accentStyle(tidbit.category.accentColor)}
      >
        <span className="tidbit-category-badge" aria-hidden="true">
          {CATEGORY_ICONS[tidbit.category.slug] ?? "✨"}
        </span>
        <span>{tidbit.category.name}</span>
      </div>
      <div className="engagement-slab">
        <EngagementButtons
          tidbitId={tidbit.id}
          header={tidbit.header}
          body={tidbit.body}
          initialLikeCount={tidbit.likeCount}
          initialShareCount={tidbit.shareCount}
        />
      </div>
      <div
        className="tidbit-card-body"
        role="button"
        tabIndex={0}
        ref={bodyRef}
        data-collapsible={collapsible}
        data-expanded={collapsible ? expanded : undefined}
        aria-expanded={collapsible ? expanded : undefined}
        aria-describedby={collapsible ? `tidbit-state-${tidbit.id}` : undefined}
        onClick={toggleFromBody}
        onKeyDown={toggleFromBodyKeyboard}
        onFocus={() => {
          if (isMobile && collapsible) setExpanded(true);
        }}
      >
        <h2 className="font-display text-lg font-semibold text-ink">{tidbit.header}</h2>
        <div className="tidbit-copy-window">
          <div className="tidbit-body text-sm leading-relaxed text-ink-soft">
            {paragraphs.map((paragraph, index) => (
              <p key={`${tidbit.id}-paragraph-${index}`} className={index > 0 ? "tidbit-paragraph tidbit-paragraph-spaced" : "tidbit-paragraph"}>
                {paragraph}
              </p>
            ))}
          </div>
          {collapsible && !expanded && <span className="read-more-hint" aria-hidden="true">··· <span className="desktop-hint">Hover</span><span className="mobile-hint">Tap</span> to read more</span>}
        </div>
        {collapsible && <span id={`tidbit-state-${tidbit.id}`} className="sr-only">
          {expanded ? "Tidbit expanded" : "Tidbit collapsed; activate to read the full tidbit"}
        </span>}
      </div>
    </article>
  );
}
