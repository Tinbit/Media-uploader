
export type MediaKind = 'image' | 'video'

export interface MediaItem {
  id: string
  filename: string
  originalName: string
  displayName?: string
  mime: string
  kind: MediaKind
  size: number
  createdAt: string
  url: string
}

export interface ListMediaResponse {
  items: MediaItem[]
  nextCursor: string | null
}

export async function listMedia(
  kind?: MediaKind,
  cursor?: string,
  limit?: number,
  options?: { signal?: AbortSignal }
): Promise<ListMediaResponse> {
  const query = new URLSearchParams()
  if (kind) query.set('kind', kind)
  if (cursor) query.set('cursor', cursor)
  if (typeof limit === 'number') query.set('limit', String(limit))

  const response = await fetch('/api/media?' + query.toString(), {
    signal: options?.signal,
  })

  if (!response.ok) {
    let message = 'Failed to list media'
    try {
      const payload = await response.json()
      if (payload?.error) message = payload.error
    } catch {}
    throw new Error(message)
  }

  return response.json() as Promise<ListMediaResponse>
}

export async function deleteMedia(id: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch('/api/media/' + encodeURIComponent(id), { method: 'DELETE' })
  if (!response.ok) {
    let message = 'Failed to delete'
    try {
      const payload = await response.json()
      if (payload?.error) message = payload.error
    } catch {}
    throw new Error(message)
  }
  return response.json() as Promise<{ ok: boolean; error?: string }>
}

//Set/clear a display name for a media item. Pass empty string to clear
export async function renameMedia(
  id: string,
  displayName: string
): Promise<{ ok: boolean; item: MediaItem }> {
  const response = await fetch('/api/media/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })
  if (!response.ok) {
    let message = 'Failed to rename'
    try {
      const payload = await response.json()
      if (payload?.error) message = payload.error
    } catch {}
    throw new Error(message)
  }
  return response.json() as Promise<{ ok: boolean; item: MediaItem }>
}
