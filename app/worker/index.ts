import { Hono } from 'hono'
import { AiError, createSuggestion, findSimilarNotes } from './ai.js'

type NoteStatus = 'draft' | 'collection'
type NoteUsage = 'try' | 'active' | 'reference'
type NoteRow = {
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
  created_at: string
  updated_at: string
}
type FolderRow = { id: string; name: string; item_count: number; created_at: string }
type IconAssetRow = {
  id: string
  object_key: string
  name: string
  content_type: string
  byte_size: number
  used_count: number
}
type NoteInput = {
  title?: unknown
  content?: unknown
  sourceUrl?: unknown
  folderId?: unknown
  destination?: unknown
  usage?: unknown
  iconName?: unknown
  iconAssetId?: unknown
}

type AppEnv = Env & { GEMINI_API_KEY?: string; ICONS?: R2Bucket }
const app = new Hono<{ Bindings: AppEnv }>()
const validUsage = new Set<NoteUsage>(['try', 'active', 'reference'])
const validIconNames = new Set([
  'CodeXml', 'SquareTerminal', 'Lightbulb', 'Database', 'Package', 'BookOpen',
  'Wrench', 'Layers3', 'Rocket', 'Cloud', 'Server', 'Workflow', 'ShieldCheck',
  'Braces', 'Cpu',
])
const validImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxIconBytes = 2 * 1024 * 1024

function platformFromUrl(sourceUrl: string | null) {
  if (!sourceUrl) return 'Catatan'
  const host = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase()
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'Instagram'
  if (host === 'threads.net' || host.endsWith('.threads.net')) return 'Threads'
  if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') return 'Facebook'
  if (host === 'github.com' || host.endsWith('.github.com')) return 'GitHub'
  return 'Website'
}

async function readNote(db: D1Database, id: string) {
  return db.prepare(`
    SELECT n.id, n.title, n.content, n.source_url, n.platform, n.folder_id,
           f.name AS folder_name, n.status, n.usage, n.icon_name, n.icon_asset_id,
           n.created_at, n.updated_at
    FROM notes n
    LEFT JOIN folders f ON f.id = n.folder_id
    WHERE n.id = ?
  `).bind(id).first<NoteRow>()
}

app.get('/api/health', async (c) => {
  await c.env.DB.prepare('SELECT 1').first()
  return c.json({ ok: true })
})

app.get('/api/ai/status', (c) => c.json({ configured: Boolean(c.env.GEMINI_API_KEY) }))

app.get('/api/icons', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT a.id, a.name, a.content_type, a.byte_size,
           COUNT(n.id) AS used_count
    FROM icon_assets a
    LEFT JOIN notes n ON n.icon_asset_id = a.id
    GROUP BY a.id
    ORDER BY a.created_at DESC, a.id DESC
  `).all<Omit<IconAssetRow, 'object_key'>>()
  return c.json(results.map((asset) => ({ ...asset, url: `/api/icons/${asset.id}/image` })))
})

app.post('/api/icons', async (c) => {
  if (!c.env.ICONS) return c.json({ error: 'Penyimpanan ikon belum disiapkan.' }, 503)
  const contentLength = Number(c.req.header('content-length') ?? 0)
  if (contentLength > maxIconBytes + 64 * 1024) return c.json({ error: 'Ukuran ikon maksimal 2 MB.' }, 413)

  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return c.json({ error: 'Pilih file gambar dulu.' }, 400)
  if (!validImageTypes.has(file.type)) return c.json({ error: 'Gunakan file PNG, JPEG, atau WebP.' }, 415)
  if (!file.size || file.size > maxIconBytes) return c.json({ error: 'Ukuran ikon maksimal 2 MB.' }, 413)

  const id = crypto.randomUUID()
  const objectKey = `icons/${id}`
  const name = file.name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().slice(0, 100) || 'Ikon upload'
  await c.env.ICONS.put(objectKey, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'private, max-age=3600' },
  })
  try {
    await c.env.DB.prepare(`
      INSERT INTO icon_assets (id, object_key, name, content_type, byte_size)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, objectKey, name, file.type, file.size).run()
  } catch (cause) {
    await c.env.ICONS.delete(objectKey)
    throw cause
  }
  return c.json({ id, name, content_type: file.type, byte_size: file.size, used_count: 0, url: `/api/icons/${id}/image` }, 201)
})

