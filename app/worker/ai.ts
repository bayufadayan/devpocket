const GEMINI_INTERACTIONS = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const GEMINI_EMBEDDINGS = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents'
const GEMINI_MODEL = 'gemini-3.6-flash'
const EMBEDDING_MODEL = 'models/gemini-embedding-001'

type InteractionStep = { type?: string; content?: { type?: string; text?: string }[] }
type InteractionResponse = { steps?: InteractionStep[]; error?: { message?: string } }

export class AiError extends Error {
  public status: number
  constructor(message: string, status = 502) { super(message); this.status = status }
}

function readOutput(data: InteractionResponse) {
  return (data.steps ?? []).filter((step) => step.type === 'model_output')
    .flatMap((step) => step.content ?? [])
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n')
}

async function interaction(apiKey: string, input: string, options: { urlContext?: boolean; schema: Record<string, unknown> }) {
  const response = await fetch(GEMINI_INTERACTIONS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input,
      store: false,
      ...(options.urlContext ? { tools: [{ type: 'url_context' }] } : {}),
      response_format: { type: 'text', mime_type: 'application/json', schema: options.schema },
    }),
  })
  const data = await response.json().catch(() => ({})) as InteractionResponse
  if (!response.ok) {
    if (response.status === 429) throw new AiError('Batas penggunaan AI tercapai. Coba lagi nanti.', 429)
    throw new AiError(data.error?.message || 'AI belum bisa memproses permintaan ini.')
  }
  return readOutput(data)
}

export async function createSuggestion(apiKey: string, sourceUrl: string) {
  const text = await interaction(apiKey,
    `Baca sumber coding di URL ini: ${sourceUrl}\n\nBuat catatan singkat dalam bahasa Indonesia. Ambil fakta dan contoh yang benar-benar ada di sumber. Jika URL tidak dapat dibaca, jangan menebak: isi sourceRead=false dan title serta content dengan string kosong. content berupa Markdown yang siap diedit.`,
    {
      urlContext: true,
      schema: {
        type: 'object',
        properties: {
          sourceRead: { type: 'boolean', description: 'Apakah isi halaman berhasil dibaca.' },
          title: { type: 'string', description: 'Judul catatan singkat.' },
          content: { type: 'string', description: 'Isi catatan dalam Markdown bahasa Indonesia.' },
        },
        required: ['sourceRead', 'title', 'content'],
      },
    },
  )
  let suggestion: { sourceRead?: boolean; title?: string; content?: string }
  try { suggestion = JSON.parse(text) as typeof suggestion }
  catch { throw new AiError('Jawaban AI tidak terbaca. Coba lagi.') }
  if (!suggestion.sourceRead || !suggestion.title?.trim() || !suggestion.content?.trim()) {
    throw new AiError('Sumber belum bisa dibaca. Tambahkan catatan sendiri atau coba link lain.', 422)
  }
  return { title: suggestion.title.trim().slice(0, 120), content: suggestion.content.trim() }
}

type SearchNote = { id: string; title: string; content: string; platform: string; folder_name: string | null }
type EmbeddingResponse = { embeddings?: { values?: number[] }[]; error?: { message?: string } }

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || !a.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i] }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0
}

export async function findSimilarNotes(apiKey: string, query: string, notes: SearchNote[]) {
  if (!notes.length) return []
  const texts = [query, ...notes.map((note) => `${note.title}\n${note.platform}\n${note.folder_name ?? ''}\n${note.content.slice(0, 2400)}`)]
  const embeddings: number[][] = []
  for (let start = 0; start < texts.length; start += 80) {
    const chunk = texts.slice(start, start + 80)
    const response = await fetch(GEMINI_EMBEDDINGS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        requests: chunk.map((text, index) => ({
          model: EMBEDDING_MODEL,
          content: { parts: [{ text }] },
          embedContentConfig: { taskType: start + index === 0 ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT', outputDimensionality: 768 },
        })),
      }),
    })
    const data = await response.json().catch(() => ({})) as EmbeddingResponse
    if (!response.ok) {
      if (response.status === 429) throw new AiError('Batas penggunaan AI tercapai. Coba lagi nanti.', 429)
      throw new AiError(data.error?.message || 'Pencarian AI belum bisa digunakan.')
    }
    embeddings.push(...(data.embeddings ?? []).map((embedding) => embedding.values ?? []))
  }
  const queryEmbedding = embeddings[0]
  return notes.map((note, index) => ({ id: note.id, score: cosineSimilarity(queryEmbedding, embeddings[index + 1]) }))
    .filter((result) => result.score > 0.18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}
