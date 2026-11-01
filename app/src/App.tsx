import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { api } from './api'
import { MarkdownContent } from './components/MarkdownContent'
import { IconPicker, NoteIcon } from './components/ItemIcons'
import type { CollectionLayout, CollectionTab, CollectionView, Folder, IconAsset, Note, NoteInput, NoteUsage } from './types'
import './App.css'

const usageLabels: Record<NoteUsage, string> = { try: 'Ingin dicoba', active: 'Aktif digunakan', reference: 'Referensi' }
const tabOptions: { id: CollectionTab; label: string }[] = [
  { id: 'all', label: 'Semua' }, { id: 'try', label: 'Ingin dicoba' }, { id: 'active', label: 'Aktif digunakan' },
  { id: 'reference', label: 'Referensi' }, { id: 'draft', label: 'Draft' },
]

type EditorState = { mode: 'new'; folderId: string | null } | { mode: 'edit'; note: Note } | { mode: 'detail'; note: Note } | null
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }

function Icon({ name, size = 18 }: { name: 'folder' | 'grid' | 'list' | 'columns' | 'plus' | 'search' | 'filter' | 'close' | 'back' | 'external' | 'edit' | 'trash' | 'sparkles' | 'install'; size?: number }) {
  const paths: Record<string, ReactNode> = {
    folder: <><path d="M3 6.5h6l2 2h10v10.8H3z"/><path d="M3 9h18"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    columns: <><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></>,
    filter: <><path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="8" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    back: <><path d="m14 5-7 7 7 7"/><path d="M7 12h13"/></>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></>,
    edit: <><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5z"/><path d="m13.8 6.7 3.5 3.5"/></>,
    trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/></>,
    sparkles: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></>,
    install: <><path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Modal({ title, onClose, children, wide = false, icon }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; icon?: ReactNode }) {
  const modalRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const modal = modalRef.current
    const focusable = () => modal?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    const nodes = focusable()
    if (nodes?.length && !modal?.contains(document.activeElement)) nodes[0].focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeRef.current(); return }
      if (event.key !== 'Tab') return
      const current = focusable()
      if (!current?.length) return
      const first = current[0]
      const last = current[current.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); previous?.focus() }
  }, [])
  return <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <section ref={modalRef} className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="modal-head"><div className="modal-heading">{icon}<h2>{title}</h2></div><button className="icon-button" aria-label="Tutup" onClick={onClose}><Icon name="close" /></button></header>
      {children}
    </section>
  </div>
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(value))
}

