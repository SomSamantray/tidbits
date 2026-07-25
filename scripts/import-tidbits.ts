import { readFileSync } from "fs";
import { getDb } from "../lib/db/client";

/**
 * Bulk-imports tidbits from a plain-text file (KTD9's one-time path for the
 * owner's existing notes — separate from the ongoing admin form).
 *
 * Format: entries separated by a blank line. Each entry is:
 *   Header line
 *   Body text (one or more lines)
 *   Category: <slug-or-name>   (optional, must match an existing category)
 *
 * Entries with no matching category are NOT inserted — they're reported so
 * the owner can fix them and re-run, per the plan's "flag for manual review"
 * requirement (never silently defaulting a category).
 *
 * Usage: npm run import:tidbits -- path/to/tidbits.txt [--dry-run]
 */

type ParsedEntry = {
  header: string;
  body: string;
  categoryToken: string | null;
};

type CategorizedEntry = ParsedEntry & { categoryId: number };

export function parseEntries(raw: string): ParsedEntry[] {
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const categoryMatch = lines[lines.length - 1]?.match(/^Category:\s*(.+)$/i);
    const categoryToken = categoryMatch ? categoryMatch[1].trim() : null;
    const bodyLines = categoryMatch ? lines.slice(1, -1) : lines.slice(1);

    return {
      header: lines[0] ?? "",
      body: bodyLines.join(" ").trim(),
      categoryToken,
    };
  });
}

export function categorizeEntries(
  entries: ParsedEntry[],
  categoryIdsByToken: Map<string, number>,
): { ready: CategorizedEntry[]; needsReview: ParsedEntry[] } {
  const ready: CategorizedEntry[] = [];
  const needsReview: ParsedEntry[] = [];

  for (const entry of entries) {
    if (!entry.header || !entry.body) {
      needsReview.push(entry);
      continue;
    }
    const categoryId = entry.categoryToken
      ? categoryIdsByToken.get(entry.categoryToken.toLowerCase())
      : undefined;
    if (categoryId === undefined) {
      needsReview.push(entry);
    } else {
      ready.push({ ...entry, categoryId });
    }
  }

  return { ready, needsReview };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filePath = args.find((a) => !a.startsWith("--"));

  if (!filePath) {
    console.error("Usage: npm run import:tidbits -- path/to/tidbits.txt [--dry-run]");
    process.exit(1);
  }

  const raw = readFileSync(filePath, "utf8");
  const entries = parseEntries(raw);

  const db = getDb();
  const categories = await db.execute("SELECT id, slug, name FROM categories");
  const bySlugOrName = new Map<string, number>();
  for (const row of categories.rows) {
    bySlugOrName.set(String(row.slug).toLowerCase(), Number(row.id));
    bySlugOrName.set(String(row.name).toLowerCase(), Number(row.id));
  }

  const { ready, needsReview } = categorizeEntries(entries, bySlugOrName);

  console.log(`Parsed ${entries.length} entries: ${ready.length} ready, ${needsReview.length} need review.`);

  if (needsReview.length > 0) {
    console.log("\nEntries needing manual review (missing/unmatched category):");
    for (const entry of needsReview) {
      console.log(`  - "${entry.header || "(no header)"}" — category: ${entry.categoryToken ?? "(none)"}`);
    }
  }

  if (dryRun) {
    console.log("\nDry run — no rows inserted.");
    return;
  }

  for (const entry of ready) {
    await db.execute({
      sql: "INSERT INTO tidbits (header, body, category_id) VALUES (?, ?, ?)",
      args: [entry.header, entry.body, entry.categoryId],
    });
  }

  console.log(`\nInserted ${ready.length} tidbits.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
}
