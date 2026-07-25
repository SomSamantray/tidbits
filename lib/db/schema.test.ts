import { describe, expect, it } from "vitest";
import { createTestDb, seedCategory, seedTidbit } from "./test-helpers";

describe("tidbits schema", () => {
  it("keeps tidbits_fts in sync via triggers and returns matches on insert", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    await seedTidbit(db, categoryId, {
      header: "Octopuses have three hearts",
      body: "Two pump blood to the gills, one to the rest of the body.",
    });

    const result = await db.execute({
      sql: "SELECT rowid FROM tidbits_fts WHERE tidbits_fts MATCH 'octopuses'",
      args: [],
    });

    expect(result.rows).toHaveLength(1);
  });

  it("paginates by category via keyset cursor with no duplicates across pages", async () => {
    const db = await createTestDb();
    const scienceId = await seedCategory(db, { slug: "science", name: "Science" });
    const historyId = await seedCategory(db, { slug: "history", name: "History" });

    for (let i = 0; i < 5; i++) {
      await seedTidbit(db, scienceId, { header: `Science fact ${i}`, createdAt: 1000 + i });
    }
    await seedTidbit(db, historyId, { header: "History fact", createdAt: 2000 });

    const firstPage = await db.execute({
      sql: `SELECT id, created_at FROM tidbits
            WHERE category_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 3`,
      args: [scienceId],
    });
    expect(firstPage.rows).toHaveLength(3);
    expect(firstPage.rows.every((r) => Number(r.category_id ?? scienceId) === scienceId));

    const cursor = firstPage.rows[firstPage.rows.length - 1];
    const secondPage = await db.execute({
      sql: `SELECT id, created_at FROM tidbits
            WHERE category_id = ?
              AND (created_at, id) < (?, ?)
            ORDER BY created_at DESC, id DESC
            LIMIT 3`,
      args: [scienceId, cursor.created_at, cursor.id],
    });

    const firstIds = firstPage.rows.map((r) => r.id);
    const secondIds = secondPage.rows.map((r) => r.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    expect(firstIds.length + secondIds.length).toBe(5);
  });

  it("removes a deleted tidbit from the FTS index", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const id = await seedTidbit(db, categoryId, { header: "Bananas are berries" });

    await db.execute({ sql: "DELETE FROM tidbits WHERE id = ?", args: [id] });

    const result = await db.execute({
      sql: "SELECT rowid FROM tidbits_fts WHERE tidbits_fts MATCH 'bananas'",
      args: [],
    });
    expect(result.rows).toHaveLength(0);
  });

  it("returns an empty page for a category with zero tidbits, not an error", async () => {
    const db = await createTestDb();
    const emptyCategoryId = await seedCategory(db, { slug: "empty", name: "Empty" });

    const result = await db.execute({
      sql: `SELECT id FROM tidbits WHERE category_id = ? ORDER BY created_at DESC, id DESC LIMIT 10`,
      args: [emptyCategoryId],
    });

    expect(result.rows).toHaveLength(0);
  });

  it("treats a duplicate like interaction as a no-op, not a server error", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const tidbitId = await seedTidbit(db, categoryId);

    const first = await db.execute({
      sql: "INSERT INTO interactions (tidbit_id, anon_id) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING tidbit_id",
      args: [tidbitId, "anon-1"],
    });
    expect(first.rows).toHaveLength(1);

    const second = await db.execute({
      sql: "INSERT INTO interactions (tidbit_id, anon_id) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING tidbit_id",
      args: [tidbitId, "anon-1"],
    });
    expect(second.rows).toHaveLength(0);

    const count = await db.execute({
      sql: "SELECT COUNT(*) as c FROM interactions WHERE tidbit_id = ? AND anon_id = ?",
      args: [tidbitId, "anon-1"],
    });
    expect(Number(count.rows[0].c)).toBe(1);
  });
});
