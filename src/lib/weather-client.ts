import type { WeatherEvent, WeatherEventType } from '@/types'

// ─── NASA FIRMS ──────────────────────────────────────────────────────────

/** Parse NASA FIRMS CSV fire hotspots into WeatherEvent[] */
export function parseFIRMSHotspots(csv: string): WeatherEvent[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const latIdx = header.indexOf('latitude')
  const lonIdx = header.indexOf('longitude')
  const brightIdx = header.indexOf('brightness')
  const confIdx = header.indexOf('confidence')
  const dateIdx = header.indexOf('acq_date')
  const timeIdx = header.indexOf('acq_time')

  if (latIdx < 0 || lonIdx < 0) return []

  const events: WeatherEvent[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const lat = parseFloat(cols[latIdx])
    const lon = parseFloat(cols[lonIdx])
    if (isNaN(lat) || isNaN(lon)) continue

    const confidence = parseInt(cols[confIdx] ?? '0') || 0
    if (confidence < 80) continue // filter low-confidence detections

    const brightness = parseFloat(cols[brightIdx] ?? '0') || 0
    const dateStr = cols[dateIdx] ?? ''
    const timeStr = cols[timeIdx] ?? ''
    const time = dateStr ? new Date(`${dateStr}T${timeStr.padStart(4, '0').slice(0, 2)}:${timeStr.padStart(4, '0').slice(2)}Z`).getTime() : Date.now()

    events.push({
      id: `firms-${lat.toFixed(3)}-${lon.toFixed(3)}-${i}`,
      type: 'wildfire',
      title: `Fire Hotspot (${brightness.toFixed(0)}K)`,
      description: `Confidence: ${confidence}% | Brightness: ${brightness.toFixed(1)}K`,
      lat,
      lon,
      magnitude: brightness,
      geometry: null,
      source: 'firms',
      time: isNaN(time) ? Date.now() : time,
      expires: null,
      lastUpdate: Date.now(),
    })
  }
  return events
}

// ─── GDACS ───────────────────────────────────────────────────────────────

const GDACS_TYPE_MAP: Record<string, WeatherEventType> = {
  eq: 'earthquake', earthquake: 'earthquake',
  tc: 'storm', cyclone: 'storm', storm: 'storm',
  fl: 'flood', flood: 'flood',
  vo: 'volcano', volcano: 'volcano',
  dr: 'drought', drought: 'drought',
  wf: 'wildfire', wildfire: 'wildfire',
}

/** Parse GDACS RSS XML into WeatherEvent[] */
export function parseGDACSAlerts(xml: string): WeatherEvent[] {
  const events: WeatherEvent[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1]

    const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? ''
    const desc = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1] ?? ''
    const link = item.match(/<link>(.*?)<\/link>/)?.[1] ?? ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]
    const lat = parseFloat(item.match(/<geo:lat>([\d.-]+)<\/geo:lat>/)?.[1] ?? '') ||
                parseFloat(item.match(/<gdacs:lat>([\d.-]+)/)?.[1] ?? '')
    const lon = parseFloat(item.match(/<geo:long>([\d.-]+)<\/geo:long>/)?.[1] ?? '') ||
                parseFloat(item.match(/<gdacs:lon>([\d.-]+)/)?.[1] ?? '')

    if (isNaN(lat) || isNaN(lon)) continue

    // Determine event type from title/description
    const lowerTitle = title.toLowerCase()
    let type: WeatherEventType = 'alert'
    for (const [key, value] of Object.entries(GDACS_TYPE_MAP)) {
      if (lowerTitle.includes(key)) { type = value; break }
    }

    const time = pubDate ? new Date(pubDate).getTime() : Date.now()

    events.push({
      id: `gdacs-${link || `${lat}-${lon}-${time}`}`,
      type,
      title: title || 'GDACS Alert',
      description: desc.replace(/<[^>]+>/g, '').slice(0, 500),
      lat,
      lon,
      magnitude: null,
      geometry: null,
      source: 'gdacs',
      time: isNaN(time) ? Date.now() : time,
      expires: null,
      lastUpdate: Date.now(),
    })
  }
  return events
}

/** Parse USGS GeoJSON earthquake feed into WeatherEvent[] */
export function parseUSGSEarthquakes(geojson: unknown): WeatherEvent[] {
  const data = geojson as { features?: unknown[] }
  if (!data?.features || !Array.isArray(data.features)) return []

  const events: WeatherEvent[] = []
  for (const f of data.features) {
    const feature = f as {
      id?: string
      properties?: {
        title?: string
        mag?: number | null
        place?: string
        time?: number
        updated?: number
        alert?: string
      }
      geometry?: { type: string; coordinates?: number[] }
    }

    const props = feature.properties
    if (!props) continue

    const coords = feature.geometry?.coordinates
    if (!coords || coords.length < 2) continue

    const lon = coords[0]
    const lat = coords[1]
    if (typeof lat !== 'number' || typeof lon !== 'number') continue
    if (isNaN(lat) || isNaN(lon)) continue

    events.push({
      id: `usgs-${feature.id ?? `${lat}-${lon}-${props.time ?? 0}`}`,
      type: 'earthquake',
      title: props.title ?? `M${props.mag ?? '?'} Earthquake`,
      description: props.place ?? '',
      lat,
      lon,
      magnitude: typeof props.mag === 'number' ? props.mag : null,
      geometry: null,
      source: 'usgs',
      time: props.time ?? Date.now(),
      expires: null,
      lastUpdate: props.updated ?? Date.now(),
    })
  }
  return events
}

