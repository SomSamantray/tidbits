"use client";

import { type KeyboardEvent, type MouseEvent, useState } from "react";
import type { Tidbit } from "@/lib/db/queries";
import { accentStyle } from "@/lib/design/palette";
import { EngagementButtons } from "./EngagementButtons";

export function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  const [expanded, setExpanded] = useState(false);

  function toggleFromCard(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    setExpanded((value) => !value);
  }

  function toggleFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setExpanded((value) => !value);
  }

  return (
    <article
      className="card-shell tidbit-card mb-5 flex flex-col gap-3 p-5"
      tabIndex={0}
      data-expanded={expanded}
      aria-describedby={`tidbit-state-${tidbit.id}`}
      onClick={toggleFromCard}
      onKeyDown={toggleFromKeyboard}
      style={accentStyle(tidbit.category.accentColor)}
    >
      <span
        className="chip inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold"
        style={accentStyle(tidbit.category.accentColor)}
      >
        {tidbit.category.name}
      </span>
      <h2 className="font-display text-lg font-semibold text-ink">{tidbit.header}</h2>
      <p className="tidbit-body text-sm leading-relaxed text-ink-soft">{tidbit.body}</p>
      <span id={`tidbit-state-${tidbit.id}`} className="sr-only">
        {expanded ? "Tidbit expanded" : "Tidbit collapsed; activate to read the full tidbit"}
      </span>

      <EngagementButtons
        tidbitId={tidbit.id}
        header={tidbit.header}
        initialLikeCount={tidbit.likeCount}
        initialShareCount={tidbit.shareCount}
      />
    </article>
  );
}
