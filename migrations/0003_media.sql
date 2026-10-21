-- Uploaded images stored in D1 (no R2). Files are split into base64 chunks
-- to stay under D1's per-value size limit.

CREATE TABLE media (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  original_name TEXT NOT NULL DEFAULT '',
  etag TEXT NOT NULL,
  chunks INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE media_chunks (
  key TEXT NOT NULL REFERENCES media (key) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (key, idx)
);
