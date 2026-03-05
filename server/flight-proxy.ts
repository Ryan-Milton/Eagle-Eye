const FLIGHT_SOURCE = process.env.FLIGHT_SOURCE ?? 'opensky'
const POLL_INTERVAL = 10_000

const clients = new Set<import('bun').ServerWebSocket<unknown>>()

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

// Military callsign prefixes
const MILITARY_PREFIXES = [
  'RCH', 'EVAC', 'DUKE', 'KING', 'JAKE', 'TOPCAT', 'NAVY', 'ARMY',
  'REACH', 'VALOR', 'HAWK', 'VIPER', 'BOLT', 'ROCK', 'FORCE',
]
const CARGO_AIRLINES = ['FDX', 'UPS', 'GTI', 'CLX', 'ABW', 'CKS', 'MPH', 'BOX', 'SQC']
const HELI_PREFIXES = ['LIFE', 'MEDEVAC', 'HELI', 'AIR1', 'MED']

function classifyFlight(callsign: string): string {
  const cs = callsign.toUpperCase().trim()
  if (!cs) return 'other'
  if (MILITARY_PREFIXES.some(p => cs.startsWith(p))) return 'military'
  if (CARGO_AIRLINES.some(a => cs.startsWith(a))) return 'cargo'
  if (HELI_PREFIXES.some(p => cs.startsWith(p))) return 'helicopter'
  // N-numbers are private aircraft (US registration)
  if (/^N\d/.test(cs)) return 'private'
  // Most 3-letter prefix + digits = commercial airline
  if (/^[A-Z]{3}\d/.test(cs)) return 'commercial'
  return 'other'
}

async function fetchOpenSky(): Promise<FlightData[]> {
  const url = 'https://opensky-network.org/api/states/all'
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`[Flight] OpenSky HTTP ${res.status}`)
    return []
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
    const altitude = s[7] as number | null  // baro_alt in meters
    const onGround = s[8] as boolean
    const speed = s[9] as number | null      // m/s
    const heading = s[10] as number | null   // degrees
    const verticalRate = s[11] as number | null

    if (lat == null || lon == null) continue

    flights.push({
      icao24,
      callsign: callsign || icao24.toUpperCase(),
      type: classifyFlight(callsign),
      originCountry,
      lat,
      lon,
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

async function fetchAdsbExchange(): Promise<FlightData[]> {
  const apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    console.error('[Flight] Missing RAPIDAPI_KEY for ADS-B Exchange')
    return []
  }

  const lat = 40.0
  const lon = -74.0
  const dist = 250

  const res = await fetch(
    `https://adsbexchange-com1.p.rapidapi.com/v2/lat/${lat}/lon/${lon}/dist/${dist}/`,
    { headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'adsbexchange-com1.p.rapidapi.com' } },
  )
  if (!res.ok) {
    console.error(`[Flight] ADS-B Exchange HTTP ${res.status}`)
    return []
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

    // Convert: altitude ft→m, speed knots→m/s, vert rate fpm→m/s
    const altFt = (ac.alt_baro as number) ?? 0
    const spdKn = (ac.gs as number) ?? 0
    const vertFpm = (ac.baro_rate as number) ?? 0

    flights.push({
      icao24,
      callsign: callsign || icao24.toUpperCase(),
      type: classifyFlight(callsign),
      originCountry: '',
      lat,
      lon,
      altitude: altFt * 0.3048,
      speed: spdKn * 0.514444,
      heading: (ac.track as number) ?? 0,
      verticalRate: vertFpm * 0.00508,
      onGround: (ac.alt_baro as string) === 'ground',
      lastUpdate: Date.now(),
    })
  }
  return flights
}

let pollCount = 0

async function poll() {
  try {
    const flights = FLIGHT_SOURCE === 'adsb'
      ? await fetchAdsbExchange()
      : await fetchOpenSky()

    const payload = JSON.stringify({
      type: 'flights',
      flights,
      timestamp: Date.now(),
    })

    for (const client of clients) {
      try { client.send(payload) } catch { /* skip */ }
    }

    pollCount++
    if (pollCount % 6 === 0) {
      console.log(`[Flight] Poll #${pollCount}: ${flights.length} aircraft, ${clients.size} clients`)
    }
  } catch (err) {
    console.error('[Flight] Poll error:', err)
  }
}

// Start polling
setInterval(poll, POLL_INTERVAL)
poll()

Bun.serve({
  port: 4002,
  fetch(req, server) {
    if (server.upgrade(req)) return
    return new Response('Flight Proxy WebSocket server', { status: 200 })
  },
  websocket: {
    open(ws) {
      clients.add(ws)
      console.log(`[Flight] Client connected (${clients.size} total)`)
    },
    close(ws) {
      clients.delete(ws)
      console.log(`[Flight] Client disconnected (${clients.size} total)`)
    },
    message() {
      // Browser clients don't send messages
    },
  },
})

console.log(`[Flight] Proxy listening on ws://localhost:4002 (source: ${FLIGHT_SOURCE})`)
