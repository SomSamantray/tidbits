import type { Tidbit } from "@/lib/db/queries";
import { accentStyle } from "@/lib/design/palette";
import { EngagementButtons } from "./EngagementButtons";

export function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  return (
    <article
      className="card-shell mb-5 flex flex-col gap-3 p-5"
      style={accentStyle(tidbit.category.accentColor)}
    >
      <span
        className="chip inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold"
        style={accentStyle(tidbit.category.accentColor)}
      >
        {tidbit.category.name}
      </span>
      <h2 className="font-display text-lg font-semibold text-ink">{tidbit.header}</h2>
      <p className="text-sm leading-relaxed text-ink-soft">{tidbit.body}</p>

      <EngagementButtons
        tidbitId={tidbit.id}
        header={tidbit.header}
        initialLikeCount={tidbit.likeCount}
        initialShareCount={tidbit.shareCount}
      />
    </article>
  );
}
