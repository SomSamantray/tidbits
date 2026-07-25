import type { Tidbit } from "@/lib/db/queries";

function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export function TidbitCard({ tidbit }: { tidbit: Tidbit }) {
  return (
    <article
      className="card-shell mb-5 flex flex-col gap-3 p-5"
      style={{ "--accent": tidbit.category.accentColor } as React.CSSProperties}
    >
      <span
        className="chip inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold"
        style={{ "--accent": tidbit.category.accentColor } as React.CSSProperties}
      >
        {tidbit.category.name}
      </span>
      <h2 className="font-display text-lg font-semibold text-ink">{tidbit.header}</h2>
      <p className="text-sm leading-relaxed text-ink-soft">{tidbit.body}</p>

      <div className="mt-1 flex items-center gap-4 text-sm text-ink-soft">
        <span aria-label={`${tidbit.likeCount} likes`}>❤️ {formatCompact(tidbit.likeCount)}</span>
        <span aria-label={`${tidbit.shareCount} shares`}>🔗 {formatCompact(tidbit.shareCount)}</span>
      </div>
    </article>
  );
}
