import { ACCENT_PALETTE } from "@/lib/design/palette";

const SAMPLE_CARDS = [
  {
    header: "Octopuses have three hearts",
    body: "Two pump blood to the gills, one to the rest of the body — and that third heart stops beating when they swim, which is why they prefer crawling.",
    accent: ACCENT_PALETTE[0].hex,
  },
  {
    header: "Honey never spoils",
    body: "Archaeologists have found pots of honey in ancient Egyptian tombs that are thousands of years old and still perfectly edible.",
    accent: ACCENT_PALETTE[3].hex,
  },
  {
    header: "Bananas are berries, strawberries aren't",
    body: "Botanically, a berry needs seeds throughout its flesh. Bananas qualify; strawberries — with seeds only on the outside — don't.",
    accent: ACCENT_PALETTE[5].hex,
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12 sm:px-8">
      <header className="mb-10 flex max-w-xl flex-col items-center gap-2 text-center">
        <h1 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
          Tidbits
        </h1>
        <p className="text-lg text-ink-soft">
          Bite-sized trivia to make you smile, one card at a time.
        </p>
      </header>

      <main className="grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SAMPLE_CARDS.map((card) => (
          <article
            key={card.header}
            className="card-shell flex flex-col gap-3 p-5"
            style={{ "--accent": card.accent } as React.CSSProperties}
          >
            <h2 className="font-display text-lg font-semibold text-ink">
              {card.header}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">
              {card.body}
            </p>
          </article>
        ))}
      </main>
    </div>
  );
}
