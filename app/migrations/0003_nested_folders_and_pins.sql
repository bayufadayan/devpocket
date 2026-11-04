ALTER TABLE folders ADD COLUMN parent_id TEXT REFERENCES folders(id);
ALTER TABLE folders ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1));
ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1));
ALTER TABLE notes ADD COLUMN icon_url TEXT;

CREATE INDEX idx_folders_parent_position ON folders(parent_id, position, name);
CREATE INDEX idx_notes_pinned_created ON notes(is_pinned, created_at DESC);
