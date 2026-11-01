CREATE TABLE icon_assets (
  id TEXT PRIMARY KEY NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 2097152),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notes ADD COLUMN icon_name TEXT;
ALTER TABLE notes ADD COLUMN icon_asset_id TEXT REFERENCES icon_assets(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_icon_asset_id ON notes(icon_asset_id);
