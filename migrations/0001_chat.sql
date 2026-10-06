-- Feedback chat. vid = random id kept in the visitor's browser; one thread per vid.
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vid TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user','admin')),
  body TEXT NOT NULL,
  page TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS messages_vid_id ON messages (vid, id);
-- Admin read marker per thread.
CREATE TABLE IF NOT EXISTS threads (vid TEXT PRIMARY KEY, admin_seen_id INTEGER NOT NULL DEFAULT 0);