app.get('/api/icons/:id/image', async (c) => {
  const asset = await c.env.DB.prepare('SELECT object_key, content_type FROM icon_assets WHERE id = ?')
    .bind(c.req.param('id')).first<{ object_key: string; content_type: string }>()
  if (!asset) return c.json({ error: 'Ikon tidak ditemukan.' }, 404)
  if (!c.env.ICONS) return c.json({ error: 'Penyimpanan ikon belum disiapkan.' }, 503)
  const object = await c.env.ICONS.get(asset.object_key)
  if (!object) return c.json({ error: 'File ikon tidak ditemukan.' }, 404)
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('content-type', asset.content_type)
  headers.set('cache-control', 'private, max-age=3600')
  headers.set('x-content-type-options', 'nosniff')
  headers.set('etag', object.httpEtag)
  return new Response(object.body, { headers })
})

app.delete('/api/icons/:id', async (c) => {
  const asset = await c.env.DB.prepare(`
    SELECT a.object_key, COUNT(n.id) AS used_count
    FROM icon_assets a LEFT JOIN notes n ON n.icon_asset_id = a.id
    WHERE a.id = ? GROUP BY a.id
  `).bind(c.req.param('id')).first<{ object_key: string; used_count: number }>()
  if (!asset) return c.json({ error: 'Ikon tidak ditemukan.' }, 404)
  if (asset.used_count > 0) return c.json({ error: 'Ikon masih dipakai catatan.' }, 409)
  if (!c.env.ICONS) return c.json({ error: 'Penyimpanan ikon belum disiapkan.' }, 503)
  await c.env.ICONS.delete(asset.object_key)
  await c.env.DB.prepare('DELETE FROM icon_assets WHERE id = ?').bind(c.req.param('id')).run()
  return c.body(null, 204)
})

