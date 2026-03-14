export interface CarrierGroup {
  id: string
  name: string
  hull: string
  region: string
  lat: number
  lon: number
  lastUpdate: number
}

/** Parse fleet tracker data from the backend */
export function parseFleetData(json: unknown): CarrierGroup[] {
  const data = json as { carriers?: Array<{
    name?: string; hull?: string; region?: string
    lat?: number; lon?: number; lastUpdate?: number
  }> }

  if (!Array.isArray(data?.carriers)) return []

  return data.carriers
    .filter(c => c.name && c.lat != null && c.lon != null)
    .map(c => ({
      id: `fleet-${c.hull ?? c.name}`,
      name: c.name ?? '',
      hull: c.hull ?? '',
      region: c.region ?? 'Unknown',
      lat: c.lat ?? 0,
      lon: c.lon ?? 0,
      lastUpdate: c.lastUpdate ?? Date.now(),
    }))
}
