"use client";

import { type KeyboardEvent, type MouseEvent, useState } from "react";
import type { Tidbit } from "@/lib/db/queries";
import { accentStyle } from "@/lib/design/palette";
import { EngagementButtons } from "./EngagementButtons";

const CATEGORY_ICONS: Record<string, string> = {
  animals: "🐾",
  food: "🍽️",
  history: "🏛️",
  science: "🔬",
  space: "🚀",
  random: "✨",
};

export function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  const [expanded, setExpanded] = useState(false);

  function toggleFromBody(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    setExpanded((value) => !value);
  }

  function toggleFromBodyKeyboard(event: KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setExpanded((value) => !value);
  }

  return (
    <article className="card-shell tidbit-card p-5" style={accentStyle(tidbit.category.accentColor)}>
      <span
        className="tidbit-category-meta text-sm font-bold"
        style={accentStyle(tidbit.category.accentColor)}
      >
        <span aria-hidden="true">{CATEGORY_ICONS[tidbit.category.slug] ?? "✨"}</span>
        <span>{tidbit.category.name}</span>
      </span>
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
        data-expanded={expanded}
        aria-expanded={expanded}
        aria-describedby={`tidbit-state-${tidbit.id}`}
        onClick={toggleFromBody}
        onKeyDown={toggleFromBodyKeyboard}
      >
        <h2 className="font-display text-lg font-semibold text-ink">{tidbit.header}</h2>
        <div className="tidbit-copy-window">
          <p className="tidbit-body text-sm leading-relaxed text-ink-soft">{tidbit.body}</p>
          {!expanded && <span className="read-more-hint" aria-hidden="true">··· <span className="desktop-hint">Hover</span><span className="mobile-hint">Tap</span> to read more</span>}
        </div>
        <span id={`tidbit-state-${tidbit.id}`} className="sr-only">
          {expanded ? "Tidbit expanded" : "Tidbit collapsed; activate to read the full tidbit"}
        </span>
      </div>
    </article>
  );
}
