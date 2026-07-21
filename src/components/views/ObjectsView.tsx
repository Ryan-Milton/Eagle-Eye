import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useOsintStore } from '@/stores/osint-store'
import { usePortStore } from '@/stores/port-store'
import { useRFStore } from '@/stores/rf-store'
import { useEconomicStore } from '@/stores/economic-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useAppStore } from '@/stores/app-store'
import { exportCSV, exportGeoJSON } from '@/lib/export'
import { PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'
import { DOMAIN_HEX_COLORS, CHART_TOOLTIP_STYLE, CHART_BAR_STYLE, activeBarGrow } from '@/lib/chart-theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Stat } from '@/components/ui/stat'
import { AnalysisChartRegion, AnalysisPanel, AnalysisSectionTitle } from './shared/AnalysisPrimitives'

interface UnifiedEntity {
  id: string
  domain: 'satellite' | 'vessel' | 'flight' | 'weather' | 'news' | 'conflict' | 'cyber' | 'osint' | 'port' | 'rf' | 'economic'
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

const DOMAIN_LABELS: Record<string, string> = {
  satellite: 'SAT',
  vessel: 'AIS',
  flight: 'ADSB',
  weather: 'WX',
  news: 'NEWS',
  conflict: 'CON',
  cyber: 'CYB',
  osint: 'OSINT',
  port: 'PORT',
  rf: 'RF',
  economic: 'ECON',
}

const DEFAULT_ROW_HEIGHT = 36
const OVERSCAN = 10

export function ObjectsView() {
  const [search, setSearch] = useState('')
  const [domainFilter, setDomainFilter] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('lastUpdate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT)
  const [renderTime] = useState(Date.now)

  // Store data
  const { toggles, getPositions, getSatellites, version: satVersion } = useSatelliteStore()
  const { vessels, version: vesselVersion } = useVesselStore()
  const { flights, version: flightVersion } = useFlightStore()
  const { events: weatherEvents, version: weatherVersion } = useWeatherStore()
  const { events: newsEvents, version: newsVersion } = useNewsStore()
  const { events: conflictEvents, version: conflictVersion } = useConflictStore()
  const { events: cyberEvents, version: cyberVersion } = useCyberStore()
  const { posts: osintPosts, version: osintVersion } = useOsintStore()
  const { ports, version: portVersion } = usePortStore()
  const { spots: rfSpots, version: rfVersion } = useRFStore()
  const { indicators: econIndicators, version: econVersion } = useEconomicStore()

  const allEntities = useMemo(() => {
    void satVersion; void vesselVersion; void flightVersion; void weatherVersion; void newsVersion; void conflictVersion; void cyberVersion; void osintVersion; void portVersion; void rfVersion; void econVersion
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
          lastUpdate: renderTime,
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

    // OSINT
    for (const [, p] of osintPosts) {
      entities.push({
        id: p.id,
        domain: 'osint',
        name: p.text.slice(0, 60),
        subtype: p.platform,
        lat: p.lat, lon: p.lon,
        speed: null,
        magnitude: null,
        lastUpdate: p.lastUpdate,
      })
    }

    // Ports
    for (const [, p] of ports) {
      entities.push({
        id: p.id,
        domain: 'port',
        name: p.name,
        subtype: p.size,
        lat: p.lat, lon: p.lon,
        speed: null,
        magnitude: null,
        lastUpdate: p.lastUpdate,
      })
    }

    // RF
    for (const [, s] of rfSpots) {
      entities.push({
        id: s.id,
        domain: 'rf',
        name: `${s.txCall} → ${s.rxCall}`,
        subtype: s.source,
        lat: s.rxLat, lon: s.rxLon,
        speed: null,
        magnitude: s.snr,
        lastUpdate: s.time,
      })
    }

    // Economic
    for (const [, ind] of econIndicators) {
      entities.push({
        id: ind.id,
        domain: 'economic',
        name: `${ind.country} — ${ind.indicator}`,
        subtype: ind.indicatorId,
        lat: ind.lat, lon: ind.lon,
        speed: null,
        magnitude: ind.value,
        lastUpdate: ind.lastUpdate,
      })
    }

    return entities
  }, [satVersion, vesselVersion, flightVersion, weatherVersion, newsVersion, conflictVersion, cyberVersion, osintVersion, portVersion, rfVersion, econVersion, toggles, getSatellites, getPositions, vessels, flights, weatherEvents, newsEvents, conflictEvents, cyberEvents, osintPosts, ports, rfSpots, econIndicators, renderTime])

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

  // Summary strip data
  const domainDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const e of allEntities) {
      counts[e.domain] = (counts[e.domain] || 0) + 1
    }
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([domain, count]) => ({ domain, count, fill: DOMAIN_HEX_COLORS[domain] || 'var(--muted-foreground)' }))
  }, [allEntities])

  const speedBuckets = useMemo(() => {
    const buckets = [
      { label: 'Idle', min: 0, max: 5, count: 0 },
      { label: 'Slow', min: 5, max: 20, count: 0 },
      { label: 'Med', min: 20, max: 100, count: 0 },
      { label: 'Fast', min: 100, max: Infinity, count: 0 },
    ]
    for (const e of filteredEntities) {
      if (e.speed === null) continue
      const spd = e.speed
      if (spd < 5) buckets[0].count++
      else if (spd < 20) buckets[1].count++
      else if (spd < 100) buckets[2].count++
      else buckets[3].count++
    }
    return buckets
  }, [filteredEntities])

  const updateTimeline = useMemo(() => {
    const bins: { label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const binStart = renderTime - (i + 1) * 10000
      const binEnd = renderTime - i * 10000
      const count = filteredEntities.filter(e => e.lastUpdate >= binStart && e.lastUpdate < binEnd).length
      bins.push({ label: `${(i + 1) * 10}s`, count })
    }
    return bins
  }, [filteredEntities, renderTime])

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

  // Virtual scrolling uses the rendered viewport and row metrics rather than shell offsets.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const measure = () => {
      setViewportHeight(container.clientHeight)
      const row = container.querySelector<HTMLElement>('[data-virtual-row]')
      if (row) setRowHeight(row.getBoundingClientRect().height || DEFAULT_ROW_HEIGHT)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(container)
    const row = container.querySelector<HTMLElement>('[data-virtual-row]')
    if (row) observer.observe(row)
    measure()

    return () => observer.disconnect()
  }, [filteredEntities.length])

  const totalHeight = filteredEntities.length * rowHeight
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
  const endIdx = Math.min(filteredEntities.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN)
  const visibleEntities = filteredEntities.slice(startIdx, endIdx)
  const offsetY = startIdx * rowHeight

  const handleScroll = useCallback(() => {
    if (scrollRef.current) setScrollTop(scrollRef.current.scrollTop)
  }, [])

  const domains = ['satellite', 'vessel', 'flight', 'weather', 'news', 'conflict', 'cyber', 'osint']

  const handleExportCSV = useCallback(() => {
    exportCSV(filteredEntities, `eagle-eye-${new Date().toISOString().slice(0, 10)}.csv`)
  }, [filteredEntities])

  const handleExportGeoJSON = useCallback(() => {
    exportGeoJSON(filteredEntities, `eagle-eye-${new Date().toISOString().slice(0, 10)}.geojson`)
  }, [filteredEntities])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2 sm:px-4">
        <Input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter entities..."
          className="min-h-9 w-full py-1 text-xs sm:w-52"
        />
        <div className="flex max-w-full gap-px overflow-x-auto border border-line-muted bg-line-muted">
          {domains.map(d => (
            <button
              type="button"
              key={d}
              onClick={() => toggleDomainFilter(d)}
              className={cn(
                'neo-kicker min-h-8 shrink-0 border-0 px-2 transition-colors focus-visible:outline-focus',
                domainFilter.has(d)
                  ? 'bg-signal text-signal-foreground'
                  : domainFilter.size === 0
                    ? 'bg-panel text-foreground hover:bg-panel-raised'
                    : 'bg-panel text-muted-foreground hover:text-foreground',
              )}
              style={!domainFilter.has(d) && domainFilter.size === 0 ? { color: DOMAIN_HEX_COLORS[d] } : undefined}
            >
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleExportCSV}>CSV</Button>
          <Button type="button" variant="outline" size="sm" onClick={handleExportGeoJSON}>GeoJSON</Button>
          <span className="neo-data hidden text-xs text-muted-foreground sm:inline">
            {filteredEntities.length.toLocaleString()} entities
          </span>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="neo-scrollbar grid flex-shrink-0 auto-cols-[minmax(220px,1fr)] grid-flow-col gap-2 overflow-x-auto border-b border-line bg-background p-2 sm:grid-flow-row sm:grid-cols-2 xl:grid-cols-4">
        {/* Domain Distribution */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-2">Domain Distribution</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-20 p-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={domainDistribution}
                  dataKey="count"
                  nameKey="domain"
                  cx="50%"
                  cy="50%"
                  outerRadius={25}
                  innerRadius={10}
                  strokeWidth={0}
                  onClick={(entry: { domain: string }) => toggleDomainFilter(entry.domain)}
                  style={{ cursor: 'pointer' }}
                >
                  {domainDistribution.map((entry) => (
                    <Cell key={entry.domain} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  {...CHART_TOOLTIP_STYLE}
                  formatter={(value: number | undefined, name: string | undefined) => [value ?? 0, name ?? '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Speed Distribution */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-2">Speed Distribution</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-20 p-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={speedBuckets} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                <Tooltip
                  {...CHART_TOOLTIP_STYLE}
                  formatter={(value: number | undefined) => [value ?? 0, 'Count']}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="count" fill="var(--signal)" {...CHART_BAR_STYLE} activeBar={activeBarGrow}>
                  {speedBuckets.map((_, i) => (
                    <Cell key={i} fill="var(--signal)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Recent Updates */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-2">Recent Updates</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-20 p-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={updateTimeline} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                <Tooltip
                  {...CHART_TOOLTIP_STYLE}
                  formatter={(value: number | undefined) => [value ?? 0, 'Updates']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--signal)"
                  strokeWidth={1.5}
                  fill="var(--signal)"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Count Display */}
        <AnalysisPanel className="flex items-center p-4">
          <Stat label="Filtered / Total" value={filteredEntities.length.toLocaleString()} detail={`/ ${allEntities.length.toLocaleString()} indexed`} />
        </AnalysisPanel>
      </div>

      <div className="neo-scrollbar min-h-0 flex-1 overflow-x-auto bg-panel">
        <div className="flex h-full min-w-[720px] flex-col">
          {/* Header */}
          <div className="neo-kicker flex h-9 flex-shrink-0 items-center border-b border-line bg-panel-subtle px-4 text-muted-foreground">
            <button type="button" onClick={() => handleSort('domain')} className="w-14 text-left hover:text-foreground">Type</button>
            <button type="button" onClick={() => handleSort('name')} className="flex-1 text-left hover:text-foreground">Name / ID</button>
            <span className="w-20 text-right">Lat</span>
            <span className="w-20 text-right">Lon</span>
            <button type="button" onClick={() => handleSort('speed')} className="w-20 text-right hover:text-foreground">Spd/Mag</button>
            <button type="button" onClick={() => handleSort('lastUpdate')} className="w-20 text-right hover:text-foreground">Updated</button>
          </div>

          {/* Virtual scrolling table */}
          <div ref={scrollRef} onScroll={handleScroll} className="neo-scrollbar min-h-0 flex-1 overflow-y-auto">
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleEntities.map(entity => (
              <button
                type="button"
                key={entity.id}
                data-virtual-row
                onClick={() => handleSelect(entity)}
                className="flex h-9 w-full items-center border-b border-line-muted px-4 text-left transition-colors hover:bg-signal hover:text-signal-foreground"
              >
                <span className="neo-kicker w-14" style={{ color: DOMAIN_HEX_COLORS[entity.domain] }}>
                  {DOMAIN_LABELS[entity.domain]}
                </span>
                <span className="neo-data flex-1 truncate text-xs">{entity.name}</span>
                <span className="neo-data w-20 text-right text-xs text-muted-foreground">{entity.lat.toFixed(2)}</span>
                <span className="neo-data w-20 text-right text-xs text-muted-foreground">{entity.lon.toFixed(2)}</span>
                <span className="neo-data w-20 text-right text-xs text-muted-foreground">
                  {entity.speed !== null ? entity.speed.toFixed(0) : entity.magnitude !== null ? entity.magnitude.toFixed(1) : '—'}
                </span>
                <span className="neo-data w-20 text-right text-xs text-muted-foreground">
                  {Math.round((renderTime - entity.lastUpdate) / 1000)}s
                </span>
              </button>
            ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
