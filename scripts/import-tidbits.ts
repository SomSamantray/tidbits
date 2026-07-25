import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Client } from "@libsql/client";
import { getDb } from "../lib/db/client";
import { fingerprint, type PreparedRecord } from "./prepare-whatsapp-trivia";

export const EXPECTED_PREPARED_COUNT = 120;

type CategoryRow = { id: unknown; slug: unknown; name: unknown };
type CategoryMap = Map<string, number>;
type ImportIssue = { sourceRef: string; reason: string };
type ExistingRow = { id: number; categoryId: number; isPublished: number; sourceHash: string | null };

type LegacyEntry = { header: string; body: string; categoryToken: string | null };
type CategorizedLegacyEntry = LegacyEntry & { categoryId: number };

export type ImportPlan = {
  entries: PreparedRecord[];
  categoryIds: Map<string, number>;
  ready: PreparedRecord[];
  issues: ImportIssue[];
  existing: ExistingRow[];
  artifactDigest?: string;
  fingerprintSetDigest?: string;
};

export type ImportResult = {
  insertedIds: number[];
  existingIds: number[];
  publishedIds: number[];
  issueCount: number;
};

const ALLOWED_FIELDS = new Set(["sourceRef", "header", "body", "category", "categoryReason", "fingerprint", "reviewStatus"]);

/** Compatibility-only parser for the original notes format. WhatsApp imports use JSONL below. */
export function parseEntries(raw: string): LegacyEntry[] {
  return raw.split(/\n\s*\n/gu).map((block) => block.trim()).filter(Boolean).map((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const categoryMatch = lines.at(-1)?.match(/^Category:\s*(.+)$/iu);
    return {
      header: lines[0] ?? "",
      body: (categoryMatch ? lines.slice(1, -1) : lines.slice(1)).join(" ").trim(),
      categoryToken: categoryMatch?.[1].trim() ?? null,
    };
  });
}

/** Compatibility-only categorizer for the original notes format. */
export function categorizeEntries(entries: LegacyEntry[], categoryIdsByToken: Map<string, number>): { ready: CategorizedLegacyEntry[]; needsReview: LegacyEntry[] } {
  const ready: CategorizedLegacyEntry[] = [];
  const needsReview: LegacyEntry[] = [];
  for (const entry of entries) {
    const categoryId = entry.categoryToken ? categoryIdsByToken.get(entry.categoryToken.toLowerCase()) : undefined;
    if (!entry.header || !entry.body || categoryId === undefined) needsReview.push(entry);
    else ready.push({ ...entry, categoryId });
  }
  return { ready, needsReview };
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function digestLines(lines: string[]): string {
  return digest(lines.join("\n"));
}

export function parsePreparedJsonl(raw: string): PreparedRecord[] {
  const entries: PreparedRecord[] = [];
  for (const [index, line] of raw.replace(/\r\n?/gu, "\n").split("\n").entries()) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Malformed JSONL at line ${index + 1}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`JSONL record at line ${index + 1} is not an object`);
    }
    const keys = Object.keys(parsed);
    if (keys.some((key) => !ALLOWED_FIELDS.has(key))) {
      throw new Error(`Unknown JSONL field at line ${index + 1}`);
    }
    entries.push(parsed as PreparedRecord);
  }
  return entries;
}

export function buildCategoryMap(rows: CategoryRow[]): CategoryMap {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = Number(row.id);
    for (const token of [String(row.slug), String(row.name)].map((value) => value.trim().toLowerCase())) {
      if (!token) continue;
      const previous = map.get(token);
      if (previous !== undefined && previous !== id) throw new Error(`Ambiguous category token: ${token}`);
      map.set(token, id);
    }
  }
  return map;
}

export function looksPrivate(text: string): boolean {
  return /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+\d[\d\s().-]{8,}\d|\b\d{10,}\b|(?:password|passwd|secret|api[_ -]?key|token)\s*[:=]|https?:\/\/[^\s]+(?:invite|private|token|auth)[^\s]*)/iu.test(text);
}

