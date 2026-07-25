import { readFileSync } from "fs";
import { getDb } from "../lib/db/client";
import { parsePreparedJsonl, reconcilePreparedHeaders } from "./import-tidbits";

async function main() {
  const filePath = process.argv[2] ?? "data/staging/tidbits.jsonl";
  const entries = parsePreparedJsonl(readFileSync(filePath, "utf8"));
  const updated = await reconcilePreparedHeaders(getDb(), entries);
  console.log(JSON.stringify({ parsed: entries.length, updated }, null, 2));
}

main().catch((error) => {
  console.error("Header reconciliation failed:", error instanceof Error ? error.message : "unknown error");
  process.exit(1);
});
