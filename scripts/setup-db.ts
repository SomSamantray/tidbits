import { readFileSync } from "fs";
import path from "path";
import { getDb } from "../lib/db/client";
import { ACCENT_PALETTE } from "../lib/design/palette";

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
  const schema = readFileSync(
    path.join(__dirname, "../lib/db/schema.sql"),
    "utf8",
  );

  // executeMultiple runs the whole schema file (DDL + triggers) as one batch.
  await db.executeMultiple(schema);

  for (const [index, category] of DEFAULT_CATEGORIES.entries()) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO categories (slug, name, accent_color) VALUES (?, ?, ?)",
      args: [category.slug, category.name, ACCENT_PALETTE[index % ACCENT_PALETTE.length].hex],
    });
  }

  console.log("Database schema applied and default categories seeded.");
}

main().catch((error) => {
  console.error("Database setup failed:", error);
  process.exit(1);
});
