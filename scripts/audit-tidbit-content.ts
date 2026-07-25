import { readFileSync } from "fs";
import type { Client } from "@libsql/client";
import { getDb } from "../lib/db/client";
import { EXPECTED_COUNTS, parseWhatsAppExport, prepareMessages, type PreparedRecord } from "./prepare-whatsapp-trivia";
import { parsePreparedJsonl } from "./import-tidbits";

export type ContentAudit = {
  sourceMessages: number;
  preparedRecords: number;
  sourceRefsChecked: number;
  mismatches: string[];
};

function compareRecords(expected: PreparedRecord[], actual: PreparedRecord[]): string[] {
  const mismatches: string[] = [];
  const actualByRef = new Map(actual.map((entry) => [entry.sourceRef, entry]));
  if (actual.length !== expected.length) mismatches.push(`record count ${actual.length} != ${expected.length}`);
  const expectedRefs = new Set(expected.map((entry) => entry.sourceRef));
  for (const actualEntry of actual) {
    if (!expectedRefs.has(actualEntry.sourceRef)) mismatches.push(`${actualEntry.sourceRef}: unexpected source reference`);
  }
  for (const expectedEntry of expected) {
    const actualEntry = actualByRef.get(expectedEntry.sourceRef);
    if (!actualEntry) {
      mismatches.push(`${expectedEntry.sourceRef}: missing from artifact`);
      continue;
    }
    if (actualEntry.header !== expectedEntry.header || actualEntry.body !== expectedEntry.body || actualEntry.fingerprint !== expectedEntry.fingerprint) {
      mismatches.push(`${expectedEntry.sourceRef}: prepared content differs from source-derived output`);
    }
    if (/^(?:interesting|this is wild|this is super interesting|something you didn.t know|mind blowing|which is bigger|food for thought|here.s a calm trivia)/iu.test(actualEntry.header)) {
      mismatches.push(`${expectedEntry.sourceRef}: generic heading remains`);
    }
  }
  return mismatches;
}

export function auditPreparedArtifact(rawPath: string, artifactPath: string): ContentAudit {
  const prepared = prepareMessages(parseWhatsAppExport(readFileSync(rawPath, "utf8")));
  const actual = parsePreparedJsonl(readFileSync(artifactPath, "utf8"));
  const mismatches = compareRecords(prepared.records, actual);
  if (JSON.stringify(prepared.counts) !== JSON.stringify(EXPECTED_COUNTS)) mismatches.push("source reconciliation counts differ from the approved contract");
  return {
    sourceMessages: prepared.counts.messages,
    preparedRecords: actual.length,
    sourceRefsChecked: prepared.records.length,
    mismatches,
  };
}

export async function auditDatabase(db: Client, entries: PreparedRecord[]): Promise<string[]> {
  const mismatches: string[] = [];
  const count = await db.execute("SELECT COUNT(*) AS count FROM tidbits WHERE source_hash IS NOT NULL");
  if (Number(count.rows[0]?.count ?? 0) !== entries.length) mismatches.push("database source-identified row count differs from artifact");
  for (const entry of entries) {
    const row = await db.execute({ sql: "SELECT id, header, body, source_hash FROM tidbits WHERE source_hash = ?", args: [entry.fingerprint] });
    if (row.rows.length !== 1) {
      mismatches.push(`${entry.sourceRef}: database fingerprint match count ${row.rows.length}`);
      continue;
    }
    if (String(row.rows[0].header) !== entry.header || String(row.rows[0].body) !== entry.body) mismatches.push(`${entry.sourceRef}: database content differs from artifact`);
    const fts = await db.execute({ sql: "SELECT rowid FROM tidbits_fts WHERE rowid = ?", args: [Number(row.rows[0].id)] });
    if (fts.rows.length !== 1) mismatches.push(`${entry.sourceRef}: missing FTS row`);
  }
  return mismatches;
}

async function main() {
  const args = process.argv.slice(2);
  const [rawPath = "data/raw/_chat.txt", artifactPath = "data/staging/tidbits.jsonl"] = args.filter((arg) => arg !== "--database");
  const audit = auditPreparedArtifact(rawPath, artifactPath);
  const databaseMismatches = args.includes("--database")
    ? await auditDatabase(getDb(), parsePreparedJsonl(readFileSync(artifactPath, "utf8")))
    : [];
  const mismatches = [...audit.mismatches, ...databaseMismatches];
  console.log(JSON.stringify({ sourceMessages: audit.sourceMessages, preparedRecords: audit.preparedRecords, sourceRefsChecked: audit.sourceRefsChecked, mismatches }, null, 2));
  if (mismatches.length > 0) throw new Error("Tidbit content audit failed");
}

if (require.main === module) main().catch((error) => {
  console.error("Content audit failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
