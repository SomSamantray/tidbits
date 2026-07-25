import { readFileSync } from "fs";
import path from "path";
import type { Client } from "@libsql/client";

/** Applies schema.sql (DDL + triggers) to a database as one batch. */
export async function applySchema(db: Client): Promise<void> {
  const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.execute("PRAGMA foreign_keys = ON");
  await db.executeMultiple(schema);

  const columns = await db.execute("PRAGMA table_info(tidbits)");
  if (!columns.rows.some((row) => String(row.name) === "source_hash")) {
    await db.execute("ALTER TABLE tidbits ADD COLUMN source_hash TEXT");
  }
  await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_tidbits_source_hash ON tidbits (source_hash)");
}
