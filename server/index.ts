/**
 * Unified Eagle Eye backend server.
 * Consolidates AIS proxy, flight proxy, and HexDB proxy into a single service.
 *
 * WebSocket endpoints:
 *   /ws/ais     — AIS position reports from AISStream.io
 *   /ws/flights — Aircraft positions from OpenSky / ADS-B Exchange
 *
 * HTTP endpoints:
 *   /api/hexdb/lookup?hex=ICAO24&callsign=CALLSIGN — Aircraft metadata
 *   /api/hexdb/image?hex=ICAO24                     — Aircraft photo proxy
 */

const PORT = Number(process.env.EAGLE_EYE_PORT ?? 4000)

// ─── AIS PROXY ──────────────────────────────────────────────────────────────

const AIS_API_KEY = process.env.AIS_API_KEY ?? ''
const aisClients = new Set<import('bun').ServerWebSocket<{ path: string }>>()
let aisUpstream: WebSocket | null = null

function connectAisUpstream() {
  if (!AIS_API_KEY) {
    console.warn('[AIS] Missing AIS_API_KEY — AIS proxy disabled')
    return
  }

  aisUpstream = new WebSocket('wss://stream.aisstream.io/v0/stream')

  aisUpstream.onopen = () => {
    console.log('[AIS] Connected to AISStream.io')
    aisUpstream!.send(JSON.stringify({
      APIKey: AIS_API_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FilterMessageTypes: ['PositionReport'],
    }))
  }

  let relayCount = 0
  aisUpstream.onmessage = (event) => {
    const data = typeof event.data === 'string'
      ? event.data
      : Buffer.isBuffer(event.data)
        ? event.data.toString()
        : String(event.data)

    for (const client of aisClients) {
      try { client.send(data) } catch { /* skip */ }
    }

    relayCount++
    if (relayCount % 100 === 0) {
      console.log(`[AIS] Relayed ${relayCount} messages`)
    }
  }

  aisUpstream.onclose = () => {
    console.log('[AIS] Upstream closed, reconnecting in 5s...')
    setTimeout(connectAisUpstream, 5000)
  }

  aisUpstream.onerror = (err) => {
    console.error('[AIS] Upstream error:', err)
  }
}

connectAisUpstream()

// ─── FLIGHT PROXY ───────────────────────────────────────────────────────────

const FLIGHT_SOURCE = process.env.FLIGHT_SOURCE ?? 'opensky'
const BASE_POLL_INTERVAL = 30_000
const MAX_POLL_INTERVAL = 300_000

const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'
const OPENSKY_CLIENT_ID = process.env.OPENSKY_CLIENT_ID ?? ''
const OPENSKY_CLIENT_SECRET = process.env.OPENSKY_CLIENT_SECRET ?? ''

const flightClients = new Set<import('bun').ServerWebSocket<{ path: string }>>()

let accessToken: string | null = null
let tokenExpiresAt = 0

async function getOpenSkyToken(): Promise<string | null> {
  if (!OPENSKY_CLIENT_ID || !OPENSKY_CLIENT_SECRET) return null
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) return accessToken

  const res = await fetch(OPENSKY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: OPENSKY_CLIENT_ID,
      client_secret: OPENSKY_CLIENT_SECRET,
    }),
  })

  if (!res.ok) {
    console.error(`[Flight] OAuth2 token request failed: ${res.status}`)
    accessToken = null
    return null
  }

  const json = await res.json()
  accessToken = json.access_token
  tokenExpiresAt = Date.now() + (json.expires_in ?? 1800) * 1000
  console.log(`[Flight] OAuth2 token acquired, expires in ${json.expires_in ?? 1800}s`)
  return accessToken
}

interface FlightData {
  icao24: string
  callsign: string
  type: string
  originCountry: string
  lat: number
  lon: number
  altitude: number
  speed: number
  heading: number
  verticalRate: number
  onGround: boolean
  lastUpdate: number
}

import { classifyFlight } from '../src/lib/classify-flight'