const EONET_CATEGORY_MAP: Record<string, WeatherEventType> = {
  wildfires: 'wildfire',
  volcanoes: 'volcano',
  severeStorms: 'storm',
  floods: 'flood',
  seaLakeIce: 'iceberg',
  drought: 'drought',
  earthquakes: 'earthquake',
}

/** Parse NASA EONET v3 response into WeatherEvent[] */
export function parseEONETEvents(json: unknown): WeatherEvent[] {
  const data = json as { events?: unknown[] }
  if (!data?.events || !Array.isArray(data.events)) return []

  const events: WeatherEvent[] = []
  for (const e of data.events) {
    const event = e as {
      id?: string
      title?: string
      description?: string | null
      categories?: Array<{ id?: string; title?: string }>
      geometry?: Array<{ date?: string; type?: string; coordinates?: number[] | number[][] }>
    }

    if (!event.id || !event.title) continue

    const categoryId = event.categories?.[0]?.id ?? ''
    const type: WeatherEventType = EONET_CATEGORY_MAP[categoryId] ?? 'storm'

    // Use the most recent geometry entry
    const geo = event.geometry?.[event.geometry.length - 1]
    if (!geo?.coordinates) continue

    let lat: number
    let lon: number
    if (geo.type === 'Point' && Array.isArray(geo.coordinates) && typeof geo.coordinates[0] === 'number') {
      lon = geo.coordinates[0] as number
      lat = geo.coordinates[1] as number
    } else {
      continue
    }

    if (isNaN(lat) || isNaN(lon)) continue

    const time = geo.date ? new Date(geo.date).getTime() : Date.now()

    events.push({
      id: `eonet-${event.id}`,
      type,
      title: event.title,
      description: event.description ?? '',
      lat,
      lon,
      magnitude: null,
      geometry: null,
      source: 'eonet',
      time,
      expires: null,
      lastUpdate: time,
    })
  }
  return events
}

function classifyNWSEvent(event: string | undefined): WeatherEventType {
  if (!event) return 'alert'
  const e = event.toLowerCase()
  if (e.includes('flood')) return 'flood'
  if (e.includes('fire') || e.includes('red flag')) return 'wildfire'
  if (e.includes('volcano') || e.includes('ash')) return 'volcano'
  if (e.includes('ice') || e.includes('blizzard') || e.includes('winter') || e.includes('freeze') || e.includes('frost') || e.includes('cold') || e.includes('snow') || e.includes('sleet')) return 'iceberg'
  if (e.includes('drought') || e.includes('heat') || e.includes('excessive')) return 'drought'
  if (e.includes('earthquake') || e.includes('tsunami')) return 'earthquake'
  if (e.includes('tornado') || e.includes('thunderstorm') || e.includes('hurricane') || e.includes('tropical') || e.includes('wind') || e.includes('storm')) return 'storm'
  return 'alert'
}

/** Parse NWS alerts response into WeatherEvent[] */
export function parseNWSAlerts(json: unknown): WeatherEvent[] {
  const data = json as { features?: unknown[] }
  if (!data?.features || !Array.isArray(data.features)) return []

  const events: WeatherEvent[] = []
  for (const f of data.features) {
    const feature = f as {
      id?: string
      properties?: {
        id?: string
        headline?: string
        description?: string
        instruction?: string
        severity?: string
        event?: string
        onset?: string
        expires?: string
        sent?: string
      }
      geometry?: GeoJSON.Geometry | null
    }

    const props = feature.properties
    if (!props) continue

    // Skip expired alerts
    if (props.expires) {
      const expiresAt = new Date(props.expires).getTime()
      if (!isNaN(expiresAt) && expiresAt < Date.now()) continue
    }

    // Derive centroid from geometry if polygon, otherwise skip
    let lat = 0
    let lon = 0
    let geometry: GeoJSON.Geometry | null = null

    if (feature.geometry && feature.geometry.type === 'Polygon') {
      geometry = feature.geometry
      const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0]
      if (coords && coords.length > 0) {
        let sumLat = 0, sumLon = 0
        for (const c of coords) {
          sumLon += c[0]
          sumLat += c[1]
        }
        lon = sumLon / coords.length
        lat = sumLat / coords.length
      }
    } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
      geometry = feature.geometry
      const allCoords = (feature.geometry as GeoJSON.MultiPolygon).coordinates
      let sumLat = 0, sumLon = 0, count = 0
      for (const poly of allCoords) {
        for (const c of poly[0]) {
          sumLon += c[0]
          sumLat += c[1]
          count++
        }
      }
      if (count > 0) {
        lon = sumLon / count
        lat = sumLat / count
      }
    } else {
      continue
    }

    if (lat === 0 && lon === 0) continue

    const time = props.onset ? new Date(props.onset).getTime()
      : props.sent ? new Date(props.sent).getTime()
      : Date.now()

    events.push({
      id: `nws-${props.id ?? feature.id ?? `${lat}-${lon}`}`,
      type: classifyNWSEvent(props.event),
      title: props.headline ?? props.event ?? 'Weather Alert',
      description: props.description ?? '',
      lat,
      lon,
      magnitude: null,
      geometry,
      source: 'nws',
      time,
      expires: props.expires ? new Date(props.expires).getTime() : null,
      lastUpdate: Date.now(),
    })
  }
  return events
}
