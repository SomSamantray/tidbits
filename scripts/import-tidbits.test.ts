import { describe, expect, it } from "vitest";
import { buildCategoryMap, categorizeEntries, importPreparedEntries, parseEntries, publishApproved, reconcilePreparedEntries, reconcilePreparedHeaders, validateEntries } from "./import-tidbits";
import { fingerprint, type PreparedRecord } from "./prepare-whatsapp-trivia";
import { createTestDb, seedCategory, seedTidbit } from "../lib/db/test-helpers";

describe("parseEntries", () => {
  it("parses a well-formed entry with header, body, and category", () => {
    const [entry] = parseEntries(
      "Octopuses have three hearts\nTwo pump blood to the gills, one to the rest of the body.\nCategory: science",
    );

    expect(entry.header).toBe("Octopuses have three hearts");
    expect(entry.body).toBe("Two pump blood to the gills, one to the rest of the body.");
    expect(entry.categoryToken).toBe("science");
  });

  it("parses multiple entries separated by a blank line", () => {
    const entries = parseEntries(
      "Header one\nBody one.\nCategory: science\n\nHeader two\nBody two.\nCategory: history",
    );
    expect(entries).toHaveLength(2);
    expect(entries[1].header).toBe("Header two");
  });

  it("flags an entry with no Category line for manual review (categoryToken is null)", () => {
    const [entry] = parseEntries("Header only\nBody with no category line.");
    expect(entry.categoryToken).toBeNull();
  });
});

describe("categorizeEntries", () => {
  const categoryMap = new Map([["science", 1]]);

  it("routes an entry with a matching category to ready, not needsReview", () => {
    const { ready, needsReview } = categorizeEntries(
      [{ header: "H", body: "B", categoryToken: "science" }],
      categoryMap,
    );
    expect(ready).toEqual([{ header: "H", body: "B", categoryToken: "science", categoryId: 1 }]);
    expect(needsReview).toHaveLength(0);
  });

  it("flags an entry whose category doesn't match any known category, without defaulting", () => {
    const { ready, needsReview } = categorizeEntries(
      [{ header: "H", body: "B", categoryToken: "not-a-real-category" }],
      categoryMap,
    );
    expect(ready).toHaveLength(0);
    expect(needsReview).toHaveLength(1);
  });

  it("flags an entry with no category token at all, without defaulting", () => {
    const { ready, needsReview } = categorizeEntries(
      [{ header: "H", body: "B", categoryToken: null }],
      categoryMap,
    );
    expect(ready).toHaveLength(0);
    expect(needsReview).toHaveLength(1);
  });
});

function prepared(overrides: Partial<PreparedRecord> = {}): PreparedRecord {
  const header = overrides.header ?? "Header with preserved paragraphs";
  const body = overrides.body ?? "First paragraph.\n\nSecond paragraph.";
  return {
    sourceRef: overrides.sourceRef ?? "message-001",
    header,
    body,
    category: overrides.category ?? "science",
    categoryReason: overrides.categoryReason ?? "test category",
    fingerprint: overrides.fingerprint ?? fingerprint(header, body),
    reviewStatus: overrides.reviewStatus ?? "approved",
  };
}

