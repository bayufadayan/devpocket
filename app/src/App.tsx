import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { api } from './api'
import { MarkdownContent } from './components/MarkdownContent'
import { BuiltinIcon } from './components/BuiltinIcon'
import { IconPicker, NoteIcon } from './components/ItemIcons'
import type { CollectionLayout, CollectionTab, CollectionView, Folder, IconAsset, Note, NoteInput, NoteUsage } from './types'
import './App.css'

const usageLabels: Record<NoteUsage, string> = { try: 'Ingin dicoba', active: 'Aktif digunakan', reference: 'Referensi' }
const DRAFT_FOLDER_ID = 'system-draft'
const tabOptions: { id: CollectionTab; label: string }[] = [
  { id: 'all', label: 'Semua' }, { id: 'try', label: 'Ingin dicoba' }, { id: 'active', label: 'Aktif digunakan' },
  { id: 'reference', label: 'Referensi' }, { id: 'draft', label: 'Draft' },
]

type EditorState = { mode: 'new'; folderId: string | null } | { mode: 'edit'; note: Note } | { mode: 'detail'; note: Note } | null
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }

function readAppRoute() {
  const segments = window.location.pathname.split('/').filter(Boolean)
  let folderId: string | null = null
  if (segments[0] === 'folders' && segments.length > 1) {
    try {
      const lastSegment = decodeURIComponent(segments[segments.length - 1])
      const separator = lastSegment.lastIndexOf('~')
      folderId = separator >= 0 ? lastSegment.slice(separator + 1) : lastSegment
    } catch { folderId = null }
  }
  return { folderId, noteId: new URLSearchParams(window.location.search).get('item') }
}

function folderRoutePath(folders: Folder[], folderId: string | null) {
  if (!folderId) return '/'
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const segments: string[] = []
  let folder = byId.get(folderId)
  while (folder) {
    segments.unshift(`${encodeURIComponent(folder.name)}~${encodeURIComponent(folder.id)}`)
    folder = folder.parent_id ? byId.get(folder.parent_id) : undefined
  }
  return segments.length ? `/folders/${segments.join('/')}` : '/'
}

