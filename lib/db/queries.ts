import { getDb } from "./client";
import type { Client } from "@libsql/client";

export type Category = {
  id: number;
  slug: string;
  name: string;
  accent_color: string;
};

export async function listCategories(db: Client = getDb()): Promise<Category[]> {
  const result = await db.execute("SELECT id, slug, name, accent_color FROM categories ORDER BY name");
  return result.rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    name: String(row.name),
    accent_color: String(row.accent_color),
  }));
}

export async function insertTidbit(
  input: { header: string; body: string; categoryId: number },
  db: Client = getDb(),
): Promise<number> {
  const result = await db.execute({
    sql: "INSERT INTO tidbits (header, body, category_id) VALUES (?, ?, ?) RETURNING id",
    args: [input.header, input.body, input.categoryId],
  });
  return Number(result.rows[0].id);
}

export type Tidbit = {
  id: number;
  header: string;
  body: string;
  createdAt: number;
  likeCount: number;
  shareCount: number;
  category: { slug: string; name: string; accentColor: string };
};

export const FEED_PAGE_SIZE = 24;

type DateCursor = { mode: "date"; createdAt: number; id: number };
type RankCursor = { mode: "rank"; rank: number; id: number };
type Cursor = DateCursor | RankCursor;

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (parsed?.mode === "date" && typeof parsed.createdAt === "number" && typeof parsed.id === "number") {
      return parsed as DateCursor;
    }
    if (parsed?.mode === "rank" && typeof parsed.rank === "number" && typeof parsed.id === "number") {
      return parsed as RankCursor;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * FTS5 treats quotes/hyphens/AND/OR/NOT as operators. Wrapping the whole
 * term as one quoted phrase (with embedded quotes escaped) means any raw
 * visitor input is treated as literal text — malformed input degrades to
 * an empty/partial match, never a MATCH syntax error.
 */
export function sanitizeSearchTerm(term: string): string {
  return `"${term.replace(/"/g, '""')}"`;
}

function rowToTidbit(row: Record<string, unknown>): Tidbit {
  return {
    id: Number(row.id),
    header: String(row.header),
    body: String(row.body),
    createdAt: Number(row.created_at),
    likeCount: Number(row.like_count),
    shareCount: Number(row.share_count),
    category: {
      slug: String(row.category_slug),
      name: String(row.category_name),
      accentColor: String(row.category_accent_color),
    },
  };
}

export async function getFeedPage(
  options: {
    categorySlug?: string | null;
    searchTerm?: string | null;
    cursor?: string | null;
    pageSize?: number;
  },
  db: Client = getDb(),
): Promise<{ items: Tidbit[]; nextCursor: string | null }> {
  const pageSize = options.pageSize ?? FEED_PAGE_SIZE;
  const decoded = decodeCursor(options.cursor);
  const categorySlug = options.categorySlug || null;
  const searchTerm = options.searchTerm?.trim() || null;

  const baseSelect = `
    SELECT tidbits.id, tidbits.header, tidbits.body, tidbits.created_at,
           tidbits.like_count, tidbits.share_count,
           categories.slug AS category_slug, categories.name AS category_name,
           categories.accent_color AS category_accent_color`;

  let rows: Record<string, unknown>[];

  if (searchTerm) {
    const rankCursor = decoded?.mode === "rank" ? decoded : null;
    const result = await db.execute({
      sql: `${baseSelect}, bm25(tidbits_fts) AS rank
            FROM tidbits_fts
            JOIN tidbits ON tidbits.id = tidbits_fts.rowid
            JOIN categories ON categories.id = tidbits.category_id
            WHERE tidbits_fts MATCH ?
              AND tidbits.is_published = 1
              AND (? IS NULL OR categories.slug = ?)
              AND (? IS NULL OR (bm25(tidbits_fts) > ? OR (bm25(tidbits_fts) = ? AND tidbits.id > ?)))
            ORDER BY bm25(tidbits_fts) ASC, tidbits.id ASC
            LIMIT ?`,
      args: [
        sanitizeSearchTerm(searchTerm),
        categorySlug,
        categorySlug,
        rankCursor ? 1 : null,
        rankCursor?.rank ?? null,
        rankCursor?.rank ?? null,
        rankCursor?.id ?? null,
        pageSize + 1,
      ],
    });
    rows = result.rows as unknown as Record<string, unknown>[];
  } else {
    const dateCursor = decoded?.mode === "date" ? decoded : null;
    const result = await db.execute({
      sql: `${baseSelect}
            FROM tidbits
            JOIN categories ON categories.id = tidbits.category_id
            WHERE tidbits.is_published = 1
              AND (? IS NULL OR categories.slug = ?)
              AND (? IS NULL OR (tidbits.created_at < ? OR (tidbits.created_at = ? AND tidbits.id < ?)))
            ORDER BY tidbits.created_at DESC, tidbits.id DESC
            LIMIT ?`,
      args: [
        categorySlug,
        categorySlug,
        dateCursor ? 1 : null,
        dateCursor?.createdAt ?? null,
        dateCursor?.createdAt ?? null,
        dateCursor?.id ?? null,
        pageSize + 1,
      ],
    });
    rows = result.rows as unknown as Record<string, unknown>[];
  }

  const hasMore = rows.length > pageSize;
  const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
  const items = pageRows.map(rowToTidbit);

  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    nextCursor = searchTerm
      ? encodeCursor({ mode: "rank", rank: Number((last as Record<string, unknown>).rank), id: items[items.length - 1].id })
      : encodeCursor({ mode: "date", createdAt: items[items.length - 1].createdAt, id: items[items.length - 1].id });
  }

  return { items, nextCursor };
}