export function validateEntries(entries: PreparedRecord[], categoryIds: CategoryMap): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const sourceRefs = new Set<string>();
  const fingerprints = new Set<string>();
  for (const entry of entries) {
    const sourceRef = typeof entry.sourceRef === "string" ? entry.sourceRef : "unknown-record";
    if (sourceRefs.has(sourceRef)) issues.push({ sourceRef, reason: "duplicate source reference" });
    sourceRefs.add(sourceRef);
    if (typeof entry.header !== "string" || typeof entry.body !== "string" || !entry.header || !entry.body) issues.push({ sourceRef, reason: "header and body are required" });
    if (entry.reviewStatus !== "approved") issues.push({ sourceRef, reason: "record is not approved" });
    if (typeof entry.category !== "string" || !categoryIds.has(String(entry.category).trim().toLowerCase())) issues.push({ sourceRef, reason: "unknown category" });
    if (typeof entry.fingerprint !== "string" || (typeof entry.header === "string" && typeof entry.body === "string" && fingerprint(entry.header, entry.body) !== entry.fingerprint)) issues.push({ sourceRef, reason: "fingerprint mismatch" });
    if (typeof entry.header === "string" && typeof entry.body === "string" && looksPrivate(`${entry.header}\n${entry.body}`)) issues.push({ sourceRef, reason: "likely private identifier" });
    if (typeof entry.fingerprint === "string" && fingerprints.has(entry.fingerprint)) issues.push({ sourceRef, reason: "duplicate fingerprint" });
    if (typeof entry.fingerprint === "string") fingerprints.add(entry.fingerprint);
  }
  return issues;
}

export function verifyArtifactReport(rawJsonl: string, report: { artifactDigest?: string; fingerprintSetDigest?: string; counts?: { retained?: number } }): void {
  const lines = rawJsonl.replace(/\r\n?/gu, "\n").split("\n").filter((line) => line.trim());
  const entries = parsePreparedJsonl(rawJsonl);
  if (report.artifactDigest && digestLines(lines) !== report.artifactDigest) throw new Error("Prepared artifact digest mismatch");
  if (report.fingerprintSetDigest && digestLines(entries.map((entry) => entry.fingerprint).sort()) !== report.fingerprintSetDigest) {
    throw new Error("Prepared fingerprint-set digest mismatch");
  }
  if (report.counts?.retained !== undefined && report.counts.retained !== entries.length) throw new Error("Prepared retained count mismatch");
}

async function existingForEntry(db: Client, entry: PreparedRecord): Promise<ExistingRow | null> {
  const result = await db.execute({
    sql: `SELECT id, category_id, is_published, source_hash
          FROM tidbits
          WHERE source_hash = ? OR (source_hash IS NULL AND header = ? AND body = ?)
          LIMIT 1`,
    args: [entry.fingerprint, entry.header, entry.body],
  });
  const row = result.rows[0];
  return row ? {
    id: Number(row.id),
    categoryId: Number(row.category_id),
    isPublished: Number(row.is_published),
    sourceHash: row.source_hash == null ? null : String(row.source_hash),
  } : null;
}

export async function buildImportPlan(db: Client, entries: PreparedRecord[], expectedCount = EXPECTED_PREPARED_COUNT): Promise<ImportPlan> {
  if (entries.length !== expectedCount) throw new Error(`Expected ${expectedCount} prepared records, received ${entries.length}`);
  const foreignKeys = await db.execute("PRAGMA foreign_keys");
  if (Number(foreignKeys.rows[0]?.foreign_keys ?? 0) !== 1) throw new Error("Foreign-key enforcement is disabled");
  const categoryResult = await db.execute("SELECT id, slug, name FROM categories");
  const categoryIds = buildCategoryMap(categoryResult.rows as unknown as CategoryRow[]);
  const issues = validateEntries(entries, categoryIds);
  const ready = entries.filter((entry) => !issues.some((issue) => issue.sourceRef === entry.sourceRef));
  const existing: ExistingRow[] = [];
  for (const entry of ready) {
    const row = await existingForEntry(db, entry);
    if (row) {
      const categoryId = categoryIds.get(entry.category.trim().toLowerCase());
      if (categoryId !== row.categoryId) issues.push({ sourceRef: entry.sourceRef, reason: "existing content belongs to a different category" });
      else existing.push(row);
    }
  }
  return { entries, categoryIds, ready, issues, existing };
}

