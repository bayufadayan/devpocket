CREATE TABLE folders (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  platform TEXT NOT NULL DEFAULT 'Catatan',
  folder_id TEXT REFERENCES folders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'collection')),
  usage TEXT CHECK (usage IN ('try', 'active', 'reference')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (status = 'draft' AND folder_id IS NULL AND usage IS NULL) OR
    (status = 'collection' AND folder_id IS NOT NULL AND usage IS NOT NULL)
  )
);

CREATE INDEX idx_notes_folder_created ON notes(folder_id, created_at DESC);
CREATE INDEX idx_notes_status_usage_created ON notes(status, usage, created_at DESC);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
