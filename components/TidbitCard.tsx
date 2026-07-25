"use client";

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

function splitBodyIntoParagraphs(body: string) {
  return body
    .replace(/\r\n?/gu, "\n")
    .split(/\n\s*\n/gu)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  const paragraphs = splitBodyIntoParagraphs(tidbit.body);

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
      <div className="tidbit-card-body">
        <h2 className="font-display text-lg font-semibold text-ink">{tidbit.header}</h2>
        <div className="tidbit-body text-sm leading-relaxed text-ink-soft">
          {paragraphs.map((paragraph, index) => (
            <p key={`${tidbit.id}-paragraph-${index}`} className={index > 0 ? "tidbit-paragraph tidbit-paragraph-spaced" : "tidbit-paragraph"}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
