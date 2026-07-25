import Link from "next/link";
import { getFeedPage, listCategories } from "@/lib/db/queries";
import { MasonryFeed } from "@/components/MasonryFeed";
import { CategoryChips } from "@/components/CategoryChips";
import { SearchBar } from "@/components/SearchBar";
import { TopBar } from "@/components/TopBar";

// KTD5: read per request, never prerendered — likes/shares and new tidbits
// must always be fresh, and there's no cache layer to invalidate.
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category ?? null;
  const searchTerm = params.q ?? null;

  const [categories, { items, nextCursor }] = await Promise.all([
    listCategories(),
    getFeedPage({ categorySlug, searchTerm }),
  ]);

  const isFiltered = Boolean(categorySlug || searchTerm);

  return (
    <div className="feed-shell flex flex-1 flex-col items-center px-3 py-5 sm:px-4 lg:px-6">
      <TopBar />
      <header className="mb-8 mt-10 flex max-w-xl flex-col items-center gap-2 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Tidbits</h1>
        <p className="text-lg text-ink-soft">
          Bite-sized trivia to make you smile, one card at a time.
        </p>
      </header>

      <SearchBar initialValue={searchTerm ?? ""} />
      <CategoryChips categories={categories} activeSlug={categorySlug} searchTerm={searchTerm} />

      <main className="w-full max-w-[92rem]">
        {items.length === 0 && isFiltered && (
          <p className="text-center text-ink-soft">
            No tidbits match{searchTerm ? ` "${searchTerm}"` : " that filter"}.{" "}
            <Link href="/" className="underline">
              Clear search &amp; filters
            </Link>
          </p>
        )}
        {items.length === 0 && !isFiltered && (
          <p className="text-center text-ink-soft">
            No tidbits yet — add your first one from the admin page.
          </p>
        )}
        {items.length > 0 && (
          <MasonryFeed
            key={`${categorySlug ?? ""}-${searchTerm ?? ""}`}
            initialItems={items}
            initialCursor={nextCursor}
            categorySlug={categorySlug}
            searchTerm={searchTerm}
          />
        )}
      </main>
    </div>
  );
}
