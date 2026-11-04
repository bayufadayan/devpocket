import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { BuiltinIcon } from './BuiltinIcon'
import type { IconAsset } from '../types'

export const iconOptions = [
  { name: 'CodeXml', label: 'Kode' },
  { name: 'SquareTerminal', label: 'Terminal' },
  { name: 'Lightbulb', label: 'Ide' },
  { name: 'Database', label: 'Database' },
  { name: 'Package', label: 'Paket' },
  { name: 'BookOpen', label: 'Dokumentasi' },
  { name: 'Wrench', label: 'Tools' },
  { name: 'Layers3', label: 'Library' },
  { name: 'Rocket', label: 'Project' },
  { name: 'Cloud', label: 'Cloud' },
  { name: 'Server', label: 'Server' },
  { name: 'Workflow', label: 'Workflow' },
  { name: 'ShieldCheck', label: 'Keamanan' },
  { name: 'Braces', label: 'Snippet' },
  { name: 'Cpu', label: 'Komputasi' },
]

export type BuiltinIconName = typeof iconOptions[number]['name']

export function NoteIcon({ iconName, iconAssetId, iconUrl = null, size = 32 }: { iconName: string | null; iconAssetId: string | null; iconUrl?: string | null; size?: number }) {
  const imageUrl = iconUrl || (iconAssetId ? `/api/icons/${encodeURIComponent(iconAssetId)}/image` : null)
  if (imageUrl) return <span className="item-icon" style={{ width: size, height: size }}><img src={imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" /></span>
  const option = iconOptions.find((item) => item.name === iconName)
  if (!option) return null
  return <span className="item-icon" style={{ width: size, height: size }}><BuiltinIcon name={option.name} size={Math.round(size * 0.58)} /></span>
}

type IconPickerProps = {
  iconName: string
  iconAssetId: string
  iconUrl: string
  assets: IconAsset[]
  onSelect: (name: string, assetId: string) => void
  onSelectUrl: (url: string) => void
  onUpload: (file: File) => Promise<void>
  onDelete: (asset: IconAsset) => void
  clearLabel?: string
}

export function IconPicker({ iconName, iconAssetId, iconUrl, assets, onSelect, onSelectUrl, onUpload, onDelete, clearLabel = 'Hapus ikon dari catatan' }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'builtin' | 'upload' | 'saved' | 'url'>('builtin')
  const [query, setQuery] = useState('')
  const [urlValue, setUrlValue] = useState(iconUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const selected = iconOptions.find((item) => item.name === iconName)
  const selectedAsset = assets.find((asset) => asset.id === iconAssetId)
  useEffect(() => setUrlValue(iconUrl), [iconUrl])
  const visibleIcons = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return iconOptions.filter((item) => !needle || `${item.label} ${item.name}`.toLocaleLowerCase().includes(needle))
  }, [query])

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setUploadError('')
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setUploadError('Ukuran ikon maksimal 2 MB.'); return }
    setUploading(true)
    try { await onUpload(file) } catch (cause) { setUploadError(cause instanceof Error ? cause.message : 'Gagal menyimpan ikon.') }
    finally { setUploading(false) }
  }

  return <section className="icon-picker">
    <div className="icon-picker-current">
      <span className="field-label">Ikon</span>
      <div className="icon-picker-selection">
        {iconUrl || iconAssetId ? <NoteIcon iconName={null} iconAssetId={iconAssetId} iconUrl={iconUrl} size={36} /> : selected ? <NoteIcon iconName={iconName} iconAssetId="" size={36} /> : <span className="item-icon muted-icon"><BuiltinIcon name="Image" size={19} /></span>}
        <span className="icon-selection-name" title={iconUrl || undefined}>{iconUrl ? 'Ikon dari URL' : iconAssetId ? selectedAsset?.name ?? 'Ikon upload' : selected?.label ?? 'Tanpa ikon'}</span>
        <button className="button icon-picker-toggle" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Tutup' : 'Pilih ikon'}</button>
      </div>
    </div>
    {open && <div className="icon-picker-panel">
      <div className="icon-picker-tabs" role="group" aria-label="Sumber ikon">
        <button type="button" className={tab === 'builtin' ? 'selected' : ''} aria-pressed={tab === 'builtin'} onClick={() => setTab('builtin')}>Bawaan</button>
        <button type="button" className={tab === 'upload' ? 'selected' : ''} aria-pressed={tab === 'upload'} onClick={() => setTab('upload')}>Upload</button>
        <button type="button" className={tab === 'saved' ? 'selected' : ''} aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>Tersimpan{assets.length ? ` · ${assets.length}` : ''}</button>
        <button type="button" className={tab === 'url' ? 'selected' : ''} aria-pressed={tab === 'url'} onClick={() => setTab('url')}>URL</button>
      </div>

      {tab === 'builtin' && <div className="icon-library">
        <label className="sr-only" htmlFor="icon-search">Cari ikon</label>
        <input id="icon-search" className="icon-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari ikon" />
        <div className="icon-choice-grid">
          {visibleIcons.map(({ name, label }) => <button type="button" key={name} className={`icon-choice${iconName === name && !iconAssetId ? ' selected' : ''}`} aria-label={label} aria-pressed={iconName === name && !iconAssetId} title={label} onClick={() => onSelect(name, '')}><BuiltinIcon name={name} size={20} /><span>{label}</span></button>)}
          {!visibleIcons.length && <p className="icon-empty">Tidak ada ikon yang cocok.</p>}
        </div>
      </div>}

      {tab === 'upload' && <div className="icon-upload-panel">
        <label className="icon-upload-label">{uploading ? 'Menyimpan…' : 'Pilih gambar'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => void handleFile(event)} /></label>
        <span>PNG, JPEG, atau WebP · maksimal 2 MB</span>
        {uploadError && <p className="modal-error" role="alert">{uploadError}</p>}
      </div>}

      {tab === 'saved' && <div className="saved-icon-grid">
        {assets.map((asset) => <div className="saved-icon" key={asset.id}>
          <button type="button" className={`icon-choice saved-icon-choice${iconAssetId === asset.id ? ' selected' : ''}`} aria-label={`Pilih ${asset.name}`} aria-pressed={iconAssetId === asset.id} title={asset.name} onClick={() => onSelect('', asset.id)}><NoteIcon iconName={null} iconAssetId={asset.id} size={32} /><span>{asset.name}</span></button>
          <button type="button" className="saved-icon-delete" disabled={asset.used_count > 0} aria-label={`Hapus ${asset.name}`} title={asset.used_count ? 'Ikon sedang dipakai' : 'Hapus ikon'} onClick={() => onDelete(asset)}>×</button>
        </div>)}
        {!assets.length && <p className="icon-empty">Belum ada ikon upload.</p>}
      </div>}
      {tab === 'url' && <div className="icon-url-panel"><label htmlFor="icon-url">URL gambar</label><div className="icon-url-row"><input id="icon-url" type="url" inputMode="url" maxLength={2048} value={urlValue} onChange={(event) => { setUrlValue(event.target.value); setUploadError('') }} placeholder="https://contoh.com/icon.png" /><button className="button" type="button" onClick={() => { try { const parsed = new URL(urlValue.trim()); if (parsed.protocol !== 'https:') throw new Error(); onSelectUrl(parsed.href); setUploadError('') } catch { setUploadError('Masukkan URL gambar HTTPS yang valid.') } }}>Pakai URL</button></div>{uploadError && <p className="modal-error" role="alert">{uploadError}</p>}</div>}
      <button className="link-button icon-clear" type="button" onClick={() => { onSelect('', ''); onSelectUrl('') }}>{clearLabel}</button>
    </div>}
  </section>
}
