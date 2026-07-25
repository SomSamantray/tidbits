import { getFeedPage } from "@/lib/db/queries";
import { MasonryFeed } from "@/components/MasonryFeed";

// KTD5: read per request, never prerendered — likes/shares and new tidbits
// must always be fresh, and there's no cache layer to invalidate.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { items, nextCursor } = await getFeedPage({});

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <header className="mb-10 flex max-w-xl flex-col items-center gap-2 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">Tidbits</h1>
        <p className="text-lg text-ink-soft">
          Bite-sized trivia to make you smile, one card at a time.
        </p>
      </header>

      <main className="w-full max-w-5xl">
        {items.length === 0 ? (
          <p className="text-center text-ink-soft">
            No tidbits yet — add your first one from the admin page.
          </p>
        ) : (
          <MasonryFeed initialItems={items} initialCursor={nextCursor} />
        )}
      </main>
    </div>
  );
}