async function fetchOpenSky(): Promise<FlightData[] | null> {
  const token = await getOpenSkyToken()
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch('https://opensky-network.org/api/states/all', { headers })

  if (res.status === 401 && token) {
    console.warn('[Flight] OpenSky 401 — refreshing token')
    accessToken = null
    tokenExpiresAt = 0
    return fetchOpenSky()
  }
  if (res.status === 429) {
    console.warn('[Flight] OpenSky 429 — backing off')
    return null
  }
  if (!res.ok) {
    console.error(`[Flight] OpenSky HTTP ${res.status}`)
    return null
  }

  const json = await res.json() as { time: number; states: unknown[][] | null }
  if (!json.states) return []

  const flights: FlightData[] = []
  for (const s of json.states) {
    const icao24 = s[0] as string
    const callsign = ((s[1] as string) ?? '').trim()
    const originCountry = (s[2] as string) ?? ''
    const lon = s[5] as number | null
    const lat = s[6] as number | null
    const altitude = s[7] as number | null
    const onGround = s[8] as boolean
    const speed = s[9] as number | null
    const heading = s[10] as number | null
    const verticalRate = s[11] as number | null

    if (lat == null || lon == null) continue

    flights.push({
      icao24,
      callsign: callsign || icao24.toUpperCase(),
      type: classifyFlight(callsign),
      originCountry,
      lat, lon,
      altitude: altitude ?? 0,
      speed: speed ?? 0,
      heading: heading ?? 0,
      verticalRate: verticalRate ?? 0,
      onGround,
      lastUpdate: Date.now(),
    })
  }
  return flights
}

async function fetchAdsbExchange(): Promise<FlightData[] | null> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    console.error('[Flight] Missing RAPIDAPI_KEY for ADS-B Exchange')
    return []
  }

  const res = await fetch(
    'https://adsbexchange-com1.p.rapidapi.com/v2/lat/40.0/lon/-74.0/dist/250/',
    { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com' } },
  )
  if (res.status === 429) {
    console.warn('[Flight] ADS-B Exchange 429 — backing off')
    return null
  }
  if (!res.ok) {
    console.error(`[Flight] ADS-B Exchange HTTP ${res.status}`)
    return null
  }

  const json = await res.json() as { ac?: Array<Record<string, unknown>> }
  if (!json.ac) return []

  const flights: FlightData[] = []
  for (const ac of json.ac) {
    const icao24 = (ac.hex as string ?? '').toLowerCase()
    const callsign = ((ac.flight as string) ?? '').trim()
    const lat = ac.lat as number | null
    const lon = ac.lon as number | null
    if (lat == null || lon == null) continue

    flights.push({
      icao24,
      callsign: callsign || icao24.toUpperCase(),
      type: classifyFlight(callsign),
      originCountry: '',
      lat, lon,
      altitude: ((ac.alt_baro as number) ?? 0) * 0.3048,
      speed: ((ac.gs as number) ?? 0) * 0.514444,
      heading: (ac.track as number) ?? 0,
      verticalRate: ((ac.baro_rate as number) ?? 0) * 0.00508,
      onGround: (ac.alt_baro as string) === 'ground',
      lastUpdate: Date.now(),
    })
  }
  return flights
}

let pollCount = 0
let currentInterval = BASE_POLL_INTERVAL
let consecutiveFailures = 0
let lastGoodPayload: string | null = null

async function poll() {
  if (flightClients.size === 0) {
    setTimeout(poll, currentInterval)
    return
  }

  try {
    const flights = FLIGHT_SOURCE === 'adsb'
      ? await fetchAdsbExchange()
      : await fetchOpenSky()

    if (flights === null) {
      consecutiveFailures++
      currentInterval = Math.min(MAX_POLL_INTERVAL, BASE_POLL_INTERVAL * Math.pow(2, consecutiveFailures))
      console.warn(`[Flight] Backoff: next poll in ${(currentInterval / 1000).toFixed(0)}s (failure #${consecutiveFailures})`)
      if (lastGoodPayload && flightClients.size > 0) {
        for (const client of flightClients) {
          try { client.send(lastGoodPayload) } catch { /* skip */ }
        }
      }
    } else {
      consecutiveFailures = 0
      currentInterval = BASE_POLL_INTERVAL
      const payload = JSON.stringify({ type: 'flights', flights, timestamp: Date.now() })
      lastGoodPayload = payload
      for (const client of flightClients) {
        try { client.send(payload) } catch { /* skip */ }
      }
      pollCount++
      if (pollCount % 6 === 0) {
        console.log(`[Flight] Poll #${pollCount}: ${flights.length} aircraft, ${flightClients.size} clients`)
      }
    }
  } catch (err) {
    console.error('[Flight] Poll error:', err)
    consecutiveFailures++
    currentInterval = Math.min(MAX_POLL_INTERVAL, BASE_POLL_INTERVAL * Math.pow(2, consecutiveFailures))
  }

  setTimeout(poll, currentInterval)
}

