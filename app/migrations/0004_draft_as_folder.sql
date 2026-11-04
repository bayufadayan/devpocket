-- Draft becomes a real, first-level folder so it can contain subfolders and items.
UPDATE folders SET name = 'Draft (koleksi)' WHERE name = 'Draft' COLLATE NOCASE;

ALTER TABLE folders ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1));
INSERT INTO folders (id, name, parent_id, position, is_pinned, is_system)
VALUES ('system-draft', 'Draft', NULL, -1, 0, 1);

CREATE TABLE notes_new (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  platform TEXT NOT NULL DEFAULT 'Catatan',
  folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'collection')),
  usage TEXT CHECK (usage IN ('try', 'active', 'reference')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  icon_name TEXT,
  icon_asset_id TEXT REFERENCES icon_assets(id) ON DELETE SET NULL,
  icon_url TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  CHECK (
    (status = 'draft' AND usage IS NULL) OR
    (status = 'collection' AND usage IS NOT NULL)
  )
);

INSERT INTO notes_new (
  id, title, content, source_url, platform, folder_id, status, usage,
  created_at, updated_at, icon_name, icon_asset_id, icon_url, is_pinned
)
SELECT
  id, title, content, source_url, platform,
  COALESCE(folder_id, 'system-draft'), status, usage,
  created_at, updated_at, icon_name, icon_asset_id, icon_url, is_pinned
FROM notes;

DROP TABLE notes;
ALTER TABLE notes_new RENAME TO notes;

CREATE INDEX idx_notes_folder_created ON notes(folder_id, created_at DESC);
CREATE INDEX idx_notes_status_usage_created ON notes(status, usage, created_at DESC);
CREATE INDEX idx_notes_created ON notes(created_at DESC);
CREATE INDEX idx_notes_icon_asset_id ON notes(icon_asset_id);
CREATE INDEX idx_notes_pinned_created ON notes(is_pinned, created_at DESC);
