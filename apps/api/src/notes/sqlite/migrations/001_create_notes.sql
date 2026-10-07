CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  deleted_at TEXT
) STRICT;

CREATE INDEX notes_recent_active
ON notes(updated_at DESC, id DESC)
WHERE deleted_at IS NULL;

CREATE TABLE semantic_index_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('upsert', 'remove')),
  note_version INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX semantic_index_outbox_eligible
ON semantic_index_outbox(status, next_attempt_at, id);