poll()

// ─── WEATHER PROXY ──────────────────────────────────────────────────────────

import { parseUSGSEarthquakes, parseEONETEvents, parseNWSAlerts } from '../src/lib/weather-client'

interface WeatherCacheEntry {
  events: unknown[]
  errors: string[]
  fetchedAt: number
}

let weatherCache: WeatherCacheEntry | null = null
const WEATHER_CACHE_TTL = 300_000 // 5 min

const EONET_ENDPOINTS = [
  'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=100',
  'https://eonet.sci.gsfc.nasa.gov/api/v3/events?status=open&limit=100',
  'https://api.nasa.gov/EONET/events?status=open&limit=100&api_key=DEMO_KEY',
]

async function fetchEONETWithFallback(
  withTimeout: (url: string, opts?: RequestInit) => Promise<Response>,
): Promise<ReturnType<typeof parseEONETEvents>> {
  const attemptErrors: string[] = []

  for (let i = 0; i < EONET_ENDPOINTS.length; i++) {
    const url = EONET_ENDPOINTS[i]
    const label = i === 0 ? 'primary' : `fallback ${i}`
    try {
      const r = await withTimeout(url)
      if (r.ok) {
        const json = await r.json()
        const events = parseEONETEvents(json)
        if (i > 0) console.log(`[Weather] EONET ${label} succeeded with ${events.length} events`)
        return events
      }
      attemptErrors.push(`${label}: HTTP ${r.status}`)
      console.warn(`[Weather] EONET ${label} returned HTTP ${r.status}`)
    } catch (err) {
      attemptErrors.push(`${label}: ${(err as Error).message}`)
      console.warn(`[Weather] EONET ${label} failed: ${(err as Error).message}`)
    }
  }

  throw new Error(`All endpoints failed (${attemptErrors.join('; ')})`)
}

const SOURCE_NAMES = ['USGS Earthquakes', 'NASA EONET', 'NWS Alerts'] as const

async function fetchWeatherEvents(): Promise<{ events: unknown[]; errors: string[] }> {
  if (weatherCache && Date.now() - weatherCache.fetchedAt < WEATHER_CACHE_TTL) {
    return { events: weatherCache.events, errors: weatherCache.errors }
  }

  const FETCH_TIMEOUT = 15_000 // 15s per upstream API
  const withTimeout = (url: string, opts?: RequestInit) =>
    fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT) })

  const results = await Promise.allSettled([
    withTimeout('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(json => parseUSGSEarthquakes(json)),
    fetchEONETWithFallback(withTimeout),
    withTimeout('https://api.weather.gov/alerts/active', {
      headers: { 'User-Agent': 'EagleEye/1.0 (weather-dashboard)' },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(json => parseNWSAlerts(json)),
  ])

  const events: unknown[] = []
  const errors: string[] = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      events.push(...result.value)
    } else if (result.status === 'rejected') {
      const msg = `${SOURCE_NAMES[i]}: ${result.reason?.message ?? 'Unknown error'}`
      errors.push(msg)
      console.warn(`[Weather] ${msg}`)
    }
  }

  weatherCache = { events, errors, fetchedAt: Date.now() }
  console.log(`[Weather] Fetched ${events.length} events, ${errors.length} source errors`)
  return { events, errors }
}

