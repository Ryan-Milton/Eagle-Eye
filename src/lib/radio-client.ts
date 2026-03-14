export interface RadioFeed {
  id: string
  name: string
  location: string
  listeners: number
  streamUrl: string | null
  lat: number
  lon: number
}

/** Parse Broadcastify feed data from backend */
export function parseRadioFeeds(json: unknown): RadioFeed[] {
  const data = json as { feeds?: Array<{
    id?: string; name?: string; location?: string
    listeners?: number; streamUrl?: string | null
    lat?: number; lon?: number
  }> }

  if (!Array.isArray(data?.feeds)) return []

  return data.feeds
    .filter(f => f.lat != null && f.lon != null && f.name)
    .map(f => ({
      id: f.id ?? `radio-${f.name}`,
      name: f.name ?? '',
      location: f.location ?? '',
      listeners: f.listeners ?? 0,
      streamUrl: f.streamUrl ?? null,
      lat: f.lat ?? 0,
      lon: f.lon ?? 0,
    }))
}
