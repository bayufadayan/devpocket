import type { Folder, IconAsset, Note, NoteInput } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || 'Permintaan gagal. Coba lagi.')
  return data
}

export const api = {
  getFolders: () => request<Folder[]>('/api/folders'),
  getNotes: () => request<Note[]>('/api/notes'),
  getIcons: () => request<IconAsset[]>('/api/icons'),
  getAiStatus: () => request<{ configured: boolean }>('/api/ai/status'),
  createFolder: (name: string, parentFolderId: string | null, iconName: string, iconAssetId: string, iconUrl: string) => request<Folder>('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentFolderId, iconName, iconAssetId, iconUrl }),
  }),
  updateFolder: (id: string, name: string, iconName: string, iconAssetId: string, iconUrl: string) => request<Folder>(`/api/folders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, iconName, iconAssetId, iconUrl }),
  }),
  deleteFolder: (id: string, contents: 'draft' | 'delete') => request<void>(`/api/folders/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ contents }),
  }),
  pinFolder: (id: string, pinned: boolean) => request<Folder>(`/api/folders/${id}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
  }),
  createNote: (input: NoteInput) => request<Note>('/api/notes', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  updateNote: (id: string, input: NoteInput | Partial<NoteInput>) => request<Note>(`/api/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
  pinNote: (id: string, pinned: boolean) => request<Note>(`/api/notes/${id}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pinned }),
  }),
  deleteNote: (id: string) => request<void>(`/api/notes/${id}`, { method: 'DELETE' }),
  uploadIcon: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<IconAsset>('/api/icons', { method: 'POST', body })
  },
  deleteIcon: (id: string) => request<void>(`/api/icons/${id}`, { method: 'DELETE' }),
  createAiSuggestion: (sourceUrl: string) => request<{ title: string; content: string }>('/api/ai/capture', {
    method: 'POST',
    body: JSON.stringify({ sourceUrl }),
  }),
  aiSearch: (query: string) => request<{ results: { id: string; score: number }[] }>('/api/ai/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  }),
}