async function handleWeatherEvents(): Promise<Response> {
  try {
    const { events, errors } = await fetchWeatherEvents()
    return Response.json({ events, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[Weather] Fetch error:', err)
    return Response.json({ events: [], errors: ['All sources failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

async function handleWeatherConditions(url: URL): Promise<Response> {
  const lat = url.searchParams.get('lat')
  const lon = url.searchParams.get('lon')
  if (!lat || !lon) return Response.json({ error: 'lat and lon required' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure,weather_code`
    )
    if (!res.ok) return Response.json({ error: 'upstream error' }, { status: 502 })
    const data = await res.json()
    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch {
    return Response.json({ error: 'fetch error' }, { status: 502 })
  }
}

// ─── NEWS (GDELT) PROXY ────────────────────────────────────────────────────

import { parseGdeltGeo } from '../src/lib/news-client'

interface NewsCacheEntry { events: unknown[]; errors: string[]; fetchedAt: number }
let newsCache: NewsCacheEntry | null = null
const NEWS_CACHE_TTL = 300_000 // 5 min

async function fetchNewsEvents(): Promise<{ events: unknown[]; errors: string[] }> {
  if (newsCache && Date.now() - newsCache.fetchedAt < NEWS_CACHE_TTL) {
    return { events: newsCache.events, errors: newsCache.errors }
  }

  const errors: string[] = []
  let events: unknown[] = []

  try {
    const res = await fetch(
      'https://api.gdeltproject.org/api/v2/geo/geo?query=*&format=geojson&timespan=24h',
      { signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    events = parseGdeltGeo(json)
    console.log(`[News] GDELT: ${events.length} geo events`)
  } catch (err) {
    errors.push(`GDELT: ${(err as Error).message}`)
    console.warn(`[News] GDELT failed: ${(err as Error).message}`)
  }

  newsCache = { events, errors, fetchedAt: Date.now() }
  return { events, errors }
}

async function handleNewsEvents(): Promise<Response> {
  try {
    const { events, errors } = await fetchNewsEvents()
    return Response.json({ events, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[News] Fetch error:', err)
    return Response.json({ events: [], errors: ['GDELT failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── CONFLICT PROXY ────────────────────────────────────────────────────────

import { parseACLEDEvents, parseUCDPEvents } from '../src/lib/conflict-client'

interface ConflictCacheEntry { events: unknown[]; errors: string[]; fetchedAt: number }
let conflictCache: ConflictCacheEntry | null = null
const CONFLICT_CACHE_TTL = 1_800_000 // 30 min

async function fetchConflictEvents(): Promise<{ events: unknown[]; errors: string[] }> {
  if (conflictCache && Date.now() - conflictCache.fetchedAt < CONFLICT_CACHE_TTL) {
    return { events: conflictCache.events, errors: conflictCache.errors }
  }

  const results = await Promise.allSettled([
    fetch('https://api.acleddata.com/acled/read?terms=accept&limit=500', { signal: AbortSignal.timeout(15_000) })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseACLEDEvents(json)),
    fetch('https://ucdpapi.pcr.uu.se/api/gedevents/24.1?pagesize=100', { signal: AbortSignal.timeout(15_000) })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseUCDPEvents(json)),
  ])

  const events: unknown[] = []
  const errors: string[] = []
  const sourceNames = ['ACLED', 'UCDP']
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') events.push(...result.value)
    else {
      errors.push(`${sourceNames[i]}: ${result.reason?.message ?? 'Unknown error'}`)
      console.warn(`[Conflict] ${sourceNames[i]} failed: ${result.reason?.message}`)
    }
  }

  conflictCache = { events, errors, fetchedAt: Date.now() }
  console.log(`[Conflict] ${events.length} events, ${errors.length} source errors`)
  return { events, errors }
}

async function handleConflictEvents(): Promise<Response> {
  try {
    const { events, errors } = await fetchConflictEvents()
    return Response.json({ events, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[Conflict] Fetch error:', err)
    return Response.json({ events: [], errors: ['All sources failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── CYBER THREAT PROXY ───────────────────────────────────────────────────

import { parseAbuseIPDB } from '../src/lib/cyber-client'

interface CyberCacheEntry { events: unknown[]; errors: string[]; fetchedAt: number }
let cyberCache: CyberCacheEntry | null = null
const CYBER_CACHE_TTL = 1_800_000 // 30 min

const ABUSEIPDB_KEY = process.env.ABUSEIPDB_KEY ?? ''

async function fetchCyberEvents(): Promise<{ events: unknown[]; errors: string[] }> {
  if (cyberCache && Date.now() - cyberCache.fetchedAt < CYBER_CACHE_TTL) {
    return { events: cyberCache.events, errors: cyberCache.errors }
  }

  const events: unknown[] = []
  const errors: string[] = []

  // AbuseIPDB
  if (ABUSEIPDB_KEY) {
    try {
      const res = await fetch('https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=90&limit=100', {
        headers: { Key: ABUSEIPDB_KEY, Accept: 'application/json' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      events.push(...parseAbuseIPDB(json))
    } catch (err) {
      errors.push(`AbuseIPDB: ${(err as Error).message}`)
    }
  } else {
    errors.push('AbuseIPDB: No API key configured')
  }

  // IODA - internet outages
  try {
    const res = await fetch('https://api.ioda.inetintel.cc.gatech.edu/v2/signals/raw/country?from=-1h', {
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // IODA results require country→lat/lon mapping; for now just note it
    console.log('[Cyber] IODA check completed')
  } catch (err) {
    errors.push(`IODA: ${(err as Error).message}`)
  }

  cyberCache = { events, errors, fetchedAt: Date.now() }
  console.log(`[Cyber] ${events.length} events, ${errors.length} source errors`)
  return { events, errors }
}

async function handleCyberEvents(): Promise<Response> {
  try {
    const { events, errors } = await fetchCyberEvents()
    return Response.json({ events, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[Cyber] Fetch error:', err)
    return Response.json({ events: [], errors: ['All sources failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── OSINT PROXY ─────────────────────────────────────────────────────────────

import { parseRedditPosts, parseMastodonPosts, parseBlueskyPosts } from '../src/lib/osint-client'

interface OsintCacheEntry { posts: unknown[]; errors: string[]; fetchedAt: number }
let osintCache: OsintCacheEntry | null = null
const OSINT_CACHE_TTL = 300_000 // 5 min

async function fetchOsintPosts(): Promise<{ posts: unknown[]; errors: string[] }> {
  if (osintCache && Date.now() - osintCache.fetchedAt < OSINT_CACHE_TTL) {
    return { posts: osintCache.posts, errors: osintCache.errors }
  }

  const results = await Promise.allSettled([
    fetch('https://www.reddit.com/r/worldnews/.json?limit=50', {
      headers: { 'User-Agent': 'EagleEye/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseRedditPosts(json)),
    fetch('https://mastodon.social/api/v1/timelines/public?limit=40', {
      signal: AbortSignal.timeout(10_000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseMastodonPosts(json)),
    fetch('https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=breaking+news&limit=25', {
      signal: AbortSignal.timeout(10_000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseBlueskyPosts(json)),
  ])

  const posts: unknown[] = []
  const errors: string[] = []
  const sourceNames = ['Reddit', 'Mastodon', 'Bluesky']
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') posts.push(...result.value)
    else {
      errors.push(`${sourceNames[i]}: ${result.reason?.message ?? 'Unknown error'}`)
      console.warn(`[OSINT] ${sourceNames[i]} failed: ${result.reason?.message}`)
    }
  }

  osintCache = { posts, errors, fetchedAt: Date.now() }
  console.log(`[OSINT] ${posts.length} geolocated posts, ${errors.length} source errors`)
  return { posts, errors }
}

async function handleOsintPosts(): Promise<Response> {
  try {
    const { posts, errors } = await fetchOsintPosts()
    return Response.json({ posts, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[OSINT] Fetch error:', err)
    return Response.json({ posts: [], errors: ['All sources failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── SANCTIONS PROXY ─────────────────────────────────────────────────────────

import { parseSanctionResults } from '../src/lib/sanctions-client'

const sanctionsCache = new Map<string, { data: unknown; fetchedAt: number }>()
const SANCTIONS_CACHE_TTL = 3_600_000 // 1 hour

async function handleSanctionsCheck(url: URL): Promise<Response> {
  const query = url.searchParams.get('q')?.trim()
  if (!query) return Response.json({ error: 'q required' }, { status: 400 })

  const cacheKey = query.toLowerCase()
  const cached = sanctionsCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < SANCTIONS_CACHE_TTL) {
    return Response.json(cached.data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    const res = await fetch(
      `https://api.opensanctions.org/search/default?q=${encodeURIComponent(query)}&limit=5`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const matches = parseSanctionResults(json)
    const result = { matches, query }
    sanctionsCache.set(cacheKey, { data: result, fetchedAt: Date.now() })
    return Response.json(result, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return Response.json({ matches: [], error: (err as Error).message }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── CAMERA PROXY ───────────────────────────────────────────────────────────

import { parseWindyCameras, parseCameraList } from '../src/lib/camera-client'

const WINDY_KEY = process.env.WINDY_WEBCAMS_KEY ?? ''

interface CameraCacheEntry { cameras: unknown[]; errors: string[]; fetchedAt: number }
let cameraCache: CameraCacheEntry | null = null
const CAMERA_CACHE_TTL = 600_000 // 10 min

async function fetchCameras(lat: number, lon: number, radius: number): Promise<{ cameras: unknown[]; errors: string[] }> {
  if (cameraCache && Date.now() - cameraCache.fetchedAt < CAMERA_CACHE_TTL) {
    return { cameras: cameraCache.cameras, errors: cameraCache.errors }
  }

  const cameras: unknown[] = []
  const errors: string[] = []

  if (WINDY_KEY) {
    try {
      const res = await fetch(
        `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},${radius}&limit=100&include=location,image,player`,
        {
          headers: { 'x-windy-api-key': WINDY_KEY },
          signal: AbortSignal.timeout(15_000),
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      cameras.push(...parseWindyCameras(json))
      console.log(`[Cameras] Windy: ${cameras.length} cameras`)
    } catch (err) {
      errors.push(`Windy: ${(err as Error).message}`)
      console.warn(`[Cameras] Windy failed: ${(err as Error).message}`)
    }
  } else {
    errors.push('Windy: No API key configured (WINDY_WEBCAMS_KEY)')
  }

  cameraCache = { cameras, errors, fetchedAt: Date.now() }
  return { cameras, errors }
}

async function handleCameras(url: URL): Promise<Response> {
  const lat = parseFloat(url.searchParams.get('lat') ?? '40')
  const lon = parseFloat(url.searchParams.get('lon') ?? '-74')
  const radius = parseInt(url.searchParams.get('radius') ?? '5000')

  try {
    const { cameras, errors } = await fetchCameras(lat, lon, radius)
    return Response.json({ cameras, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[Cameras] Fetch error:', err)
    return Response.json({ cameras: [], errors: ['Fetch failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── PORTS PROXY ────────────────────────────────────────────────────────────

import { parsePortsGeoJSON, parsePortsList } from '../src/lib/ports-client'

interface PortCacheEntry { ports: unknown[]; errors: string[]; fetchedAt: number }
let portCache: PortCacheEntry | null = null
const PORT_CACHE_TTL = 86_400_000 // 24 hours (static data)

async function fetchPorts(): Promise<{ ports: unknown[]; errors: string[] }> {
  if (portCache && Date.now() - portCache.fetchedAt < PORT_CACHE_TTL) {
    return { ports: portCache.ports, errors: portCache.errors }
  }

  const errors: string[] = []
  let ports: unknown[] = []

  // Try NGA World Port Index
  try {
    const res = await fetch(
      'https://msi.nga.mil/api/publications/download?type=view&key=16920959/SFH00000/WPI.json',
      { signal: AbortSignal.timeout(20_000) },
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    ports = parsePortsGeoJSON(json)
    if (ports.length === 0) ports = parsePortsList(json as unknown)
    console.log(`[Ports] NGA WPI: ${ports.length} ports`)
  } catch (err) {
    errors.push(`NGA WPI: ${(err as Error).message}`)
    console.warn(`[Ports] NGA WPI failed: ${(err as Error).message}`)
  }

  portCache = { ports, errors, fetchedAt: Date.now() }
  return { ports, errors }
}

async function handlePorts(): Promise<Response> {
  try {
    const { ports, errors } = await fetchPorts()
    return Response.json({ ports, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[Ports] Fetch error:', err)
    return Response.json({ ports: [], errors: ['Fetch failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── RF SPECTRUM PROXY ──────────────────────────────────────────────────────

import { parsePSKReporterSpots, parseRBNSpots, parseSatNOGSObservations } from '../src/lib/rf-client'

interface RFCacheEntry { spots: unknown[]; errors: string[]; fetchedAt: number }
let rfCache: RFCacheEntry | null = null
const RF_CACHE_TTL = 300_000 // 5 min

async function fetchRFSpots(): Promise<{ spots: unknown[]; errors: string[] }> {
  if (rfCache && Date.now() - rfCache.fetchedAt < RF_CACHE_TTL) {
    return { spots: rfCache.spots, errors: rfCache.errors }
  }

  const results = await Promise.allSettled([
    fetch('https://pskreporter.info/cgi-bin/psk-freq.pl?mode=ALL&fmt=json&rptlimit=100', {
      signal: AbortSignal.timeout(15_000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parsePSKReporterSpots(json)),
    fetch('https://www.reversebeacon.net/spots.php?r=100&fmt=json', {
      signal: AbortSignal.timeout(15_000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseRBNSpots(json)),
    fetch('https://db.satnogs.org/api/transmitters/?format=json&limit=50', {
      signal: AbortSignal.timeout(15_000),
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(json => parseSatNOGSObservations(json)),
  ])

  const spots: unknown[] = []
  const errors: string[] = []
  const sourceNames = ['PSK Reporter', 'RBN', 'SatNOGS']
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') spots.push(...result.value)
    else {
      errors.push(`${sourceNames[i]}: ${result.reason?.message ?? 'Unknown error'}`)
      console.warn(`[RF] ${sourceNames[i]} failed: ${result.reason?.message}`)
    }
  }

  rfCache = { spots, errors, fetchedAt: Date.now() }
  console.log(`[RF] ${spots.length} spots, ${errors.length} source errors`)
  return { spots, errors }
}

async function handleRFSpots(): Promise<Response> {
  try {
    const { spots, errors } = await fetchRFSpots()
    return Response.json({ spots, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[RF] Fetch error:', err)
    return Response.json({ spots: [], errors: ['All sources failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── ECONOMIC DATA PROXY ────────────────────────────────────────────────────

import { parseWorldBankData, ECONOMIC_INDICATORS } from '../src/lib/economic-client'

interface EconCacheEntry { indicators: unknown[]; errors: string[]; fetchedAt: number }
let econCache: EconCacheEntry | null = null
const ECON_CACHE_TTL = 3_600_000 // 1 hour

async function fetchEconomicIndicators(): Promise<{ indicators: unknown[]; errors: string[] }> {
  if (econCache && Date.now() - econCache.fetchedAt < ECON_CACHE_TTL) {
    return { indicators: econCache.indicators, errors: econCache.errors }
  }

  const indicators: unknown[] = []
  const errors: string[] = []

  // Fetch latest year data for each indicator from World Bank
  const results = await Promise.allSettled(
    ECONOMIC_INDICATORS.map(ind =>
      fetch(
        `https://api.worldbank.org/v2/country/all/indicator/${ind.id}?format=json&per_page=300&date=2022:2024&MRV=1`,
        { signal: AbortSignal.timeout(15_000) },
      )
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        .then(json => parseWorldBankData(json, ind.id, ind.name))
    )
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') indicators.push(...result.value)
    else {
      errors.push(`${ECONOMIC_INDICATORS[i].name}: ${result.reason?.message ?? 'Unknown error'}`)
      console.warn(`[Economic] ${ECONOMIC_INDICATORS[i].name} failed: ${result.reason?.message}`)
    }
  }

  econCache = { indicators, errors, fetchedAt: Date.now() }
  console.log(`[Economic] ${indicators.length} data points, ${errors.length} source errors`)
  return { indicators, errors }
}

async function handleEconomicIndicators(): Promise<Response> {
  try {
    const { indicators, errors } = await fetchEconomicIndicators()
    return Response.json({ indicators, errors }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    console.error('[Economic] Fetch error:', err)
    return Response.json({ indicators: [], errors: ['All sources failed'] }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

// ─── HEXDB PROXY ────────────────────────────────────────────────────────────

const HEXDB = 'https://hexdb.io'

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function resolveImageUrl(hex: string): Promise<string | null> {
  try {
    const res = await fetch(`${HEXDB}/hex-image-thumb?hex=${hex}`)
    if (!res.ok) return null
    const text = (await res.text()).trim()
    return text.startsWith('http') ? text : null
  } catch { return null }
}

async function handleHexdbLookup(url: URL): Promise<Response> {
  const hex = (url.searchParams.get('hex') ?? '').toUpperCase()
  if (!hex) return Response.json({ error: 'hex required' }, { status: 400 })
  const callsign = (url.searchParams.get('callsign') ?? '').trim()

  const [aircraft, route] = await Promise.all([
    fetchJson(`${HEXDB}/api/v1/aircraft/${hex}`),
    callsign ? fetchJson(`${HEXDB}/api/v1/route/icao/${callsign}`) : null,
  ])

  let origin = null
  let destination = null
  const routeStr = (route as { route?: string })?.route
  if (routeStr) {
    const parts = routeStr.split('-')
    if (parts.length === 2) {
      ;[origin, destination] = await Promise.all([
        fetchJson(`${HEXDB}/api/v1/airport/icao/${parts[0]}`),
        fetchJson(`${HEXDB}/api/v1/airport/icao/${parts[1]}`),
      ])
    }
  }

  const imageUrl = await resolveImageUrl(hex)
  return Response.json(
    { aircraft, route, origin, destination, hasImage: imageUrl !== null },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}

async function handleHexdbImage(url: URL): Promise<Response> {
  const hex = (url.searchParams.get('hex') ?? '').toUpperCase()
  if (!hex) return new Response('hex required', { status: 400 })

  const realUrl = await resolveImageUrl(hex)
  if (!realUrl) return new Response('not found', { status: 404 })

  try {
    const imgRes = await fetch(realUrl)
    if (!imgRes.ok) return new Response('not found', { status: 404 })
    return new Response(imgRes.body, {
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') ?? 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('fetch error', { status: 502 })
  }
}

// ─── UNIFIED SERVER ─────────────────────────────────────────────────────────

Bun.serve<{ path: string }>({
  port: PORT,
  idleTimeout: 60, // seconds — weather fetches can be slow
  async fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade — differentiate by path
    if (url.pathname === '/ws/ais') {
      if (server.upgrade(req, { data: { path: '/ws/ais' } })) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }
    if (url.pathname === '/ws/flights') {
      if (server.upgrade(req, { data: { path: '/ws/flights' } })) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // HTTP API routes
    if (url.pathname === '/api/weather/events') return handleWeatherEvents()
    if (url.pathname === '/api/weather/conditions') return handleWeatherConditions(url)
    if (url.pathname === '/api/news/events') return handleNewsEvents()
    if (url.pathname === '/api/conflicts/events') return handleConflictEvents()
    if (url.pathname === '/api/cyber/events') return handleCyberEvents()
    if (url.pathname === '/api/osint/posts') return handleOsintPosts()
    if (url.pathname === '/api/sanctions/check') return handleSanctionsCheck(url)
    if (url.pathname === '/api/cameras/nearby') return handleCameras(url)
    if (url.pathname === '/api/ports/data') return handlePorts()
    if (url.pathname === '/api/rf/spots') return handleRFSpots()
    if (url.pathname === '/api/economic/indicators') return handleEconomicIndicators()
    if (url.pathname === '/api/hexdb/lookup') return handleHexdbLookup(url)
    if (url.pathname === '/api/hexdb/image') return handleHexdbImage(url)

    // Legacy compatibility routes (single-port clients)
    if (url.pathname === '/lookup') return handleHexdbLookup(url)
    if (url.pathname === '/image') return handleHexdbImage(url)

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        ais: { connected: aisUpstream?.readyState === WebSocket.OPEN, clients: aisClients.size },
        flights: { source: FLIGHT_SOURCE, clients: flightClients.size, polls: pollCount },
      })
    }

    return new Response('Eagle Eye Backend', { status: 200 })
  },
  websocket: {
    open(ws) {
      if (ws.data.path === '/ws/ais') {
        aisClients.add(ws)
        console.log(`[AIS] Client connected (${aisClients.size} total)`)
      } else if (ws.data.path === '/ws/flights') {
        flightClients.add(ws)
        console.log(`[Flight] Client connected (${flightClients.size} total)`)
        // Send last known data to new clients
        if (lastGoodPayload) {
          try { ws.send(lastGoodPayload) } catch { /* skip */ }
        }
      }
    },
    close(ws) {
      if (ws.data.path === '/ws/ais') {
        aisClients.delete(ws)
        console.log(`[AIS] Client disconnected (${aisClients.size} total)`)
      } else if (ws.data.path === '/ws/flights') {
        flightClients.delete(ws)
        console.log(`[Flight] Client disconnected (${flightClients.size} total)`)
      }
    },
    message() {
      // Browser clients don't send messages
    },
  },
})

console.log(`[Eagle Eye] Backend listening on :${PORT}`)
console.log(`  WebSocket: /ws/ais, /ws/flights`)
console.log(`  HTTP API:  /api/weather/events, /api/weather/conditions, /api/news/events, /api/conflicts/events, /api/cyber/events`)
console.log(`             /api/osint/posts, /api/sanctions/check, /api/ports/data, /api/rf/spots, /api/economic/indicators`)
console.log(`             /api/hexdb/lookup, /api/hexdb/image`)
console.log(`  Health:    /health`)
if (AIS_API_KEY) console.log('[AIS] API key configured')
else console.warn('[AIS] Missing AIS_API_KEY — AIS proxy disabled')
if (OPENSKY_CLIENT_ID && OPENSKY_CLIENT_SECRET) console.log('[Flight] OpenSky OAuth2 credentials configured')
else console.warn('[Flight] OpenSky OAuth2 credentials missing — using anonymous access')
console.log(`[Flight] Source: ${FLIGHT_SOURCE}`)

// Pre-fetch weather data on startup so the first client request is fast
fetchWeatherEvents().catch(() => console.warn('[Weather] Initial fetch failed — will retry on first request'))