function App() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [iconAssets, setIconAssets] = useState<IconAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<CollectionView>(() => localStorage.getItem('devpocket-view') === 'items' ? 'items' : 'folders')
  const [layout, setLayout] = useState<CollectionLayout>(() => localStorage.getItem('devpocket-layout') === 'compare' ? 'compare' : 'standard')
  const [tab, setTab] = useState<CollectionTab>(() => (tabOptions.some((x) => x.id === localStorage.getItem('devpocket-tab')) ? localStorage.getItem('devpocket-tab') as CollectionTab : 'all'))
  const [openFolder, setOpenFolder] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('')
  const [folderFilter, setFolderFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [editor, setEditor] = useState<EditorState>(null)
  const [folderModal, setFolderModal] = useState(false)
  const [toast, setToast] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [aiSearchMode, setAiSearchMode] = useState(false)
  const [aiResults, setAiResults] = useState<string[] | null>(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [editorPreview, setEditorPreview] = useState(false)
  const [iconName, setIconName] = useState('')
  const [iconAssetId, setIconAssetId] = useState('')
  const [previewContent, setPreviewContent] = useState('')
  const [tabsStuck, setTabsStuck] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
  const [appInstalled, setAppInstalled] = useState(false)
  const [dragOver, setDragOver] = useState<CollectionTab | null>(null)
  const tabsSentinel = useRef<HTMLDivElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const sourceInput = useRef<HTMLInputElement>(null)
  const contentInput = useRef<HTMLTextAreaElement>(null)

  const refresh = async () => {
    setError('')
    try {
      const [nextFolders, nextNotes, aiStatus, nextIcons] = await Promise.all([api.getFolders(), api.getNotes(), api.getAiStatus(), api.getIcons()])
      setFolders(nextFolders); setNotes(nextNotes); setIconAssets(nextIcons)
      setAiConfigured(aiStatus.configured)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat catatan.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    setAppInstalled(isStandalone)
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPrompt)
    }
    const installed = () => {
      setAppInstalled(true)
      setInstallPrompt(null)
      setToast('DevPocket terpasang')
    }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installed)
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])
  useEffect(() => { localStorage.setItem('devpocket-view', view) }, [view])
  useEffect(() => { localStorage.setItem('devpocket-layout', layout) }, [layout])
  useEffect(() => { localStorage.setItem('devpocket-tab', tab) }, [tab])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 2200); return () => clearTimeout(id) }, [toast])
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector<HTMLInputElement>('#global-search')?.focus() } }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [])
  useEffect(() => {
    const sentinel = tabsSentinel.current
    if (!sentinel || view !== 'items' || layout !== 'standard' || openFolder) { setTabsStuck(false); return }
    const observer = new IntersectionObserver(([entry]) => setTabsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [view, layout, openFolder])

  const filtered = useMemo(() => notes.filter((note) => {
    const needle = query.trim().toLocaleLowerCase()
    const matchesText = aiResults ? aiResults.includes(note.id) : !needle || [note.title, note.content, note.source_url ?? '', note.platform, note.folder_name ?? ''].some((v) => v.toLocaleLowerCase().includes(needle))
    const matchesFolder = !folderFilter || (folderFilter === 'draft' ? note.status === 'draft' : note.folder_id === folderFilter)
    const cutoff = dateFilter ? Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000 : 0
    const matchesDate = !cutoff || new Date(note.created_at).getTime() >= cutoff
    return matchesText && matchesFolder && matchesDate && (!platformFilter || note.platform === platformFilter)
  }), [notes, query, platformFilter, folderFilter, dateFilter, aiResults])
  const platforms = useMemo(() => [...new Set(notes.map((note) => note.platform))].sort(), [notes])
  const currentFolder = folders.find((folder) => folder.id === openFolder)
  const folderNotes = openFolder === 'draft' ? filtered.filter((note) => note.status === 'draft') : openFolder ? filtered.filter((note) => note.folder_id === openFolder) : filtered
  const activeItems = filtered.filter((note) => tab === 'all' || (tab === 'draft' ? note.status === 'draft' : note.status === 'collection' && note.usage === tab))

  function openNew(folderId: string | null = null) { setError(''); setEditorPreview(false); setPreviewContent(''); setIconName(''); setIconAssetId(''); setEditor({ mode: 'new', folderId }) }
  async function installApp() {
    if (installPrompt) {
      try {
        await installPrompt.prompt()
        const choice = await installPrompt.userChoice
        setInstallPrompt(null)
        if (choice.outcome === 'accepted') { setAppInstalled(true); setToast('DevPocket terpasang') }
      } catch {
        setToast('Pilih “Pasang aplikasi” dari menu browser')
      }
      return
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setToast(isIos ? 'Safari: Bagikan → Tambahkan ke Layar Utama' : 'Pilih “Pasang aplikasi” dari menu browser')
  }
  function editNote(note: Note) { setError(''); setEditorPreview(false); setPreviewContent(note.content); setIconName(note.icon_name ?? ''); setIconAssetId(note.icon_asset_id ?? ''); setEditor({ mode: 'edit', note }) }
  async function generateFromLink() {
    if (!aiConfigured) { setError('Gemini belum disiapkan.'); return }
    const sourceUrl = sourceInput.current?.value.trim() ?? ''
    if (!sourceUrl) { setError('Masukkan link sumber dulu.'); return }
    setError(''); setAiGenerating(true)
    try {
      const suggestion = await api.createAiSuggestion(sourceUrl)
      if (titleInput.current) titleInput.current.value = suggestion.title
      if (contentInput.current) contentInput.current.value = suggestion.content
      setPreviewContent(suggestion.content); setEditorPreview(false); setToast('Draf AI dibuat. Periksa sebelum disimpan.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal membuat catatan dari link.') }
    finally { setAiGenerating(false) }
  }
  async function runAiSearch() {
    if (!aiConfigured) { setError('Gemini belum disiapkan.'); return }
    const searchTerm = query.trim()
    if (searchTerm.length < 3) { setError('Tulis sedikit deskripsi untuk mencari.'); return }
    const acknowledged = localStorage.getItem('devpocket-ai-search-disclosure') === 'accepted'
    if (!acknowledged) {
      const accepted = window.confirm('Pencarian AI mengirim judul dan potongan isi catatan ke Google Gemini. Pada paket gratis, data dapat digunakan untuk meningkatkan produk. Lanjutkan?')
      if (!accepted) return
      localStorage.setItem('devpocket-ai-search-disclosure', 'accepted')
    }
    setError(''); setAiSearching(true)
    try {
      const result = await api.aiSearch(searchTerm)
      setAiResults(result.results.map((item) => item.id)); setView('items'); setTab('all'); setToast('Pencarian selesai')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Pencarian AI gagal.') }
    finally { setAiSearching(false) }
  }
  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const destination = String(form.get('destination')) as 'draft' | 'collection'
    const folderId = String(form.get('folderId') ?? '')
    const usage = String(form.get('usage') ?? '') as NoteUsage | ''
    const input: NoteInput = { title: String(form.get('title') ?? '').trim(), content: String(form.get('content') ?? ''), sourceUrl: String(form.get('sourceUrl') ?? '').trim(), destination, folderId, usage, iconName: String(form.get('iconName') ?? ''), iconAssetId: String(form.get('iconAssetId') ?? '') }
    try {
      if (editor?.mode === 'edit') await api.updateNote(editor.note.id, input)
      else await api.createNote(input)
      setEditor(null); setToast('Tersimpan'); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menyimpan. Coba lagi.') }
  }
  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try { await api.createFolder(String(form.get('name') ?? '').trim()); setFolderModal(false); setToast('Folder ditambahkan'); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menambah folder.') }
  }
  async function uploadIcon(file: File) {
    const asset = await api.uploadIcon(file)
    setIconAssets((current) => [asset, ...current])
    setIconName(''); setIconAssetId(asset.id)
    setToast('Ikon tersimpan')
  }
  async function deleteIcon(asset: IconAsset) {
    if (asset.used_count || !window.confirm(`Hapus ikon “${asset.name}”?`)) return
    try {
      await api.deleteIcon(asset.id)
      setIconAssets((current) => current.filter((item) => item.id !== asset.id))
      if (iconAssetId === asset.id) setIconAssetId('')
      setToast('Ikon dihapus')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menghapus ikon.') }
  }
  async function removeNote(note: Note) {
    if (!window.confirm(`Hapus “${note.title}”?`)) return
    try { await api.deleteNote(note.id); setEditor(null); setToast('Dihapus'); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menghapus catatan.') }
  }
  async function dropOn(event: DragEvent<HTMLElement>, destination: CollectionTab) {
    event.preventDefault()
    const id = dragId || event.dataTransfer.getData('text/plain')
    const note = notes.find((item) => item.id === id)
    if (!note || destination === 'all') return
    try {
      if (destination === 'draft') await api.moveNote(note.id, 'draft')
      else {
        if (!note.folder_id) { setToast('Pilih folder lewat Edit'); editNote(note); return }
        await api.updateNote(note.id, { destination: 'collection', folderId: note.folder_id, usage: destination })
      }
      setDragId(null); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memindahkan catatan.') }
  }

  function NoteCard({ note, showFolder = false }: { note: Note; showFolder?: boolean }) {
    return <button className="note-card" onClick={() => setEditor({ mode: 'detail', note })}>
      <span className="note-meta"><i className={`platform-dot dot-${note.platform.toLowerCase().replace(/[^a-z]/g, '')}`} />{note.platform}<span>·</span>{formatDate(note.created_at)}</span>
      <span className="note-heading">{(note.icon_name || note.icon_asset_id) && <NoteIcon iconName={note.icon_name} iconAssetId={note.icon_asset_id} size={30} />}<strong>{note.title}</strong></span>
      {showFolder && <span className="note-folder"><Icon name="folder" size={14} />{note.status === 'draft' ? 'Draft' : note.folder_name}</span>}
      {note.content && <span className="note-excerpt">{note.content.replace(/[#*`>\[\]]/g, '').replace(/\s+/g, ' ').slice(0, 140)}</span>}
      <span className="note-footer">{note.usage && <span className={`usage-tag usage-${note.usage}`}>{usageLabels[note.usage]}</span>}</span>
    </button>
  }

  function CompareCard({ note }: { note: Note }) {
    return <article className="compare-card" draggable onDragStart={(event) => { setDragId(note.id); event.dataTransfer.setData('text/plain', note.id) }} onDragEnd={() => setDragId(null)}>
      <button className="compare-main" onClick={() => setEditor({ mode: 'detail', note })}><span className="note-meta">{note.platform} · {formatDate(note.created_at)}</span><span className="note-heading">{(note.icon_name || note.icon_asset_id) && <NoteIcon iconName={note.icon_name} iconAssetId={note.icon_asset_id} size={28} />}<strong>{note.title}</strong></span><span className="note-folder"><Icon name="folder" size={14} />{note.status === 'draft' ? 'Draft' : note.folder_name}</span></button>
      <span className="drag-mark" aria-hidden="true">⠿</span>
    </article>
  }

  const pageTitle = openFolder === 'draft' ? 'Draft' : currentFolder?.name ?? 'Koleksi'

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => { setOpenFolder(null); setView('folders') }}>DevPocket</button><div className="topbar-actions">{!appInstalled && <button className="button install-button" onClick={() => void installApp()} aria-label="Pasang DevPocket" title="Pasang DevPocket"><Icon name="install" /><span>Pasang</span></button>}<button className="button primary" onClick={() => openNew(openFolder && openFolder !== 'draft' ? openFolder : null)}><Icon name="plus" />Tambah catatan</button></div></header>
    <main className="workspace">
      <div className="search-row"><div className={`search-box${aiSearchMode ? ' ai-search-box' : ''}`}><Icon name="search" /><input id="global-search" aria-label="Cari catatan" value={query} onChange={(event) => { setQuery(event.target.value); setAiResults(null) }} onKeyDown={(event) => { if (event.key === 'Enter' && aiSearchMode) void runAiSearch() }} placeholder={aiSearchMode ? (aiConfigured ? 'Jelaskan yang kamu ingat...' : 'Gemini belum disiapkan') : 'Cari catatan...'} /><button className={`search-mode${aiSearchMode ? ' active' : ''}`} type="button" aria-pressed={aiSearchMode} onClick={() => { setAiSearchMode(!aiSearchMode); setAiResults(null) }} title="Ganti pencarian kata atau AI">{aiSearchMode ? 'AI' : 'Kata'}</button>{aiSearchMode ? <button className="search-submit" type="button" onClick={() => void runAiSearch()} disabled={!aiConfigured || aiSearching} aria-label="Cari dengan AI" title={aiConfigured ? 'Cari dengan AI' : 'Gemini belum disiapkan'}>{aiSearching ? '…' : <Icon name="sparkles" size={16} />}</button> : <kbd>Ctrl K</kbd>}</div><div className="filter-holder"><button className={`icon-button filter-button${filterOpen ? ' pressed' : ''}`} aria-label="Filter" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" />{(platformFilter || folderFilter || dateFilter) && <i className="filter-dot" />}</button>{filterOpen && <div className="filter-pop"><label htmlFor="platform-filter">Platform</label><select id="platform-filter" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="">Semua platform</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select><label htmlFor="folder-filter">Folder</label><select id="folder-filter" value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}><option value="">Semua folder</option><option value="draft">Draft</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select><label htmlFor="date-filter">Tanggal ditambahkan</label><select id="date-filter" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="">Kapan saja</option><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option></select><button className="link-button" onClick={() => { setPlatformFilter(''); setFolderFilter(''); setDateFilter(''); setFilterOpen(false) }}>Hapus filter</button></div>}</div></div>

      {error && !editor && !folderModal && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Tutup pesan">×</button></div>}

      {openFolder && <button className="back-link" onClick={() => setOpenFolder(null)}><Icon name="back" size={16} />Koleksi</button>}

      <section className="section-head"><div className="section-title">{openFolder && <button className="icon-button heading-icon" onClick={() => setOpenFolder(null)} aria-label="Kembali ke koleksi"><Icon name="back" /></button>}<h1>{pageTitle}</h1></div><span className="count-label">{openFolder ? folderNotes.length : filtered.length} item</span></section>

      {!openFolder && <div className="view-tools"><div className="segmented" role="group" aria-label="Tampilan koleksi"><button className={view === 'folders' ? 'selected' : ''} aria-pressed={view === 'folders'} onClick={() => setView('folders')} title="Folder"><Icon name="folder" /></button><button className={view === 'items' ? 'selected' : ''} aria-pressed={view === 'items'} onClick={() => setView('items')} title="Semua item"><Icon name="grid" /></button></div>{view === 'folders' && <button className="button" onClick={() => { setError(''); setFolderModal(true) }}><Icon name="plus" />Tambah folder</button>}{view === 'items' && <div className="layout-tools"><button className={layout === 'standard' ? 'selected' : ''} onClick={() => setLayout('standard')} aria-label="Tampilan standar" title="Standar"><Icon name="list" /></button><button className={layout === 'compare' ? 'selected' : ''} onClick={() => setLayout('compare')} aria-label="Tampilan compare" title="Compare"><Icon name="columns" /></button><button className="add-icon" onClick={() => openNew()} aria-label="Tambah catatan" title="Tambah catatan"><Icon name="plus" /></button></div>}</div>}

      {loading ? <p className="empty-state">Memuat...</p> : openFolder ? <div className="items-grid">{folderNotes.map((note) => <NoteCard key={note.id} note={note} />)}{!folderNotes.length && <p className="empty-state">Belum ada catatan</p>}</div> : view === 'folders' ? <div className="folder-grid">
        <div className="folder-wrap"><button className="folder-card draft-folder" onClick={() => setOpenFolder('draft')}><span className="folder-icon"><Icon name="folder" /></span><strong>Draft</strong><span>{notes.filter((note) => note.status === 'draft').length} item</span></button><button className="folder-add" onClick={() => openNew()} aria-label="Tambah catatan ke Draft" title="Tambah catatan ke Draft"><Icon name="plus" size={16} /></button></div>
        {folders.map((folder) => <div className="folder-wrap" key={folder.id}><button className="folder-card" onClick={() => setOpenFolder(folder.id)}><span className="folder-icon"><Icon name="folder" /></span><strong>{folder.name}</strong><span>{folder.item_count} item</span></button><button className="folder-add" onClick={() => openNew(folder.id)} aria-label={`Tambah catatan ke ${folder.name}`} title={`Tambah catatan ke ${folder.name}`}><Icon name="plus" size={16} /></button></div>)}
      </div> : layout === 'standard' ? <><div ref={tabsSentinel} className="sticky-sentinel" aria-hidden="true" /><div className={`sticky-tabs${tabsStuck ? ' is-stuck' : ''}`}><nav className="status-tabs" aria-label="Filter status">{tabOptions.map((option) => <button key={option.id} className={tab === option.id ? 'active' : ''} aria-pressed={tab === option.id} onClick={() => setTab(option.id)}>{option.label}</button>)}</nav>{tabsStuck && <button className="button primary sticky-add" onClick={() => openNew()}><Icon name="plus" /><span>Tambah catatan</span></button>}</div><div className="items-grid">{activeItems.map((note) => <NoteCard key={note.id} note={note} showFolder />)}{!activeItems.length && <p className="empty-state">{aiResults ? 'Tidak ada catatan yang mirip' : query ? 'Tidak ada yang cocok' : 'Belum ada catatan'}</p>}</div></> : <div className="compare-grid">{(['active', 'try', 'reference', 'draft'] as const).map((status) => {
        const list = filtered.filter((note) => status === 'draft' ? note.status === 'draft' : note.status === 'collection' && note.usage === status)
        return <section className={`compare-column${dragOver === status ? ' drag-over' : ''}`} key={status} onDragOver={(event) => { event.preventDefault(); setDragOver(status) }} onDragLeave={() => setDragOver(null)} onDrop={(event) => { setDragOver(null); void dropOn(event, status) }}><header><h2>{status === 'draft' ? 'Draft' : usageLabels[status]}</h2><span>{list.length}</span></header><div className="compare-list">{list.map((note) => <CompareCard key={note.id} note={note} />)}</div></section>
      })}</div>}
    </main>

    {folderModal && <Modal title="Tambah folder" onClose={() => setFolderModal(false)}><form className="form-body" onSubmit={(event) => void createFolder(event)}><label>Nama folder<input name="name" maxLength={60} required autoFocus placeholder="Misalnya: Tools" /></label>{error && <p className="modal-error" role="alert">{error}</p>}<footer className="form-actions"><button className="button" type="button" onClick={() => setFolderModal(false)}>Batal</button><button className="button primary" type="submit">Simpan</button></footer></form></Modal>}

    {(editor?.mode === 'new' || editor?.mode === 'edit') && <Modal title={editor.mode === 'edit' ? 'Edit catatan' : 'Tambah catatan'} onClose={() => setEditor(null)} wide><form className="form-body note-form" onSubmit={(event) => void saveNote(event)}>
      <label>Judul<input ref={titleInput} name="title" required maxLength={120} defaultValue={editor.mode === 'edit' ? editor.note.title : ''} autoFocus placeholder="Judul catatan" /></label>
      <label>Link sumber<input ref={sourceInput} name="sourceUrl" type="url" defaultValue={editor.mode === 'edit' ? editor.note.source_url ?? '' : ''} placeholder="https://..." /></label>
      <IconPicker iconName={iconName} iconAssetId={iconAssetId} assets={iconAssets} onSelect={(name, assetId) => { setIconName(name); setIconAssetId(assetId) }} onUpload={uploadIcon} onDelete={(asset) => void deleteIcon(asset)} />
      <input type="hidden" name="iconName" value={iconName} /><input type="hidden" name="iconAssetId" value={iconAssetId} />
      <div className="ai-capture-row"><button className={`button ai-button${aiGenerating ? ' loading' : ''}`} type="button" onClick={() => void generateFromLink()} disabled={!aiConfigured || aiGenerating} title={aiConfigured ? 'Buat judul dan catatan dari link' : 'Gemini belum disiapkan'}><Icon name="sparkles" />{aiGenerating ? 'Membaca sumber...' : 'Buat dengan AI'}</button>{!aiConfigured && <span className="ai-setup-note">Gemini belum disiapkan</span>}</div>
      <div className="editor-field"><span className="field-label">Catatan</span><div className="editor-tabs" role="group" aria-label="Mode editor"><button type="button" className={!editorPreview ? 'selected' : ''} aria-pressed={!editorPreview} onClick={() => setEditorPreview(false)}>Tulis</button><button type="button" className={editorPreview ? 'selected' : ''} aria-pressed={editorPreview} onClick={() => setEditorPreview(true)}>Preview</button></div><textarea ref={contentInput} name="content" rows={10} hidden={editorPreview} defaultValue={editor.mode === 'edit' ? editor.note.content : ''} onChange={(event) => setPreviewContent(event.target.value)} placeholder="Tulis dengan Markdown..." /><div className="editor-preview" hidden={!editorPreview}>{previewContent.trim() ? <MarkdownContent content={previewContent} /> : <span>Belum ada isi</span>}</div></div>
      <fieldset><legend>Simpan di</legend><label className="radio"><input type="radio" name="destination" value="draft" defaultChecked={editor.mode === 'new' ? !editor.folderId : editor.note.status === 'draft'} />Draft</label><label className="radio"><input type="radio" name="destination" value="collection" defaultChecked={editor.mode === 'new' ? Boolean(editor.folderId) : editor.note.status === 'collection'} />Koleksi</label></fieldset>
      <div className="form-row"><label>Folder<select name="folderId" defaultValue={editor.mode === 'new' ? editor.folderId ?? '' : editor.note.folder_id ?? ''}><option value="">Pilih folder</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folder.name}</option>)}</select></label><label>Penggunaan<select name="usage" defaultValue={editor.mode === 'edit' ? editor.note.usage ?? '' : 'try'}><option value="">Pilih status</option>{Object.entries(usageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      {error && <p className="modal-error" role="alert">{error}</p>}<footer className="form-actions"><button className="button" type="button" onClick={() => setEditor(null)}>Batal</button><button className="button primary" type="submit">Simpan</button></footer>
    </form></Modal>}

    {editor?.mode === 'detail' && <Modal title={editor.note.title} icon={(editor.note.icon_name || editor.note.icon_asset_id) ? <NoteIcon iconName={editor.note.icon_name} iconAssetId={editor.note.icon_asset_id} size={34} /> : null} onClose={() => setEditor(null)} wide><article className="detail-body"><div className="detail-meta">{editor.note.platform} · Ditambahkan {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(editor.note.created_at))} · {editor.note.status === 'draft' ? 'Draft' : editor.note.folder_name}{editor.note.usage && <> · {usageLabels[editor.note.usage]}</>}</div>{error && <p className="modal-error" role="alert">{error}</p>}<MarkdownContent content={editor.note.content} />{editor.note.source_url && <a className="source-link" href={editor.note.source_url} target="_blank" rel="noreferrer">Buka sumber <Icon name="external" size={15} /></a>}<footer className="detail-actions"><button className="button danger" onClick={() => void removeNote(editor.note)}><Icon name="trash" />Hapus</button><button className="button primary" onClick={() => editNote(editor.note)}><Icon name="edit" />Edit</button></footer></article></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

export default App