function Icon({ name, size = 18, filled = false }: { name: 'folder' | 'grid' | 'list' | 'columns' | 'plus' | 'search' | 'filter' | 'close' | 'back' | 'external' | 'edit' | 'trash' | 'sparkles' | 'install' | 'star' | 'more'; size?: number; filled?: boolean }) {
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
    star: <path d="m12 3 2.75 5.58 6.16.9-4.45 4.34 1.05 6.13L12 17.06l-5.51 2.9 1.05-6.14L3.1 9.48l6.15-.9L12 3Z"/>,
    more: <><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Modal({ title, onClose, children, wide = false, icon, initialFocusSelector }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; icon?: ReactNode; initialFocusSelector?: string }) {
  const modalRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const pageX = window.scrollX
    const pageY = window.scrollY
    const body = document.body
    const previousBodyStyle = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow }
    const modal = modalRef.current
    body.style.position = 'fixed'
    body.style.top = `${-pageY}px`
    body.style.left = `${-pageX}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    const focusable = () => modal?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    const nodes = focusable()
    const target = initialFocusSelector ? modal?.querySelector<HTMLElement>(initialFocusSelector) : nodes?.[0]
    target?.focus({ preventScroll: true })
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
    return () => {
      window.removeEventListener('keydown', onKey)
      body.style.position = previousBodyStyle.position
      body.style.top = previousBodyStyle.top
      body.style.left = previousBodyStyle.left
      body.style.width = previousBodyStyle.width
      body.style.overflow = previousBodyStyle.overflow
      window.scrollTo(pageX, pageY)
      previous?.focus({ preventScroll: true })
    }
  }, [initialFocusSelector])
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

function FolderWatermark({ folder }: { folder: Folder }) {
  const imageUrl = folder.icon_url || (folder.icon_asset_id ? `/api/icons/${encodeURIComponent(folder.icon_asset_id)}/image` : '')
  if (imageUrl) return <span className="folder-watermark" aria-hidden="true"><img src={imageUrl} alt="" referrerPolicy="no-referrer" loading="lazy" /></span>
  if (folder.icon_name) return <span className="folder-watermark" aria-hidden="true"><BuiltinIcon name={folder.icon_name} size={116} /></span>
  return null
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
  const [openFolder, setOpenFolder] = useState<string | null>(() => readAppRoute().folderId)
  const [pendingNoteId, setPendingNoteId] = useState<string | null>(() => readAppRoute().noteId)
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('')
  const [folderFilter, setFolderFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [editor, setEditor] = useState<EditorState>(null)
  const [folderModal, setFolderModal] = useState(false)
  const [folderModalParentId, setFolderModalParentId] = useState('')
  const [folderIconName, setFolderIconName] = useState('')
  const [folderIconAssetId, setFolderIconAssetId] = useState('')
  const [folderIconUrl, setFolderIconUrl] = useState('')
  const [noteMoveMenu, setNoteMoveMenu] = useState<{ note: Note; x: number; y: number } | null>(null)
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null)
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [folderNameDraft, setFolderNameDraft] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null)
  const [folderActionBusy, setFolderActionBusy] = useState(false)
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
  const [iconUrl, setIconUrl] = useState('')
  const [editorFolderId, setEditorFolderId] = useState(DRAFT_FOLDER_ID)
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
  useEffect(() => {
    const syncRoute = () => {
      const route = readAppRoute()
      setOpenFolder(route.folderId)
      setPendingNoteId(route.noteId)
      setEditor(null)
    }
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])
  useEffect(() => {
    if (loading || !pendingNoteId) return
    const note = notes.find((item) => item.id === pendingNoteId)
    if (note) {
      setEditor((current) => (current?.mode === 'detail' || current?.mode === 'edit') && current.note.id === note.id ? current : { mode: 'detail', note })
      return
    }
    const url = new URL(window.location.href)
    if (url.searchParams.get('item') === pendingNoteId) {
      url.searchParams.delete('item')
      window.history.replaceState(window.history.state, '', url)
    }
    setPendingNoteId(null)
  }, [loading, notes, pendingNoteId])
  useEffect(() => {
    if (loading || !openFolder) return
    if (!folders.some((folder) => folder.id === openFolder)) {
      const url = new URL(window.location.href)
      url.pathname = '/'
      window.history.replaceState(window.history.state, '', url)
      setOpenFolder(null)
      return
    }
    const path = folderRoutePath(folders, openFolder)
    if (window.location.pathname !== path) {
      const url = new URL(window.location.href)
      url.pathname = path
      window.history.replaceState(window.history.state, '', url)
    }
  }, [folders, loading, openFolder])
  useEffect(() => { setFolderMenuId(null) }, [openFolder, view])
  useEffect(() => {
    if (!noteMoveMenu) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !document.querySelector('.note-move-menu')?.contains(event.target)) setNoteMoveMenu(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNoteMoveMenu(null) }
    window.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [noteMoveMenu])
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

  const folderPaths = useMemo(() => {
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    const paths = new Map<string, string>()
    for (const folder of folders) {
      const names: string[] = []
      let current: Folder | undefined = folder
      while (current) {
        names.unshift(current.name)
        current = current.parent_id ? byId.get(current.parent_id) : undefined
      }
      paths.set(folder.id, names.join(' / '))
    }
    return paths
  }, [folders])
  const folderSubtrees = useMemo(() => {
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    const result = new Map<string, Set<string>>()
    for (const folder of folders) {
      const ancestors = new Set<string>([folder.id])
      let parent = folder.parent_id ? byId.get(folder.parent_id) : undefined
      while (parent) { ancestors.add(parent.id); parent = parent.parent_id ? byId.get(parent.parent_id) : undefined }
      result.set(folder.id, ancestors)
    }
    return result
  }, [folders])
  const draftFolderIds = useMemo(() => new Set(folders.filter((folder) => folderSubtrees.get(folder.id)?.has(DRAFT_FOLDER_ID)).map((folder) => folder.id)), [folders, folderSubtrees])
  const moveFolderOptions = useMemo(() => [...folders].sort((a, b) => Number(!draftFolderIds.has(a.id)) - Number(!draftFolderIds.has(b.id)) || (folderPaths.get(a.id) ?? a.name).localeCompare(folderPaths.get(b.id) ?? b.name, 'id')), [folders, draftFolderIds, folderPaths])
  const draftFolderId = folders.find((folder) => folder.is_system)?.id ?? DRAFT_FOLDER_ID
  const folderItemCounts = useMemo(() => {
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    const counts = new Map(folders.map((folder) => [folder.id, 0]))
    for (const note of notes) {
      let folder = note.folder_id ? byId.get(note.folder_id) : undefined
      while (folder) {
        counts.set(folder.id, (counts.get(folder.id) ?? 0) + 1)
        folder = folder.parent_id ? byId.get(folder.parent_id) : undefined
      }
    }
    return counts
  }, [folders, notes])
  const filtered = useMemo(() => notes.filter((note) => {
    const needle = query.trim().toLocaleLowerCase()
    const matchesText = aiResults ? aiResults.includes(note.id) : !needle || [note.title, note.content, note.source_url ?? '', note.platform, note.folder_id ? folderPaths.get(note.folder_id) ?? note.folder_name ?? '' : ''].some((v) => v.toLocaleLowerCase().includes(needle))
    const matchesFolder = !folderFilter || Boolean(note.folder_id && folderSubtrees.get(note.folder_id)?.has(folderFilter))
    const cutoff = dateFilter ? Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000 : 0
    const matchesDate = !cutoff || new Date(note.created_at).getTime() >= cutoff
    return matchesText && matchesFolder && matchesDate && (!platformFilter || note.platform === platformFilter)
  }), [notes, query, platformFilter, folderFilter, dateFilter, aiResults, folderPaths, folderSubtrees])
  const platforms = useMemo(() => [...new Set(notes.map((note) => note.platform))].sort(), [notes])
  const currentFolder = folders.find((folder) => folder.id === openFolder)
  const folderOrder = (a: Folder, b: Folder) => Number(b.is_system) - Number(a.is_system) || b.is_pinned - a.is_pinned || a.name.localeCompare(b.name, 'id')
  const folderChildren = (openFolder === null ? folders.filter((folder) => folder.parent_id === null) : currentFolder ? folders.filter((folder) => folder.parent_id === currentFolder.id) : []).sort(folderOrder)
  const currentPath: Folder[] = []
  if (currentFolder) {
    const byId = new Map(folders.map((folder) => [folder.id, folder]))
    let parent: Folder | undefined = currentFolder
    while (parent) { currentPath.unshift(parent); parent = parent.parent_id ? byId.get(parent.parent_id) : undefined }
  }
  const folderNotes = (openFolder ? filtered.filter((note) => note.folder_id === openFolder) : filtered)
    .sort((a, b) => b.is_pinned - a.is_pinned)
  const activeItems = filtered.filter((note) => tab === 'all' || (tab === 'draft' ? note.status === 'draft' : note.status === 'collection' && note.usage === tab)).sort((a, b) => b.is_pinned - a.is_pinned)

  function navigateToFolder(folderId: string | null) {
    const url = new URL(window.location.href)
    url.pathname = folderRoutePath(folders, folderId)
    url.searchParams.delete('item')
    if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
      const state = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
      window.history.pushState({ ...state, devpocketNavigation: true }, '', url)
    }
    setPendingNoteId(null)
    setEditor(null)
    setOpenFolder(folderId)
  }
  function openNoteModal(note: Note) {
    const url = new URL(window.location.href)
    url.searchParams.set('item', note.id)
    if (url.search !== window.location.search) {
      const state = window.history.state && typeof window.history.state === 'object' ? window.history.state : {}
      window.history.pushState({ ...state, devpocketModalNoteId: note.id }, '', url)
    }
    setPendingNoteId(note.id)
    setEditor({ mode: 'detail', note })
  }
  function closeNoteModal() {
    const noteId = editor && editor.mode !== 'new' ? editor.note.id : null
    setEditor(null)
    setPendingNoteId(null)
    if (!noteId) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('item') !== noteId) return
    const state = window.history.state as { devpocketModalNoteId?: string } | null
    if (state?.devpocketModalNoteId === noteId) window.history.back()
    else {
      url.searchParams.delete('item')
      window.history.replaceState(window.history.state, '', url)
    }
  }
  function openNew(folderId: string | null = null) { const targetFolder = folderId ?? draftFolderId; setError(''); setEditorPreview(false); setPreviewContent(''); setIconName(''); setIconAssetId(''); setIconUrl(''); setEditorFolderId(targetFolder); setEditor({ mode: 'new', folderId: targetFolder }) }
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
  function editNote(note: Note) {
    setError(''); setEditorPreview(false); setPreviewContent(note.content)
    setIconName(note.icon_name ?? ''); setIconAssetId(note.icon_asset_id ?? ''); setIconUrl(note.icon_url ?? '')
    setEditorFolderId(note.folder_id ?? draftFolderId)
    setEditor({ mode: 'edit', note })
    window.requestAnimationFrame(() => titleInput.current?.focus({ preventScroll: true }))
  }
  async function toggleNotePinned(note: Note) {
    const pinned = !note.is_pinned
    try {
      const updated = await api.pinNote(note.id, pinned)
      setNotes((current) => current.map((item) => item.id === updated.id ? updated : item))
      setEditor((current) => current?.mode === 'detail' && current.note.id === updated.id ? { ...current, note: updated } : current)
      setToast(pinned ? 'Item disematkan' : 'Sematan dilepas')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal mengubah sematan item.') }
  }
  async function toggleFolderPinned(folder: Folder) {
    const pinned = !folder.is_pinned
    try {
      const updated = await api.pinFolder(folder.id, pinned)
      setFolders((current) => current.map((item) => item.id === updated.id ? updated : item))
      setToast(pinned ? 'Folder disematkan' : 'Sematan folder dilepas')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal mengubah sematan folder.') }
  }
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
    const folderId = String(form.get('folderId') ?? '')
    const usage = String(form.get('usage') ?? '') as NoteUsage | ''
    const input: NoteInput = { title: String(form.get('title') ?? '').trim(), content: String(form.get('content') ?? ''), sourceUrl: String(form.get('sourceUrl') ?? '').trim(), folderId, usage, iconName: String(form.get('iconName') ?? ''), iconAssetId: String(form.get('iconAssetId') ?? ''), iconUrl: String(form.get('iconUrl') ?? '') }
    try {
      if (editor?.mode === 'edit') await api.updateNote(editor.note.id, input)
      else await api.createNote(input)
      if (editor?.mode === 'edit') closeNoteModal()
      else setEditor(null)
      setToast('Tersimpan'); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menyimpan. Coba lagi.') }
  }
  function startCreateFolder(parentId: string) {
    setError('')
    setFolderModalParentId(parentId)
    setFolderIconName('')
    setFolderIconAssetId('')
    setFolderIconUrl('')
    setFolderModal(true)
  }
  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api.createFolder(String(form.get('name') ?? '').trim(), String(form.get('parentFolderId') ?? '') || null, folderIconName, folderIconAssetId, folderIconUrl)
      setFolderModal(false); setToast('Folder ditambahkan'); await refresh()
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menambah folder.') }
  }
  function startRenameFolder(folder: Folder) {
    setFolderMenuId(null)
    setError('')
    setFolderNameDraft(folder.name)
    setFolderIconName(folder.icon_name ?? '')
    setFolderIconAssetId(folder.icon_asset_id ?? '')
    setFolderIconUrl(folder.icon_url ?? '')
    setEditingFolder(folder)
  }
  async function saveFolderName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingFolder) return
    setFolderActionBusy(true)
    setError('')
    try {
      const updated = await api.updateFolder(editingFolder.id, folderNameDraft.trim(), folderIconName, folderIconAssetId, folderIconUrl)
      setFolders((current) => current.map((folder) => folder.id === updated.id ? updated : folder))
      setEditingFolder(null)
      setToast('Folder diperbarui')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal mengganti nama folder.') }
    finally { setFolderActionBusy(false) }
  }
  async function deleteFolderContents(contents: 'draft' | 'delete') {
    if (!folderToDelete) return
    setFolderActionBusy(true)
    setError('')
    try {
      await api.deleteFolder(folderToDelete.id, contents)
      setFolderToDelete(null)
      setToast(contents === 'draft' ? 'Isi folder dipindahkan ke Draft' : 'Folder dan isinya dihapus')
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menghapus folder.') }
    finally { setFolderActionBusy(false) }
  }
  async function uploadIcon(file: File) {
    const asset = await api.uploadIcon(file)
    setIconAssets((current) => [asset, ...current])
    setIconName(''); setIconAssetId(asset.id); setIconUrl('')
    setToast('Ikon tersimpan')
  }
  async function uploadFolderIcon(file: File) {
    const asset = await api.uploadIcon(file)
    setIconAssets((current) => [asset, ...current])
    setFolderIconName(''); setFolderIconAssetId(asset.id); setFolderIconUrl('')
    setToast('Ikon tersimpan')
  }
  async function deleteIcon(asset: IconAsset) {
    if (asset.used_count || !window.confirm(`Hapus ikon “${asset.name}”?`)) return
    try {
      await api.deleteIcon(asset.id)
      setIconAssets((current) => current.filter((item) => item.id !== asset.id))
      if (iconAssetId === asset.id) setIconAssetId('')
      if (folderIconAssetId === asset.id) { setFolderIconName(''); setFolderIconAssetId(''); setFolderIconUrl('') }
      setToast('Ikon dihapus')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menghapus ikon.') }
  }
  function selectBuiltinIcon(name: string, assetId: string) { setIconName(name); setIconAssetId(assetId); setIconUrl('') }
  function selectIconUrl(url: string) { setIconName(''); setIconAssetId(''); setIconUrl(url) }
  function selectFolderBuiltinIcon(name: string, assetId: string) { setFolderIconName(name); setFolderIconAssetId(assetId); setFolderIconUrl('') }
  function selectFolderIconUrl(url: string) { setFolderIconName(''); setFolderIconAssetId(''); setFolderIconUrl(url) }
  async function removeNote(note: Note) {
    if (!window.confirm(`Hapus “${note.title}”?`)) return
    try { await api.deleteNote(note.id); closeNoteModal(); setToast('Dihapus'); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal menghapus catatan.') }
  }
  function showNoteMoveMenu(note: Note, event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault()
    const menuHeight = Math.min(window.innerHeight * 0.72, 440)
    setFolderMenuId(null)
    setNoteMoveMenu({
      note,
      x: Math.max(12, Math.min(event.clientX, window.innerWidth - 292)),
      y: Math.max(12, Math.min(event.clientY, window.innerHeight - menuHeight - 12)),
    })
  }
  async function moveNoteToFolder(note: Note, folder: Folder) {
    if (note.folder_id === folder.id || movingNoteId) return
    const usage: NoteUsage | '' = draftFolderIds.has(folder.id) ? '' : note.status === 'collection' ? note.usage ?? 'try' : 'try'
    setMovingNoteId(note.id)
    setError('')
    try {
      const updated = await api.updateNote(note.id, { folderId: folder.id, usage })
      setNotes((current) => current.map((item) => item.id === updated.id ? updated : item))
      setNoteMoveMenu(null)
      setToast(`Dipindahkan ke ${folderPaths.get(folder.id) ?? folder.name}`)
      await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memindahkan item.') }
    finally { setMovingNoteId(null) }
  }
  async function dropOn(event: DragEvent<HTMLElement>, destination: CollectionTab) {
    event.preventDefault()
    const id = dragId || event.dataTransfer.getData('text/plain')
    const note = notes.find((item) => item.id === id)
    if (!note || destination === 'all') return
    try {
      if (destination === 'draft') {
        if (note.status === 'draft') return
        await api.updateNote(note.id, { folderId: draftFolderId, usage: '' })
      }
      else {
        if (note.status === 'draft') { setToast('Pilih folder koleksi lewat Edit'); editNote(note); return }
        if (!note.folder_id) return
        await api.updateNote(note.id, { folderId: note.folder_id, usage: destination })
      }
      setDragId(null); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memindahkan catatan.') }
  }

  function NoteCard({ note, showFolder = false }: { note: Note; showFolder?: boolean }) {
    return <article className="note-card" onContextMenu={(event) => showNoteMoveMenu(note, event)}>
      <button className="note-card-main" onClick={() => openNoteModal(note)}>
        <span className="note-meta"><i className={`platform-dot dot-${note.platform.toLowerCase().replace(/[^a-z]/g, '')}`} />{note.platform}<span>·</span>{formatDate(note.created_at)}</span>
        <span className="note-heading">{(note.icon_name || note.icon_asset_id || note.icon_url) && <NoteIcon iconName={note.icon_name} iconAssetId={note.icon_asset_id} iconUrl={note.icon_url} size={30} />}<strong>{note.title}</strong></span>
        {showFolder && <span className="note-folder"><Icon name="folder" size={14} />{note.folder_id ? folderPaths.get(note.folder_id) ?? note.folder_name : note.folder_name}</span>}
        {note.content && <span className="note-excerpt">{note.content.replace(/[#*`>\[\]]/g, '').replace(/\s+/g, ' ').slice(0, 140)}</span>}
      </button>
      <span className="note-footer">{note.usage && <span className={`usage-tag usage-${note.usage}`}>{usageLabels[note.usage]}</span>}<button className={`pin-button${note.is_pinned ? ' is-pinned' : ''}`} onClick={() => void toggleNotePinned(note)} aria-label={note.is_pinned ? 'Lepas sematan item' : 'Sematkan item'} title={note.is_pinned ? 'Lepas sematan' : 'Sematkan'}><Icon name="star" size={17} filled={Boolean(note.is_pinned)} /></button></span>
    </article>
  }

  function FolderCard({ folder }: { folder: Folder }) {
    return <div className="folder-wrap">
      <button className={`folder-card${folder.is_system ? ' draft-folder' : ''}`} onClick={() => { setFolderMenuId(null); navigateToFolder(folder.id) }}><FolderWatermark folder={folder} /><span className="folder-icon"><Icon name="folder" /></span><strong>{folder.name}</strong><span>{folderItemCounts.get(folder.id) ?? folder.item_count} item{folder.child_count ? ` · ${folder.child_count} folder` : ''}</span></button>
      {!folder.is_system && <div className="folder-menu-wrap"><button className="folder-menu-trigger" aria-label={`Menu ${folder.name}`} aria-expanded={folderMenuId === folder.id} title={`Menu ${folder.name}`} onClick={() => setFolderMenuId((current) => current === folder.id ? null : folder.id)}><Icon name="more" size={18} /></button>{folderMenuId === folder.id && <div className="folder-menu"><button onClick={() => startRenameFolder(folder)}><Icon name="edit" size={15} />Edit folder</button><button className="folder-menu-delete" onClick={() => { setFolderMenuId(null); setError(''); setFolderToDelete(folder) }}><Icon name="trash" size={15} />Hapus folder</button></div>}</div>}
      <button className={`folder-pin${folder.is_pinned ? ' is-pinned' : ''}`} onClick={() => void toggleFolderPinned(folder)} aria-label={folder.is_pinned ? `Lepas sematan ${folder.name}` : `Sematkan ${folder.name}`} title={folder.is_pinned ? 'Lepas sematan folder' : 'Sematkan folder'}><Icon name="star" size={17} filled={Boolean(folder.is_pinned)} /></button>
      <button className="folder-add" onClick={() => openNew(folder.id)} aria-label={`Tambah catatan ke ${folder.name}`} title={`Tambah catatan ke ${folder.name}`}><Icon name="plus" size={16} /></button>
    </div>
  }

  function CompareCard({ note }: { note: Note }) {
    return <article className="compare-card" draggable onContextMenu={(event) => showNoteMoveMenu(note, event)} onDragStart={(event) => { setDragId(note.id); event.dataTransfer.setData('text/plain', note.id) }} onDragEnd={() => setDragId(null)}>
      <button className="compare-main" onClick={() => openNoteModal(note)}><span className="note-meta">{note.platform} · {formatDate(note.created_at)}</span><span className="note-heading">{(note.icon_name || note.icon_asset_id || note.icon_url) && <NoteIcon iconName={note.icon_name} iconAssetId={note.icon_asset_id} iconUrl={note.icon_url} size={28} />}<strong>{note.title}</strong></span><span className="note-folder"><Icon name="folder" size={14} />{note.folder_id ? folderPaths.get(note.folder_id) ?? note.folder_name : note.folder_name}</span></button>
      <div className="compare-card-actions"><button className={`pin-button${note.is_pinned ? ' is-pinned' : ''}`} onClick={() => void toggleNotePinned(note)} aria-label={note.is_pinned ? 'Lepas sematan item' : 'Sematkan item'} title={note.is_pinned ? 'Lepas sematan' : 'Sematkan'}><Icon name="star" size={17} filled={Boolean(note.is_pinned)} /></button><span className="drag-mark" aria-hidden="true">⠿</span></div>
    </article>
  }

  function CompareBoard({ items }: { items: Note[] }) {
    return <div className="compare-grid">{(['active', 'try', 'reference', 'draft'] as const).map((status) => {
      const list = items.filter((note) => status === 'draft' ? note.status === 'draft' : note.status === 'collection' && note.usage === status)
      return <section className={`compare-column${dragOver === status ? ' drag-over' : ''}`} key={status} onDragOver={(event) => { event.preventDefault(); setDragOver(status) }} onDragLeave={() => setDragOver(null)} onDrop={(event) => { setDragOver(null); void dropOn(event, status) }}><header><h2>{status === 'draft' ? 'Draft' : usageLabels[status]}</h2><span>{list.length}</span></header><div className="compare-list">{list.map((note) => <CompareCard key={note.id} note={note} />)}</div></section>
    })}</div>
  }

  const pageTitle = currentFolder?.name ?? 'Koleksi'

  return <div className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => { navigateToFolder(null); setView('folders') }}>DevPocket</button><div className="topbar-actions">{!appInstalled && <button className="button install-button" onClick={() => void installApp()} aria-label="Pasang DevPocket" title="Pasang DevPocket"><Icon name="install" /><span>Pasang</span></button>}<button className="button primary" onClick={() => openNew(openFolder)}><Icon name="plus" />Tambah catatan</button></div></header>
    <main className="workspace">
      <div className="search-row"><div className={`search-box${aiSearchMode ? ' ai-search-box' : ''}`}><Icon name="search" /><input id="global-search" aria-label="Cari catatan" value={query} onChange={(event) => { setQuery(event.target.value); setAiResults(null) }} onKeyDown={(event) => { if (event.key === 'Enter' && aiSearchMode) void runAiSearch() }} placeholder={aiSearchMode ? (aiConfigured ? 'Jelaskan yang kamu ingat...' : 'Gemini belum disiapkan') : 'Cari catatan...'} /><button className={`search-mode${aiSearchMode ? ' active' : ''}`} type="button" aria-pressed={aiSearchMode} onClick={() => { setAiSearchMode(!aiSearchMode); setAiResults(null) }} title="Ganti pencarian kata atau AI">{aiSearchMode ? 'AI' : 'Kata'}</button>{aiSearchMode ? <button className="search-submit" type="button" onClick={() => void runAiSearch()} disabled={!aiConfigured || aiSearching} aria-label="Cari dengan AI" title={aiConfigured ? 'Cari dengan AI' : 'Gemini belum disiapkan'}>{aiSearching ? '…' : <Icon name="sparkles" size={16} />}</button> : <kbd>Ctrl K</kbd>}</div><div className="filter-holder"><button className={`icon-button filter-button${filterOpen ? ' pressed' : ''}`} aria-label="Filter" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}><Icon name="filter" />{(platformFilter || folderFilter || dateFilter) && <i className="filter-dot" />}</button>{filterOpen && <div className="filter-pop"><label htmlFor="platform-filter">Platform</label><select id="platform-filter" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="">Semua platform</option>{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select><label htmlFor="folder-filter">Folder</label><select id="folder-filter" value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}><option value="">Semua folder</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folderPaths.get(folder.id) ?? folder.name}</option>)}</select><label htmlFor="date-filter">Tanggal ditambahkan</label><select id="date-filter" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="">Kapan saja</option><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option></select><button className="link-button" onClick={() => { setPlatformFilter(''); setFolderFilter(''); setDateFilter(''); setFilterOpen(false) }}>Hapus filter</button></div>}</div></div>

      {error && !editor && !folderModal && !editingFolder && !folderToDelete && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Tutup pesan">×</button></div>}

      {openFolder && <nav className="breadcrumbs" aria-label="Lokasi"><button onClick={() => navigateToFolder(null)}>Koleksi</button><span>/</span>{currentPath.map((folder, index) => <span className="breadcrumb-part" key={folder.id}>{index > 0 && <span>/</span>}{index === currentPath.length - 1 ? <span aria-current="page">{folder.name}</span> : <button onClick={() => navigateToFolder(folder.id)}>{folder.name}</button>}</span>)}</nav>}

      <section className="section-head"><h1>{pageTitle}</h1><span className="count-label">{openFolder ? folderItemCounts.get(openFolder) ?? folderNotes.length : filtered.length} item</span></section>

      {!openFolder && <div className="view-tools"><div className="segmented" role="group" aria-label="Tampilan koleksi"><button className={view === 'folders' ? 'selected' : ''} aria-pressed={view === 'folders'} onClick={() => setView('folders')} title="Folder"><Icon name="folder" /></button><button className={view === 'items' ? 'selected' : ''} aria-pressed={view === 'items'} onClick={() => setView('items')} title="Semua item"><Icon name="grid" /></button></div>{view === 'folders' && <button className="button" onClick={() => startCreateFolder('')}><Icon name="plus" />Tambah folder</button>}{view === 'items' && <div className="layout-tools"><button className={layout === 'standard' ? 'selected' : ''} onClick={() => setLayout('standard')} aria-label="Tampilan standar" title="Standar"><Icon name="list" /></button><button className={layout === 'compare' ? 'selected' : ''} onClick={() => setLayout('compare')} aria-label="Tampilan compare" title="Compare"><Icon name="columns" /></button><button className="add-icon" onClick={() => openNew()} aria-label="Tambah catatan" title="Tambah catatan"><Icon name="plus" /></button></div>}</div>}

      {openFolder && <div className="folder-view-tools">{currentFolder && <button className="button" onClick={() => startCreateFolder(currentFolder.id)}><Icon name="plus" />Tambah subfolder</button>}<div className="layout-tools"><button className={layout === 'standard' ? 'selected' : ''} onClick={() => setLayout('standard')} aria-label="Tampilan standar" title="Standar"><Icon name="list" /></button><button className={layout === 'compare' ? 'selected' : ''} onClick={() => setLayout('compare')} aria-label="Tampilan compare" title="Compare"><Icon name="columns" /></button><button className="add-icon" onClick={() => openNew(currentFolder?.id ?? null)} aria-label="Tambah catatan" title="Tambah catatan"><Icon name="plus" /></button></div></div>}

      {loading ? <p className="empty-state">Memuat...</p> : openFolder ? <div className="folder-page">
        {folderChildren.length > 0 && <div className="folder-grid">{folderChildren.map((folder) => <FolderCard key={folder.id} folder={folder} />)}</div>}
        {layout === 'standard' ? <div className="items-grid">{folderNotes.map((note) => <NoteCard key={note.id} note={note} />)}{!folderChildren.length && !folderNotes.length && <p className="empty-state">Folder ini masih kosong</p>}</div> : <>{!folderNotes.length && <p className="empty-state">Belum ada item</p>}<CompareBoard items={folderNotes} /></>}
      </div> : view === 'folders' ? <div className="folder-grid">
        {folderChildren.map((folder) => <FolderCard key={folder.id} folder={folder} />)}
      </div> : layout === 'standard' ? <><div ref={tabsSentinel} className="sticky-sentinel" aria-hidden="true" /><div className={`sticky-tabs${tabsStuck ? ' is-stuck' : ''}`}><nav className="status-tabs" aria-label="Filter status">{tabOptions.map((option) => <button key={option.id} className={tab === option.id ? 'active' : ''} aria-pressed={tab === option.id} onClick={() => setTab(option.id)}>{option.label}</button>)}</nav>{tabsStuck && <button className="button primary sticky-add" onClick={() => openNew()}><Icon name="plus" /><span>Tambah catatan</span></button>}</div><div className="items-grid">{activeItems.map((note) => <NoteCard key={note.id} note={note} showFolder />)}{!activeItems.length && <p className="empty-state">{aiResults ? 'Tidak ada catatan yang mirip' : query ? 'Tidak ada yang cocok' : 'Belum ada catatan'}</p>}</div></> : <CompareBoard items={filtered} />}
    </main>

    {folderModal && <Modal title={folderModalParentId ? 'Tambah subfolder' : 'Tambah folder'} initialFocusSelector="input[name=name]" onClose={() => setFolderModal(false)}><form className="form-body" onSubmit={(event) => void createFolder(event)}><label>Nama folder<input name="name" maxLength={60} required placeholder="Misalnya: Tools" /></label><label>Folder induk<select name="parentFolderId" value={folderModalParentId} onChange={(event) => setFolderModalParentId(event.target.value)}><option value="">Koleksi</option>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folderPaths.get(folder.id) ?? folder.name}</option>)}</select></label><IconPicker iconName={folderIconName} iconAssetId={folderIconAssetId} iconUrl={folderIconUrl} assets={iconAssets} onSelect={selectFolderBuiltinIcon} onSelectUrl={selectFolderIconUrl} onUpload={uploadFolderIcon} onDelete={(asset) => void deleteIcon(asset)} clearLabel="Hapus ikon dari folder" />{error && <p className="modal-error" role="alert">{error}</p>}<footer className="form-actions"><button className="button" type="button" onClick={() => setFolderModal(false)}>Batal</button><button className="button primary" type="submit">Simpan</button></footer></form></Modal>}

    {editingFolder && <Modal title="Edit folder" initialFocusSelector="input[name=name]" onClose={() => { if (!folderActionBusy) setEditingFolder(null) }}><form className="form-body" onSubmit={(event) => void saveFolderName(event)}><label>Nama folder<input name="name" value={folderNameDraft} onChange={(event) => setFolderNameDraft(event.target.value)} maxLength={60} required /></label><IconPicker iconName={folderIconName} iconAssetId={folderIconAssetId} iconUrl={folderIconUrl} assets={iconAssets} onSelect={selectFolderBuiltinIcon} onSelectUrl={selectFolderIconUrl} onUpload={uploadFolderIcon} onDelete={(asset) => void deleteIcon(asset)} clearLabel="Hapus ikon dari folder" />{error && <p className="modal-error" role="alert">{error}</p>}<footer className="form-actions"><button className="button" type="button" disabled={folderActionBusy} onClick={() => setEditingFolder(null)}>Batal</button><button className="button primary" type="submit" disabled={folderActionBusy}>{folderActionBusy ? 'Menyimpan…' : 'Simpan'}</button></footer></form></Modal>}

    {folderToDelete && <Modal title="Hapus folder" onClose={() => { if (!folderActionBusy) setFolderToDelete(null) }}><div className="delete-folder-dialog"><div><strong>Hapus “{folderToDelete.name}”?</strong><p>Pilih apa yang dilakukan dengan item dan subfolder di dalamnya.</p></div>{error && <p className="modal-error" role="alert">{error}</p>}<div className="delete-folder-options"><button className="button" type="button" disabled={folderActionBusy} onClick={() => void deleteFolderContents('draft')}><span><strong>Pindahkan ke Draft</strong><small>Item dan subfolder tetap tersimpan di Draft.</small></span></button><button className="button danger" type="button" disabled={folderActionBusy} onClick={() => void deleteFolderContents('delete')}><span><strong>{folderActionBusy ? 'Menghapus…' : 'Hapus semua'}</strong><small>Folder, subfolder, dan semua item dihapus permanen.</small></span></button></div><footer className="form-actions"><button className="button" type="button" disabled={folderActionBusy} onClick={() => setFolderToDelete(null)}>Batal</button></footer></div></Modal>}

    {(editor?.mode === 'new' || editor?.mode === 'edit') && <Modal title={editor.mode === 'edit' ? 'Edit catatan' : 'Tambah catatan'} initialFocusSelector="input[name=title]" onClose={() => editor.mode === 'edit' ? closeNoteModal() : setEditor(null)} wide><form className="form-body note-form" onSubmit={(event) => void saveNote(event)}>
      <label>Judul<input ref={titleInput} name="title" required maxLength={120} defaultValue={editor.mode === 'edit' ? editor.note.title : ''} placeholder="Judul catatan" /></label>
      <label>Link sumber<input ref={sourceInput} name="sourceUrl" type="url" defaultValue={editor.mode === 'edit' ? editor.note.source_url ?? '' : ''} placeholder="https://..." /></label>
      <IconPicker iconName={iconName} iconAssetId={iconAssetId} iconUrl={iconUrl} assets={iconAssets} onSelect={selectBuiltinIcon} onSelectUrl={selectIconUrl} onUpload={uploadIcon} onDelete={(asset) => void deleteIcon(asset)} />
      <input type="hidden" name="iconName" value={iconName} /><input type="hidden" name="iconAssetId" value={iconAssetId} /><input type="hidden" name="iconUrl" value={iconUrl} />
      <div className="ai-capture-row"><button className={`button ai-button${aiGenerating ? ' loading' : ''}`} type="button" onClick={() => void generateFromLink()} disabled={!aiConfigured || aiGenerating} title={aiConfigured ? 'Buat judul dan catatan dari link' : 'Gemini belum disiapkan'}><Icon name="sparkles" />{aiGenerating ? 'Membaca sumber...' : 'Buat dengan AI'}</button>{!aiConfigured && <span className="ai-setup-note">Gemini belum disiapkan</span>}</div>
      <div className="editor-field"><span className="field-label">Catatan</span><div className="editor-tabs" role="group" aria-label="Mode editor"><button type="button" className={!editorPreview ? 'selected' : ''} aria-pressed={!editorPreview} onClick={() => setEditorPreview(false)}>Tulis</button><button type="button" className={editorPreview ? 'selected' : ''} aria-pressed={editorPreview} onClick={() => setEditorPreview(true)}>Preview</button></div><textarea ref={contentInput} name="content" rows={10} hidden={editorPreview} defaultValue={editor.mode === 'edit' ? editor.note.content : ''} onChange={(event) => setPreviewContent(event.target.value)} placeholder="Tulis dengan Markdown..." /><div className="editor-preview" hidden={!editorPreview}>{previewContent.trim() ? <MarkdownContent content={previewContent} /> : <span>Belum ada isi</span>}</div></div>
      <div className="form-row"><label>Folder<select name="folderId" value={editorFolderId} onChange={(event) => setEditorFolderId(event.target.value)} required>{folders.map((folder) => <option value={folder.id} key={folder.id}>{folderPaths.get(folder.id) ?? folder.name}</option>)}</select></label><label>Penggunaan<select name="usage" defaultValue={editor.mode === 'edit' ? editor.note.usage ?? '' : draftFolderIds.has(editorFolderId) ? '' : 'try'} disabled={draftFolderIds.has(editorFolderId)} required={!draftFolderIds.has(editorFolderId)}><option value="">{draftFolderIds.has(editorFolderId) ? 'Draft' : 'Pilih status'}</option>{Object.entries(usageLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      {error && <p className="modal-error" role="alert">{error}</p>}<footer className="form-actions"><button className="button" type="button" onClick={() => editor.mode === 'edit' ? closeNoteModal() : setEditor(null)}>Batal</button><button className="button primary" type="submit">Simpan</button></footer>
    </form></Modal>}

    {editor?.mode === 'detail' && <Modal title={editor.note.title} icon={(editor.note.icon_name || editor.note.icon_asset_id || editor.note.icon_url) ? <NoteIcon iconName={editor.note.icon_name} iconAssetId={editor.note.icon_asset_id} iconUrl={editor.note.icon_url} size={34} /> : null} onClose={closeNoteModal} wide><article className="detail-body"><div className="detail-meta">{editor.note.platform} · Ditambahkan {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(editor.note.created_at))} · {editor.note.folder_id ? folderPaths.get(editor.note.folder_id) ?? editor.note.folder_name : editor.note.folder_name}{editor.note.usage && <> · {usageLabels[editor.note.usage]}</>}</div>{error && <p className="modal-error" role="alert">{error}</p>}<MarkdownContent content={editor.note.content} />{editor.note.source_url && <a className="source-link" href={editor.note.source_url} target="_blank" rel="noreferrer">Buka sumber <Icon name="external" size={15} /></a>}<footer className="detail-actions"><button className="button danger" onClick={() => void removeNote(editor.note)}><Icon name="trash" />Hapus</button><div className="detail-actions-right"><button className="button" onClick={() => void toggleNotePinned(editor.note)}><Icon name="star" filled={Boolean(editor.note.is_pinned)} />{editor.note.is_pinned ? 'Lepas sematan' : 'Sematkan'}</button><button className="button primary" onClick={() => editNote(editor.note)}><Icon name="edit" />Edit</button></div></footer></article></Modal>}
    {noteMoveMenu && <div className="note-move-menu" style={{ left: noteMoveMenu.x, top: noteMoveMenu.y }} onContextMenu={(event) => event.preventDefault()}><span className="note-move-menu-label">Pindahkan ke folder</span><strong className="note-move-menu-title" title={noteMoveMenu.note.title}>{noteMoveMenu.note.title}</strong><div className="note-move-options">{moveFolderOptions.map((folder) => <button key={folder.id} type="button" disabled={Boolean(movingNoteId) || noteMoveMenu.note.folder_id === folder.id} aria-current={noteMoveMenu.note.folder_id === folder.id ? 'true' : undefined} title={folderPaths.get(folder.id) ?? folder.name} onClick={() => void moveNoteToFolder(noteMoveMenu.note, folder)}>{folderPaths.get(folder.id) ?? folder.name}{noteMoveMenu.note.folder_id === folder.id && <small>Sekarang</small>}</button>)}</div></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

export default App
