CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  accent_color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tidbits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  header TEXT NOT NULL,
  body TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  like_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tidbits_category_created
  ON tidbits (category_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_tidbits_created
  ON tidbits (created_at DESC, id DESC);

-- Full-text search over header + body, kept in sync via triggers below.
CREATE VIRTUAL TABLE IF NOT EXISTS tidbits_fts USING fts5(
  header,
  body,
  content='tidbits',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS tidbits_ai AFTER INSERT ON tidbits BEGIN
  INSERT INTO tidbits_fts (rowid, header, body) VALUES (new.id, new.header, new.body);
END;

CREATE TRIGGER IF NOT EXISTS tidbits_ad AFTER DELETE ON tidbits BEGIN
  INSERT INTO tidbits_fts (tidbits_fts, rowid, header, body) VALUES ('delete', old.id, old.header, old.body);
END;

CREATE TRIGGER IF NOT EXISTS tidbits_au AFTER UPDATE ON tidbits BEGIN
  INSERT INTO tidbits_fts (tidbits_fts, rowid, header, body) VALUES ('delete', old.id, old.header, old.body);
  INSERT INTO tidbits_fts (rowid, header, body) VALUES (new.id, new.header, new.body);
END;

-- Anonymous like guard only (KTD3). Shares are not deduplicated and do not use this table.
CREATE TABLE IF NOT EXISTS interactions (
  tidbit_id INTEGER NOT NULL REFERENCES tidbits(id),
  anon_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE (tidbit_id, anon_id)
);
