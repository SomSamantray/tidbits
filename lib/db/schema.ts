import { readFileSync } from "fs";
import path from "path";
import type { Client } from "@libsql/client";

/** Applies schema.sql (DDL + triggers) to a database as one batch. */
export async function applySchema(db: Client): Promise<void> {
  const schema = readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.executeMultiple(schema);
}
