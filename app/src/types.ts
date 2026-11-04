export type NoteStatus = 'draft' | 'collection'
export type NoteUsage = 'try' | 'active' | 'reference'
export type CollectionTab = 'all' | NoteUsage | 'draft'
export type CollectionLayout = 'standard' | 'compare'
export type CollectionView = 'folders' | 'items'

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  item_count: number
  child_count: number
  is_pinned: number
  is_system: number
  icon_name: string | null
  icon_asset_id: string | null
  icon_url: string | null
  created_at: string
}

export interface Note {
  id: string
  title: string
  content: string
  source_url: string | null
  platform: string
  folder_id: string | null
  folder_name: string | null
  status: NoteStatus
  usage: NoteUsage | null
  icon_name: string | null
  icon_asset_id: string | null
  icon_url: string | null
  is_pinned: number
  created_at: string
  updated_at: string
}

export interface IconAsset {
  id: string
  name: string
  content_type: string
  byte_size: number
  used_count: number
  url: string
}

export interface NoteInput {
  title: string
  content: string
  sourceUrl: string
  folderId: string
  usage: NoteUsage | ''
  iconName: string
  iconAssetId: string
  iconUrl: string
}
