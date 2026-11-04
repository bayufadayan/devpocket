ALTER TABLE folders ADD COLUMN icon_name TEXT;
ALTER TABLE folders ADD COLUMN icon_asset_id TEXT REFERENCES icon_assets(id) ON DELETE SET NULL;
ALTER TABLE folders ADD COLUMN icon_url TEXT;

CREATE INDEX idx_folders_icon_asset_id ON folders(icon_asset_id);
