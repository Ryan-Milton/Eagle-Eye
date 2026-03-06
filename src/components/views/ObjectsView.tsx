import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useAppStore } from '@/stores/app-store'

interface UnifiedEntity {
  id: string
  domain: 'satellite' | 'vessel' | 'flight' | 'weather' | 'news' | 'conflict' | 'cyber'
  name: string
  subtype: string
  lat: number
  lon: number
  speed: number | null
  magnitude: number | null
  lastUpdate: number
}

type SortField = 'name' | 'domain' | 'lastUpdate' | 'speed'
type SortDir = 'asc' | 'desc'

const DOMAIN_COLORS: Record<string, string> = {
  satellite: 'text-orange-400',
  vessel: 'text-cyan-400',
  flight: 'text-yellow-400',
  weather: 'text-green-400',
  news: 'text-rose-400',
  conflict: 'text-red-400',
  cyber: 'text-purple-400',
}

const DOMAIN_LABELS: Record<string, string> = {
  satellite: 'SAT',
  vessel: 'AIS',
  flight: 'ADSB',
  weather: 'WX',
  news: 'NEWS',
  conflict: 'CON',
  cyber: 'CYB',
}

const ROW_HEIGHT = 32
const OVERSCAN = 10

export function ObjectsView() {
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('lastUpdate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Store data
  const { toggles, getPositions, getSatellites, version: satVersion } = useSatelliteStore()
  const { vessels, version: vesselVersion } = useVesselStore()
  const { flights, version: flightVersion } = useFlightStore()
  const { events: weatherEvents, version: weatherVersion } = useWeatherStore()
  const { events: newsEvents, version: newsVersion } = useNewsStore()
  const { events: conflictEvents, version: conflictVersion } = useConflictStore()
  const { events: cyberEvents, version: cyberVersion } = useCyberStore()

  const allEntities = useMemo(() => {
    void satVersion; void vesselVersion; void flightVersion; void weatherVersion; void newsVersion; void conflictVersion; void cyberVersion
    const entities: UnifiedEntity[] = []

    // Satellites
    for (const [id, enabled] of toggles) {
      if (!enabled) continue
      const sats = getSatellites(id)
      const positions = getPositions(id)
      for (const sat of sats) {
        const pos = positions.find(p => p.noradId === sat.noradId)
        entities.push({
          id: `sat-${sat.noradId}`,
          domain: 'satellite',
          name: sat.name,
          subtype: String(sat.constellationId),
          lat: pos?.lat ?? 0,
          lon: pos?.lon ?? 0,
          speed: pos ? pos.velocity : null,
          magnitude: null,
          lastUpdate: Date.now(),
        })
      }
    }

    // Vessels
    for (const [, v] of vessels) {
      entities.push({
        id: `vessel-${v.mmsi}`,
        domain: 'vessel',
        name: v.name || String(v.mmsi),
        subtype: v.type,
        lat: v.lat, lon: v.lon,
        speed: v.speed,
        magnitude: null,
        lastUpdate: v.lastUpdate,
      })
    }

    // Flights
    for (const [, f] of flights) {
      entities.push({
        id: `flight-${f.icao24}`,
        domain: 'flight',
        name: f.callsign || f.icao24,
        subtype: f.type,
        lat: f.lat, lon: f.lon,
        speed: f.speed * 1.94384,
        magnitude: null,
        lastUpdate: f.lastUpdate,
      })
    }

    // Weather
    for (const [, e] of weatherEvents) {
      entities.push({
        id: `weather-${e.id}`,
        domain: 'weather',
        name: e.title,
        subtype: e.type,
        lat: e.lat, lon: e.lon,
        speed: null,
        magnitude: e.magnitude,
        lastUpdate: e.lastUpdate,
      })
    }

    // News
    for (const [, e] of newsEvents) {
      entities.push({
        id: `news-${e.id}`,
        domain: 'news',
        name: e.title,
        subtype: e.category,
        lat: e.lat, lon: e.lon,
        speed: null,
        magnitude: null,
        lastUpdate: e.lastUpdate,
      })
    }

    // Conflicts
    for (const [, e] of conflictEvents) {
      entities.push({
        id: `conflict-${e.id}`,
        domain: 'conflict',
        name: e.title,
        subtype: e.type,
        lat: e.lat, lon: e.lon,
        speed: null,
        magnitude: e.fatalities,
        lastUpdate: e.lastUpdate,
      })
    }

    // Cyber
    for (const [, e] of cyberEvents) {
      entities.push({
        id: `cyber-${e.id}`,
        domain: 'cyber',
        name: e.title,
        subtype: e.type,
        lat: e.lat, lon: e.lon,
        speed: null,
        magnitude: e.severity,
        lastUpdate: e.lastUpdate,
      })
    }

    return entities
  }, [satVersion, vesselVersion, flightVersion, weatherVersion, newsVersion, conflictVersion, cyberVersion, toggles, getSatellites, getPositions, vessels, flights, weatherEvents, newsEvents, conflictEvents, cyberEvents])

  const filteredEntities = useMemo(() => {
    let list = allEntities
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e => e.name.toLowerCase().includes(q) || e.subtype.toLowerCase().includes(q))
    }
    if (domainFilter.size > 0) {
      list = list.filter(e => domainFilter.has(e.domain))
    }
    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'domain': cmp = a.domain.localeCompare(b.domain); break
        case 'lastUpdate': cmp = a.lastUpdate - b.lastUpdate; break
        case 'speed': cmp = (a.speed ?? 0) - (b.speed ?? 0); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [allEntities, search, domainFilter, sortField, sortDir])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }, [sortField])

  const toggleDomainFilter = useCallback((domain: string) => {
    setDomainFilter(prev => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }, [])

  const handleSelect = useCallback((entity: UnifiedEntity) => {
    const store = useSelectionStore.getState()
    const app = useAppStore.getState()
    store.clearAll()

    switch (entity.domain) {
      case 'satellite': store.selectSatellite(parseInt(entity.id.replace('sat-', ''))); break
      case 'vessel': store.selectVessel(parseInt(entity.id.replace('vessel-', ''))); break
      case 'flight': store.selectFlight(entity.id.replace('flight-', '')); break
      case 'weather': store.selectEvent(entity.id.replace('weather-', '')); break
      case 'news': store.selectNews(entity.id.replace('news-', '')); break
      case 'conflict': store.selectConflict(entity.id.replace('conflict-', '')); break
      case 'cyber': store.selectCyber(entity.id.replace('cyber-', '')); break
    }
    app.setActiveView('Globe')
  }, [])

  // Virtual scrolling
  const containerHeight = typeof window !== 'undefined' ? window.innerHeight - 46 - 34 : 600
  const headerHeight = 88
  const tableHeight = containerHeight - headerHeight
  const totalHeight = filteredEntities.length * ROW_HEIGHT
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
  const endIdx = Math.min(filteredEntities.length, Math.ceil((scrollTop + tableHeight) / ROW_HEIGHT) + OVERSCAN)
  const visibleEntities = filteredEntities.slice(startIdx, endIdx)
  const offsetY = startIdx * ROW_HEIGHT

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop)
  }, [])

  const domains = ['satellite', 'vessel', 'flight', 'weather', 'news', 'conflict', 'cyber']

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px] bg-zinc-950 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter entities..."
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-mono text-[12px] text-zinc-300 w-48 focus:outline-none focus:border-orange-800"
        />
        <div className="flex gap-1 ml-2">
          {domains.map(d => (
            <button
              key={d}
              onClick={() => toggleDomainFilter(d)}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border transition-colors',
                domainFilter.has(d)
                  ? `${DOMAIN_COLORS[d]} border-current bg-current/10`
                  : domainFilter.size === 0
                    ? `${DOMAIN_COLORS[d]} border-transparent`
                    : 'text-zinc-600 border-transparent',
              )}
            >
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[11px] text-zinc-500">
          {filteredEntities.length.toLocaleString()} entities
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center px-4 h-8 border-b border-zinc-800 flex-shrink-0 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
        <button onClick={() => handleSort('domain')} className="w-12 text-left hover:text-zinc-300">Type</button>
        <button onClick={() => handleSort('name')} className="flex-1 text-left hover:text-zinc-300">Name / ID</button>
        <span className="w-20 text-right">Lat</span>
        <span className="w-20 text-right">Lon</span>
        <button onClick={() => handleSort('speed')} className="w-16 text-right hover:text-zinc-300">Spd/Mag</button>
        <button onClick={() => handleSort('lastUpdate')} className="w-20 text-right hover:text-zinc-300">Updated</button>
      </div>

      {/* Virtual scrolling table */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700"
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleEntities.map(entity => (
              <button
                key={entity.id}
                onClick={() => handleSelect(entity)}
                className="flex items-center px-4 w-full text-left hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/20"
                style={{ height: ROW_HEIGHT }}
              >
                <span className={cn('w-12 font-mono text-[10px] uppercase tracking-wider', DOMAIN_COLORS[entity.domain])}>
                  {DOMAIN_LABELS[entity.domain]}
                </span>
                <span className="flex-1 font-mono text-[11px] text-zinc-300 truncate">{entity.name}</span>
                <span className="w-20 font-mono text-[11px] text-zinc-500 text-right">{entity.lat.toFixed(2)}</span>
                <span className="w-20 font-mono text-[11px] text-zinc-500 text-right">{entity.lon.toFixed(2)}</span>
                <span className="w-16 font-mono text-[11px] text-zinc-500 text-right">
                  {entity.speed !== null ? entity.speed.toFixed(0) : entity.magnitude !== null ? entity.magnitude.toFixed(1) : '—'}
                </span>
                <span className="w-20 font-mono text-[11px] text-zinc-600 text-right">
                  {Math.round((Date.now() - entity.lastUpdate) / 1000)}s
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
