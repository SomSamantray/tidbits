import Link from "next/link";
import type { Category } from "@/lib/db/queries";

function hrefFor(slug: string | null, searchTerm: string | null): string {
  const params = new URLSearchParams();
  if (slug) params.set("category", slug);
  if (searchTerm) params.set("q", searchTerm);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function CategoryChips({
  categories,
  activeSlug,
  searchTerm,
}: {
  categories: Category[];
  activeSlug: string | null;
  searchTerm: string | null;
}) {
  return (
    <div className="mb-8 flex flex-wrap justify-center gap-2">
      <Link
        href={hrefFor(null, searchTerm)}
        data-active={!activeSlug}
        className="chip rounded-full px-4 py-1.5 text-sm font-semibold"
        style={{ "--accent": "var(--accent-sky)" } as React.CSSProperties}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={hrefFor(category.slug, searchTerm)}
          data-active={activeSlug === category.slug}
          className="chip rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ "--accent": category.accent_color } as React.CSSProperties}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
