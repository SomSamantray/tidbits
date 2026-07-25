import { readFileSync } from "fs";
import { getDb } from "../lib/db/client";
import { parsePreparedJsonl, reconcilePreparedEntries } from "./import-tidbits";

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find((arg) => !arg.startsWith("--")) ?? "data/staging/tidbits.jsonl";
  const previousFlag = args.indexOf("--previous");
  const previousPath = previousFlag >= 0 ? args[previousFlag + 1] : undefined;
  const dryRun = args.includes("--dry-run");
  if (!previousPath) throw new Error("Usage: npm run reconcile:tidbits -- corrected.jsonl --previous approved.jsonl");
  const corrected = parsePreparedJsonl(readFileSync(filePath, "utf8"));
  const previous = parsePreparedJsonl(readFileSync(previousPath, "utf8"));
  const updated = await reconcilePreparedEntries(getDb(), previous, corrected, { dryRun });
  console.log(JSON.stringify({ parsed: corrected.length, previous: previous.length, updated, dryRun }, null, 2));
}

main().catch((error) => {
  console.error("Header reconciliation failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
