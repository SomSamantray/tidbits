import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import path from "path";

/** Fresh in-memory libSQL DB with the schema applied, for isolated tests. */
export async function createTestDb(): Promise<Client> {
  const db = createClient({ url: ":memory:" });
  const schema = readFileSync(
    path.join(__dirname, "schema.sql"),
    "utf8",
  );
  await db.executeMultiple(schema);
  return db;
}

export async function seedCategory(
  db: Client,
  overrides: Partial<{ slug: string; name: string; accent_color: string }> = {},
): Promise<number> {
  const category = {
    slug: overrides.slug ?? "science",
    name: overrides.name ?? "Science",
    accent_color: overrides.accent_color ?? "#9BF6FF",
  };
  const result = await db.execute({
    sql: "INSERT INTO categories (slug, name, accent_color) VALUES (?, ?, ?) RETURNING id",
    args: [category.slug, category.name, category.accent_color],
  });
  return Number(result.rows[0].id);
}

export async function seedTidbit(
  db: Client,
  categoryId: number,
  overrides: Partial<{ header: string; body: string; createdAt: number }> = {},
): Promise<number> {
  const result = await db.execute({
    sql: "INSERT INTO tidbits (header, body, category_id, created_at) VALUES (?, ?, ?, ?) RETURNING id",
    args: [
      overrides.header ?? "Sample header",
      overrides.body ?? "Sample body text.",
      categoryId,
      overrides.createdAt ?? Math.floor(Date.now() / 1000),
    ],
  });
  return Number(result.rows[0].id);
}