export async function importPreparedEntries(db: Client, entries: PreparedRecord[], options: { dryRun?: boolean; expectedCount?: number } = {}): Promise<ImportResult> {
  const plan = await buildImportPlan(db, entries, options.expectedCount ?? EXPECTED_PREPARED_COUNT);
  if (plan.issues.length > 0) return { insertedIds: [], existingIds: [], publishedIds: [], issueCount: plan.issues.length };
  if (options.dryRun) return { insertedIds: [], existingIds: plan.existing.map((row) => row.id), publishedIds: [], issueCount: 0 };

  const tx = await db.transaction("write");
  const insertedIds: number[] = [];
  const existingIds: number[] = [];
  try {
    for (const entry of plan.ready) {
      const categoryId = plan.categoryIds.get(entry.category.toLowerCase());
      if (categoryId === undefined) throw new Error(`Category disappeared during import: ${entry.sourceRef}`);
      const result = await tx.execute({
        sql: `INSERT INTO tidbits (header, body, category_id, is_published, source_hash)
              VALUES (?, ?, ?, 0, ?)
              ON CONFLICT(source_hash) DO NOTHING
              RETURNING id`,
        args: [entry.header, entry.body, categoryId, entry.fingerprint],
      });
      if (result.rows.length > 0) {
        insertedIds.push(Number(result.rows[0].id));
      } else {
        const row = await tx.execute({ sql: "SELECT id, category_id FROM tidbits WHERE source_hash = ?", args: [entry.fingerprint] });
        const existing = row.rows[0];
        if (!existing || Number(existing.category_id) !== categoryId) throw new Error(`Concurrent category conflict for ${entry.sourceRef}`);
        existingIds.push(Number(existing.id));
      }
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
  return { insertedIds, existingIds, publishedIds: [], issueCount: 0 };
}

export async function publishApproved(db: Client, fingerprints: string[]): Promise<number[]> {
  if (fingerprints.length === 0) return [];
  const tx = await db.transaction("write");
  try {
    const result = await tx.execute({
      sql: `UPDATE tidbits SET is_published = 1 WHERE source_hash IN (${fingerprints.map(() => "?").join(",")}) RETURNING id`,
      args: fingerprints,
    });
    await tx.commit();
    return result.rows.map((row) => Number(row.id));
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export async function reconcilePreparedHeaders(db: Client, entries: PreparedRecord[]): Promise<number> {
  const tx = await db.transaction("write");
  let updated = 0;
  try {
    for (const entry of entries) {
      const matches = await tx.execute({ sql: "SELECT id, header, body, source_hash FROM tidbits WHERE body = ?", args: [entry.body] });
      if (matches.rows.length !== 1) throw new Error(`Expected one existing tidbit body for ${entry.sourceRef}, found ${matches.rows.length}`);
      const row = matches.rows[0];
      const duplicateHash = await tx.execute({ sql: "SELECT id FROM tidbits WHERE source_hash = ? AND id != ?", args: [entry.fingerprint, Number(row.id)] });
      if (duplicateHash.rows.length > 0) throw new Error(`Source hash collision for ${entry.sourceRef}`);
      if (String(row.header) === entry.header && String(row.source_hash ?? "") === entry.fingerprint) continue;
      await tx.execute({
        sql: "UPDATE tidbits SET header = ?, source_hash = ? WHERE id = ?",
        args: [entry.header, entry.fingerprint, Number(row.id)],
      });
      updated += 1;
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
  return updated;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const publish = args.includes("--publish");
  const filePath = args.find((arg) => !arg.startsWith("--"));
  if (!filePath) throw new Error("Usage: npm run import:tidbits -- data/staging/tidbits.jsonl [--dry-run] [--publish]");
  const raw = readFileSync(filePath, "utf8");
  const entries = parsePreparedJsonl(raw);
  const reportPath = path.join(path.dirname(filePath), "tidbits-preparation-report.json");
  if (existsSync(reportPath)) {
    verifyArtifactReport(raw, JSON.parse(readFileSync(reportPath, "utf8")) as { artifactDigest?: string; fingerprintSetDigest?: string; counts?: { retained?: number } });
  }
  const db = getDb();
  const result = await importPreparedEntries(db, entries, { dryRun });
  console.log(JSON.stringify({ parsed: entries.length, inserted: result.insertedIds.length, alreadyPresent: result.existingIds.length, issues: result.issueCount, dryRun, publish }, null, 2));
  if (result.issueCount > 0) throw new Error("Import blocked by validation or privacy review");
  if (publish && !dryRun) {
    const publishedIds = await publishApproved(db, entries.map((entry) => entry.fingerprint));
    console.log(JSON.stringify({ published: publishedIds.length }));
  }
}

if (require.main === module) main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
