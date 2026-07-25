import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import { applySchema } from "./schema";

/**
 * Fresh libSQL DB with the schema applied, for isolated tests. Uses a unique
 * temp file rather than `:memory:` — interactive transactions (db.transaction())
 * open a separate connection under the hood, and a `:memory:` database is not
 * shared across connections, so a second transaction on the same "db" would
 * otherwise see an empty database.
 */
export async function createTestDb(): Promise<Client> {
  const dbPath = path.join(os.tmpdir(), `tidbits-test-${randomUUID()}.db`);
  const db = createClient({ url: `file:${dbPath}` });
  await applySchema(db);
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