describe("structured prepared import", () => {
  it("inserts exact multiline content unpublished and updates exactly one FTS row", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const entry = prepared();

    const result = await importPreparedEntries(db, [entry], { expectedCount: 1 });
    expect(result.insertedIds).toHaveLength(1);
    const row = await db.execute({ sql: "SELECT header, body, category_id, is_published, source_hash FROM tidbits", args: [] });
    expect(row.rows[0]).toMatchObject({ header: entry.header, body: entry.body, category_id: categoryId, is_published: 0, source_hash: entry.fingerprint });
    const fts = await db.execute({ sql: "SELECT rowid FROM tidbits_fts WHERE rowid = ?", args: [result.insertedIds[0]] });
    expect(fts.rows).toHaveLength(1);
  });

  it("is idempotent on an exact rerun", async () => {
    const db = await createTestDb();
    await seedCategory(db);
    const entry = prepared();
    const first = await importPreparedEntries(db, [entry], { expectedCount: 1 });
    const second = await importPreparedEntries(db, [entry], { expectedCount: 1 });
    expect(first.insertedIds).toHaveLength(1);
    expect(second.insertedIds).toHaveLength(0);
    expect(second.existingIds).toEqual(first.insertedIds);
  });

  it("blocks a tampered fingerprint or likely private identifier before writing", async () => {
    const db = await createTestDb();
    await seedCategory(db);
    const result = await importPreparedEntries(db, [prepared({ fingerprint: "tampered" })], { expectedCount: 1 });
    expect(result.issueCount).toBeGreaterThan(0);
    const count = await db.execute("SELECT COUNT(*) AS count FROM tidbits");
    expect(Number(count.rows[0].count)).toBe(0);
    expect(validateEntries([prepared({ body: "Contact me at test@example.com" })], new Map([["science", 1]]))).toEqual([
      { sourceRef: "message-001", reason: "likely private identifier" },
    ]);
  });

  it("rejects ambiguous category tokens instead of overwriting a mapping", () => {
    expect(() => buildCategoryMap([
      { id: 1, slug: "science", name: "Science" },
      { id: 2, slug: "other", name: "Science" },
    ])).toThrow("Ambiguous category token");
  });

  it("rolls back both tidbits and FTS rows when an insert trigger fails", async () => {
    const db = await createTestDb();
    await seedCategory(db);
    await db.execute("CREATE TRIGGER abort_tidbit BEFORE INSERT ON tidbits BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await expect(importPreparedEntries(db, [prepared()], { expectedCount: 1 })).rejects.toThrow("test failure");
    const rows = await db.execute("SELECT COUNT(*) AS count FROM tidbits");
    const fts = await db.execute("SELECT COUNT(*) AS count FROM tidbits_fts");
    expect(Number(rows.rows[0].count)).toBe(0);
    expect(Number(fts.rows[0].count)).toBe(0);
  });

  it("publishes only the explicit approved fingerprint allowlist", async () => {
    const db = await createTestDb();
    await seedCategory(db);
    const entry = prepared();
    await importPreparedEntries(db, [entry], { expectedCount: 1 });
    const published = await publishApproved(db, [entry.fingerprint]);
    expect(published).toHaveLength(1);
    const row = await db.execute({ sql: "SELECT is_published FROM tidbits WHERE source_hash = ?", args: [entry.fingerprint] });
    expect(Number(row.rows[0].is_published)).toBe(1);
  });

  it("reconciles cleaned headers by body and refreshes the FTS row atomically", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const body = "A body that must remain exactly unchanged.";
    const original = prepared({ header: "Old header", body, sourceRef: "message-007" });
    const cleaned = prepared({ header: "New Header", body, sourceRef: "message-007" });
    const id = await seedTidbit(db, categoryId, { header: original.header, body, sourceHash: original.fingerprint });

    expect(await reconcilePreparedHeaders(db, [cleaned])).toBe(1);
    const row = await db.execute({ sql: "SELECT header, body, source_hash FROM tidbits WHERE id = ?", args: [id] });
    expect(row.rows[0]).toMatchObject({ header: cleaned.header, body, source_hash: cleaned.fingerprint });
    const fts = await db.execute({ sql: "SELECT rowid FROM tidbits_fts WHERE tidbits_fts MATCH ?", args: ["New"] });
    expect(fts.rows).toHaveLength(1);
  });

  it("reconciles changed bodies by the old fingerprint and preserves row state", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const previous = prepared({ header: "Old header", body: "Old source lead and body." });
    const corrected = prepared({ header: "New body-supported header", body: "Restored source lead and complete body." });
    const id = await seedTidbit(db, categoryId, { header: previous.header, body: previous.body, sourceHash: previous.fingerprint, createdAt: 123, isPublished: 0 });
    await db.execute({ sql: "UPDATE tidbits SET like_count = 7, share_count = 3 WHERE id = ?", args: [id] });

    expect(await reconcilePreparedEntries(db, [previous], [corrected])).toBe(1);
    const row = await db.execute({ sql: "SELECT header, body, category_id, created_at, like_count, share_count, is_published, source_hash FROM tidbits WHERE id = ?", args: [id] });
    expect(row.rows[0]).toMatchObject({
      header: corrected.header,
      body: corrected.body,
      category_id: categoryId,
      created_at: 123,
      like_count: 7,
      share_count: 3,
      is_published: 0,
      source_hash: corrected.fingerprint,
    });
    const fts = await db.execute({ sql: "SELECT rowid FROM tidbits_fts WHERE tidbits_fts MATCH ?", args: ["complete"] });
    expect(fts.rows).toHaveLength(1);
    expect(await reconcilePreparedEntries(db, [previous], [corrected])).toBe(0);
  });

  it("rolls back a multi-row reconciliation when a later identity is missing", async () => {
    const db = await createTestDb();
    const categoryId = await seedCategory(db);
    const previousA = prepared({ sourceRef: "message-001", header: "Old A" });
    const previousB = prepared({ sourceRef: "message-002", header: "Old B" });
    const correctedA = prepared({ sourceRef: "message-001", header: "New A" });
    const correctedB = prepared({ sourceRef: "message-002", header: "New B" });
    await seedTidbit(db, categoryId, { header: previousA.header, body: previousA.body, sourceHash: previousA.fingerprint });
    await seedTidbit(db, categoryId, { header: previousB.header, body: previousB.body, sourceHash: previousB.fingerprint });
    await db.execute({ sql: "DELETE FROM tidbits WHERE source_hash = ?", args: [previousB.fingerprint] });

    await expect(reconcilePreparedEntries(db, [previousA, previousB], [correctedA, correctedB])).rejects.toThrow("Expected 2 source-identified rows, found 1");
    const row = await db.execute({ sql: "SELECT header FROM tidbits WHERE source_hash = ?", args: [previousA.fingerprint] });
    expect(row.rows[0].header).toBe(previousA.header);
  });
});
