import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

/**
 * Local file DB by default so the app runs with zero setup. Point
 * TURSO_DATABASE_URL/TURSO_AUTH_TOKEN at a real Turso database for
 * production (see .env.local.example) — same client, same queries.
 */
export function getDb(): Client {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}
