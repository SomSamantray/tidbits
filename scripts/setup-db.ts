import { getDb } from "../lib/db/client";
import { applySchema } from "../lib/db/schema";
import { accentForIndex } from "../lib/design/palette";

const DEFAULT_CATEGORIES = [
  { slug: "science", name: "Science" },
  { slug: "history", name: "History" },
  { slug: "animals", name: "Animals" },
  { slug: "food", name: "Food" },
  { slug: "space", name: "Space" },
  { slug: "random", name: "Random" },
];

async function main() {
  const db = getDb();
  await applySchema(db);

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO categories (slug, name, accent_color) VALUES (?, ?, ?)",
      args: [category.slug, category.name, accentForIndex(index)],
    });
  }

  console.log("Database schema applied and default categories seeded.");
}

main().catch((error) => {
  console.error("Database setup failed:", error);
  process.exit(1);
});
