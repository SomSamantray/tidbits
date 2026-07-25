import { getDb } from "./client";

export type Category = {
  id: number;
  slug: string;
  name: string;
  accent_color: string;
};

export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const result = await db.execute("SELECT id, slug, name, accent_color FROM categories ORDER BY name");
  return result.rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    accent_color: String(row.accent_color),
  }));
}

export async function insertTidbit(input: {
  header: string;
  body: string;
  categoryId: number;
}): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: "INSERT INTO tidbits (header, body, category_id) VALUES (?, ?, ?) RETURNING id",
    args: [input.header, input.body, input.categoryId],
  });
  return Number(result.rows[0].id);
}