app.post('/api/ai/capture', async (c) => {
  if (!c.env.GEMINI_API_KEY) return c.json({ error: 'AI belum dikonfigurasi.' }, 503)
  const body = await c.req.json<{ sourceUrl?: unknown }>().catch(() => ({} as { sourceUrl?: unknown }))
  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
  try {
    const parsed = new URL(sourceUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol')
  } catch {
    return c.json({ error: 'Masukkan link sumber yang valid.' }, 400)
  }
  try {
    return c.json(await createSuggestion(c.env.GEMINI_API_KEY, sourceUrl))
  } catch (cause) {
    if (cause instanceof AiError) return c.json({ error: cause.message }, cause.status as 422)
    console.error(cause)
    return c.json({ error: 'Gagal membuat catatan dari link.' }, 502)
  }
})

app.post('/api/ai/search', async (c) => {
  if (!c.env.GEMINI_API_KEY) return c.json({ error: 'AI belum dikonfigurasi.' }, 503)
  const body = await c.req.json<{ query?: unknown }>().catch(() => ({} as { query?: unknown }))
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (query.length < 3 || query.length > 400) return c.json({ error: 'Pencarian harus 3–400 karakter.' }, 400)

  const { results } = await c.env.DB.prepare(`
    SELECT n.id, n.title, n.content, n.platform, f.name AS folder_name
    FROM notes n LEFT JOIN folders f ON f.id = n.folder_id
    ORDER BY n.created_at DESC, n.id DESC LIMIT 501
  `).all<{ id: string; title: string; content: string; platform: string; folder_name: string | null }>()
  if (results.length > 500) return c.json({ error: 'Pencarian AI saat ini mendukung sampai 500 catatan.' }, 413)

  try {
    return c.json({ results: await findSimilarNotes(c.env.GEMINI_API_KEY, query, results) })
  } catch (cause) {
    if (cause instanceof AiError) return c.json({ error: cause.message }, cause.status as 422)
    console.error(cause)
    return c.json({ error: 'Pencarian AI gagal. Coba lagi.' }, 502)
  }
})

app.get('/api/folders', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT f.id, f.name, f.created_at, COUNT(n.id) AS item_count
    FROM folders f
    LEFT JOIN notes n ON n.folder_id = f.id AND n.status = 'collection'
    GROUP BY f.id
    ORDER BY f.position ASC, f.name COLLATE NOCASE ASC
  `).all<FolderRow>()
  return c.json(results)
})

app.post('/api/folders', async (c) => {
  const body = await c.req.json<{ name?: unknown }>().catch(() => ({} as { name?: unknown }))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 60) return c.json({ error: 'Nama folder harus 1–60 karakter.' }, 400)

  const id = crypto.randomUUID()
  try {
    await c.env.DB.prepare('INSERT INTO folders (id, name) VALUES (?, ?)').bind(id, name).run()
  } catch (cause) {
    if (String(cause).toLowerCase().includes('unique')) return c.json({ error: 'Folder dengan nama itu sudah ada.' }, 409)
    throw cause
  }

  const folder = await c.env.DB.prepare(`
    SELECT id, name, created_at, 0 AS item_count FROM folders WHERE id = ?
  `).bind(id).first<FolderRow>()
  return c.json(folder, 201)
})

app.get('/api/notes', async (c) => {
  const conditions: string[] = []
  const values: string[] = []
  const query = c.req.query('q')?.trim()
  const folderId = c.req.query('folderId')
  const status = c.req.query('status')
  const usage = c.req.query('usage')

  if (query) {
    conditions.push('(n.title LIKE ? OR n.content LIKE ? OR n.source_url LIKE ? OR n.platform LIKE ? OR f.name LIKE ?)')
    const match = `%${query}%`
    values.push(match, match, match, match, match)
  }
  if (folderId) {
    conditions.push('n.folder_id = ?')
    values.push(folderId)
  }
  if (status === 'draft' || status === 'collection') {
    conditions.push('n.status = ?')
    values.push(status)
  }
  if (usage && validUsage.has(usage as NoteUsage)) {
    conditions.push('n.usage = ?')
    values.push(usage)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { results } = await c.env.DB.prepare(`
    SELECT n.id, n.title, n.content, n.source_url, n.platform, n.folder_id,
           f.name AS folder_name, n.status, n.usage, n.icon_name, n.icon_asset_id,
           n.created_at, n.updated_at
    FROM notes n
    LEFT JOIN folders f ON f.id = n.folder_id
    ${where}
    ORDER BY n.created_at DESC, n.id DESC
  `).bind(...values).all<NoteRow>()
  return c.json(results)
})

app.get('/api/notes/:id', async (c) => {
  const note = await readNote(c.env.DB, c.req.param('id'))
  if (!note) return c.json({ error: 'Catatan tidak ditemukan.' }, 404)
  return c.json(note)
})

app.post('/api/notes', async (c) => {
  const body = await c.req.json<NoteInput>().catch(() => ({} as NoteInput))
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content : ''
  const sourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null
  const destination: NoteStatus = body.destination === 'collection' ? 'collection' : 'draft'
  const folderId = typeof body.folderId === 'string' ? body.folderId : null
  const usage = typeof body.usage === 'string' && validUsage.has(body.usage as NoteUsage) ? body.usage as NoteUsage : null
  const iconName = typeof body.iconName === 'string' && body.iconName ? body.iconName : null
  const iconAssetId = typeof body.iconAssetId === 'string' && body.iconAssetId ? body.iconAssetId : null

  if (!title || title.length > 120) return c.json({ error: 'Judul harus 1–120 karakter.' }, 400)
  if (content.length > 100_000) return c.json({ error: 'Catatan terlalu panjang.' }, 400)
  if (iconName && !validIconNames.has(iconName)) return c.json({ error: 'Ikon bawaan tidak dikenal.' }, 400)
  if (iconName && iconAssetId) return c.json({ error: 'Pilih ikon bawaan atau ikon upload.' }, 400)
  if (iconAssetId && !await c.env.DB.prepare('SELECT id FROM icon_assets WHERE id = ?').bind(iconAssetId).first()) {
    return c.json({ error: 'Ikon upload tidak ditemukan.' }, 400)
  }
  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol')
    } catch {
      return c.json({ error: 'Link harus menggunakan http:// atau https://.' }, 400)
    }
  }
  if (destination === 'collection' && (!folderId || !usage)) {
    return c.json({ error: 'Pilih folder dan status penggunaan untuk Koleksi.' }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await c.env.DB.prepare(`
    INSERT INTO notes (id, title, content, source_url, platform, folder_id, status, usage, icon_name, icon_asset_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, title, content, sourceUrl, platformFromUrl(sourceUrl),
    destination === 'collection' ? folderId : null,
    destination,
    destination === 'collection' ? usage : null,
    iconName,
    iconAssetId,
    now, now,
  ).run()

  return c.json(await readNote(c.env.DB, id), 201)
})

