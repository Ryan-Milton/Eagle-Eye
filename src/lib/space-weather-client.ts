export interface KpIndexEntry {
  time: string
  kp: number
  observed: boolean
}

export interface SpaceWeatherAlert {
  id: string
  issueTime: string
  message: string
  serial: string
}

export interface SpaceWeatherData {
  kpIndex: KpIndexEntry[]
  currentKp: number
  alerts: SpaceWeatherAlert[]
  lastFetch: number
}

/** Parse NOAA SWPC Kp index JSON */
export function parseKpIndex(json: unknown): KpIndexEntry[] {
  // Format: array of arrays, first row is headers: ["time_tag", "Kp", "observed_or_estimated"]
  const data = json as Array<string[]>
  if (!Array.isArray(data) || data.length < 2) return []

  const entries: KpIndexEntry[] = []
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length < 3) continue
    const kp = parseFloat(row[1])
    if (isNaN(kp)) continue
    entries.push({
      time: row[0],
      kp,
      observed: row[2] === 'observed',
    })
  }
  return entries
}

/** Parse NOAA SWPC alerts JSON */
export function parseSpaceWeatherAlerts(json: unknown): SpaceWeatherAlert[] {
  const data = json as Array<{
    product_id?: string
    issue_datetime?: string
    message?: string
  }>
  if (!Array.isArray(data)) return []

  return data.slice(0, 10).map((a, i) => ({
    id: a.product_id ?? `swpc-${i}`,
    issueTime: a.issue_datetime ?? '',
    message: (a.message ?? '').slice(0, 500),
    serial: a.product_id ?? '',
  }))
}