app.patch('/api/notes/:id', async (c) => {
  const current = await readNote(c.env.DB, c.req.param('id'))
  if (!current) return c.json({ error: 'Catatan tidak ditemukan.' }, 404)
  const body = await c.req.json<NoteInput>().catch(() => ({} as NoteInput))
  const title = typeof body.title === 'string' ? body.title.trim() : current.title
  const content = typeof body.content === 'string' ? body.content : current.content
  const sourceUrl = typeof body.sourceUrl === 'string' ? (body.sourceUrl.trim() || null) : current.source_url
  const destination = body.destination === 'draft' || body.destination === 'collection' ? body.destination : current.status
  const folderId = typeof body.folderId === 'string' ? body.folderId : current.folder_id
  const usage = typeof body.usage === 'string' && validUsage.has(body.usage as NoteUsage)
    ? body.usage as NoteUsage
    : current.usage
  const iconNameProvided = typeof body.iconName === 'string'
  const iconAssetProvided = typeof body.iconAssetId === 'string'
  const iconName = iconNameProvided ? (body.iconName as string || null) : current.icon_name
  const iconAssetId = iconAssetProvided ? (body.iconAssetId as string || null) : current.icon_asset_id

  if (!title || title.length > 120) return c.json({ error: 'Judul harus 1–120 karakter.' }, 400)
  if (content.length > 100_000) return c.json({ error: 'Catatan terlalu panjang.' }, 400)
  if (iconName && !validIconNames.has(iconName)) return c.json({ error: 'Ikon bawaan tidak dikenal.' }, 400)
  if (iconName && iconAssetId) return c.json({ error: 'Pilih ikon bawaan atau ikon upload.' }, 400)
  if (iconAssetId && !await c.env.DB.prepare('SELECT id FROM icon_assets WHERE id = ?').bind(iconAssetId).first()) {
    return c.json({ error: 'Ikon upload tidak ditemukan.' }, 400)
  }
  if (sourceUrl) {
    try {
      const parsed = new URL(sourceUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('protocol')
    } catch {
      return c.json({ error: 'Link harus menggunakan http:// atau https://.' }, 400)
    }
  }
  if (destination === 'collection' && (!folderId || !usage)) {
    return c.json({ error: 'Pilih folder dan status penggunaan untuk Koleksi.' }, 400)
  }

  await c.env.DB.prepare(`
    UPDATE notes
    SET title = ?, content = ?, source_url = ?, platform = ?, folder_id = ?, status = ?, usage = ?, icon_name = ?, icon_asset_id = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    title, content, sourceUrl, platformFromUrl(sourceUrl),
    destination === 'collection' ? folderId : null,
    destination,
    destination === 'collection' ? usage : null,
    iconName,
    iconAssetId,
    new Date().toISOString(), current.id,
  ).run()

  return c.json(await readNote(c.env.DB, current.id))
})

app.delete('/api/notes/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(c.req.param('id')).run()
  if (!result.meta.changes) return c.json({ error: 'Catatan tidak ditemukan.' }, 404)
  return c.body(null, 204)
})

app.onError((cause, c) => {
  console.error(cause)
  return c.json({ error: 'Terjadi kendala saat menyimpan data.' }, 500)
})

export default app
