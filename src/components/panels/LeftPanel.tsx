import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { CONSTELLATIONS, CATEGORY_LABELS } from '@/data/constellations'
import { cn } from '@/lib/utils'
import type { ConstellationId, SatCategory, SatelliteRecord, SatellitePosition, TrackingMode, VesselRecord, FlightRecord } from '@/types'

const CATEGORY_ORDER: SatCategory[] = [
  'station', 'comms', 'nav', 'weather', 'earth-obs', 'scientific', 'military', 'amateur',
]

const VESSEL_TYPE_COLORS: Record<string, string> = {
  cargo: 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40',
  tanker: 'text-rose-400 border-rose-800/60 bg-rose-950/40',
  passenger: 'text-violet-400 border-violet-800/60 bg-violet-950/40',
  fishing: 'text-green-400 border-green-800/60 bg-green-950/40',
  military: 'text-red-400 border-red-800/60 bg-red-950/40',
  tug: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
  pleasure: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
  other: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/40',
}

const FLIGHT_TYPE_COLORS: Record<string, string> = {
  commercial: 'text-yellow-400 border-yellow-800/60 bg-yellow-950/40',
  cargo: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
  military: 'text-red-400 border-red-800/60 bg-red-950/40',
  private: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
  helicopter: 'text-green-400 border-green-800/60 bg-green-950/40',
  other: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/40',
}

interface LeftPanelProps {
  toggles: Map<ConstellationId, boolean>
  onToggle: (id: ConstellationId) => void
  getSatellites: (id: ConstellationId) => SatelliteRecord[]
  getPositions: (id: ConstellationId) => SatellitePosition[]
  version: number
  loading: Set<ConstellationId>
  selectedSatId: number | null
  onSelectSatellite: (noradId: number | null) => void
  trackingMode: TrackingMode
  onTrackingModeChange: (mode: TrackingMode) => void
  vessels: Map<number, VesselRecord>
  vesselCount: number
  vesselConnected: boolean
  vesselVersion: number
  selectedMmsi: number | null
  onSelectVessel: (mmsi: number | null) => void
  flights: Map<string, FlightRecord>
  flightCount: number
  flightConnected: boolean
  flightVersion: number
  selectedIcao: string | null
  onSelectFlight: (icao: string | null) => void
}

export function LeftPanel({
  toggles,
  onToggle,
  getSatellites,
  getPositions,
  version,
  loading,
  selectedSatId,
  onSelectSatellite,
  trackingMode,
  onTrackingModeChange,
  vessels,
  vesselCount,
  vesselConnected,
  vesselVersion,
  selectedMmsi,
  onSelectVessel,
  flights,
  flightCount,
  flightConnected,
  flightVersion,
  selectedIcao,
  onSelectFlight,
}: LeftPanelProps) {
  const [query, setQuery] = useState('')
  const [vesselQuery, setVesselQuery] = useState('')
  const [flightQuery, setFlightQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<SatCategory>>(new Set(['station', 'nav']))
  const [expandedConstellations, setExpandedConstellations] = useState<Set<ConstellationId>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState<SatCategory | 'all'>('all')

  // Compute stats
  const stats = useMemo(() => {
    let tracked = 0
    let visible = 0
    let constellations = 0
    for (const c of CONSTELLATIONS) {
      const sats = getSatellites(c.id)
      tracked += sats.length
      if (toggles.get(c.id)) {
        visible += sats.length
        constellations++
      }
    }
    return { tracked, visible, constellations }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, toggles, getSatellites])

  const toggleCategoryExpand = (cat: SatCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  const toggleConstellationExpand = (id: ConstellationId) => {
    setExpandedConstellations(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const groupedConstellations = useMemo(() => {
    const map = new Map<SatCategory, typeof CONSTELLATIONS>()
    for (const cat of CATEGORY_ORDER) {
      const consts = CONSTELLATIONS.filter(c => c.category === cat)
      if (categoryFilter !== 'all' && cat !== categoryFilter) continue
      if (consts.length > 0) map.set(cat, consts)
    }
    return map
  }, [categoryFilter])

  // Vessel list (sorted by last update, filtered by search)
  const filteredVessels = useMemo(() => {
    void vesselVersion // react dependency
    const arr = Array.from(vessels.values())
    const sorted = arr.sort((a, b) => b.lastUpdate - a.lastUpdate)
    if (!vesselQuery) return sorted
    const q = vesselQuery.toLowerCase()
    return sorted.filter(v =>
      v.name.toLowerCase().includes(q) ||
      String(v.mmsi).includes(q)
    )
  }, [vessels, vesselQuery, vesselVersion])

  const avgSpeed = useMemo(() => {
    void vesselVersion
    if (vessels.size === 0) return 0
    let sum = 0
    for (const v of vessels.values()) sum += v.speed
    return sum / vessels.size
  }, [vessels, vesselVersion])

  // Flight list (sorted by callsign, filtered by search)
  const filteredFlights = useMemo(() => {
    void flightVersion
    const arr = Array.from(flights.values())
    const sorted = arr.sort((a, b) => a.callsign.localeCompare(b.callsign))
    if (!flightQuery) return sorted
    const q = flightQuery.toLowerCase()
    return sorted.filter(f =>
      f.callsign.toLowerCase().includes(q) ||
      f.icao24.toLowerCase().includes(q) ||
      f.originCountry.toLowerCase().includes(q)
    )
  }, [flights, flightQuery, flightVersion])

  const avgAltitude = useMemo(() => {
    void flightVersion
    if (flights.size === 0) return 0
    let sum = 0
    for (const f of flights.values()) sum += f.altitude
    return sum / flights.size
  }, [flights, flightVersion])

  return (
    <aside className="fixed top-[46px] left-0 bottom-[34px] w-64 bg-zinc-900 border-r border-zinc-800 z-40 flex flex-col overflow-hidden">

      {/* Mode tabs */}
      <div className="flex border-b border-zinc-800 flex-shrink-0">
        {(['satellites', 'maritime', 'flights'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => onTrackingModeChange(mode)}
            className={cn(
              'flex-1 font-display text-[12px] font-semibold tracking-[2px] uppercase py-2 border-b-2 transition-all',
              trackingMode === mode
                ? mode === 'maritime' ? 'text-cyan-400 border-b-cyan-500'
                  : mode === 'flights' ? 'text-yellow-400 border-b-yellow-500'
                  : 'text-orange-400 border-b-orange-500'
                : 'text-zinc-600 border-b-transparent hover:text-zinc-400',
            )}
          >
            {mode === 'satellites' ? 'SAT' : mode === 'maritime' ? 'AIS' : 'ADS-B'}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[12px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">
          {trackingMode === 'satellites' ? 'Satellites' : trackingMode === 'maritime' ? 'Vessels' : 'Flights'}
        </span>
        <Badge variant="default">{trackingMode === 'satellites' ? stats.tracked : trackingMode === 'maritime' ? vesselCount : flightCount}</Badge>
      </div>

      {trackingMode === 'flights' ? (
        <>
          {/* Flight metrics grid */}
          <div className="grid grid-cols-2 border-b border-zinc-800 flex-shrink-0">
            {[
              { val: flightCount, label: 'Tracked', color: 'text-zinc-50' },
              { val: flightConnected ? 'LIVE' : 'OFFLINE', label: 'Status', color: flightConnected ? 'text-green-400' : 'text-red-400' },
              { val: `${Math.round(avgAltitude * 3.28084 / 100)}`, label: 'Avg FL', color: 'text-yellow-400' },
              { val: 'OpenSky', label: 'Source', color: 'text-blue-400' },
            ].map(({ val, label, color }, i) => (
              <div
                key={label}
                className={cn(
                  'p-2.5 border-zinc-800',
                  i % 2 === 0 ? 'border-r' : '',
                  i < 2 ? 'border-b' : '',
                )}
              >
                <div className={cn('font-display text-xl font-semibold leading-none mb-1', color)}>
                  {val}
                </div>
                <div className="text-[13px] font-medium tracking-[1.5px] text-zinc-600 uppercase">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Flight search */}
          <div className="px-2.5 pt-2.5 pb-2 border-b border-zinc-800 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={flightQuery}
                onChange={e => setFlightQuery(e.target.value)}
                placeholder="Search callsign, ICAO, country..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-50 text-[13px] pl-7 pr-2.5 py-1.5 rounded-sm outline-none placeholder-zinc-700 focus:border-yellow-800 transition-colors"
              />
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
                <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Flight list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {filteredFlights.slice(0, 200).map(flight => {
              const isSelected = flight.icao24 === selectedIcao
              return (
                <button
                  key={flight.icao24}
                  onClick={() => onSelectFlight(isSelected ? null : flight.icao24)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3.5 py-1.5 text-left border-b border-zinc-800/30 transition-colors',
                    isSelected ? 'bg-yellow-950/20 border-l-2 border-l-yellow-500' : 'hover:bg-zinc-800/30',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] text-zinc-400 truncate">{flight.callsign}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] text-zinc-600">{flight.icao24.toUpperCase()}</span>
                      <span className={cn(
                        'font-display text-[10px] font-semibold tracking-[0.5px] uppercase px-1 py-px rounded-sm border',
                        FLIGHT_TYPE_COLORS[flight.type] || FLIGHT_TYPE_COLORS.other,
                      )}>
                        {flight.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="font-mono text-[12px] text-zinc-600">FL{Math.round(flight.altitude * 3.28084 / 100)}</span>
                    <span className="font-mono text-[12px] text-zinc-600">{flight.heading.toFixed(0)}°</span>
                  </div>
                </button>
              )
            })}
            {filteredFlights.length > 200 && (
              <div className="px-3.5 py-1.5 font-mono text-[13px] text-zinc-600">
                +{filteredFlights.length - 200} more...
              </div>
            )}
            {filteredFlights.length === 0 && flightCount === 0 && (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-[13px] text-zinc-600">
                  {flightConnected ? 'Waiting for flight data...' : 'Connecting to ADS-B...'}
                </p>
              </div>
            )}
          </div>
        </>
      ) : trackingMode === 'maritime' ? (
        <>
          {/* Maritime metrics grid */}
          <div className="grid grid-cols-2 border-b border-zinc-800 flex-shrink-0">
            {[
              { val: vesselCount, label: 'Tracked', color: 'text-zinc-50' },
              { val: vesselConnected ? 'LIVE' : 'OFFLINE', label: 'Status', color: vesselConnected ? 'text-green-400' : 'text-red-400' },
              { val: `${avgSpeed.toFixed(1)}`, label: 'Avg SOG (kn)', color: 'text-cyan-400' },
              { val: 'AISStream', label: 'Source', color: 'text-blue-400' },
            ].map(({ val, label, color }, i) => (
              <div
                key={label}
                className={cn(
                  'p-2.5 border-zinc-800',
                  i % 2 === 0 ? 'border-r' : '',
                  i < 2 ? 'border-b' : '',
                )}
              >
                <div className={cn('font-display text-xl font-semibold leading-none mb-1', color)}>
                  {val}
                </div>
                <div className="text-[13px] font-medium tracking-[1.5px] text-zinc-600 uppercase">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Vessel search */}
          <div className="px-2.5 pt-2.5 pb-2 border-b border-zinc-800 flex-shrink-0">
            <div className="relative">
              <input
                type="text"
                value={vesselQuery}
                onChange={e => setVesselQuery(e.target.value)}
                placeholder="Search by name or MMSI..."
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-50 text-[13px] pl-7 pr-2.5 py-1.5 rounded-sm outline-none placeholder-zinc-700 focus:border-cyan-800 transition-colors"
              />
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" width="11" height="11" viewBox="0 0 11 11" fill="none">
                <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
                <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Vessel list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {filteredVessels.slice(0, 200).map(vessel => {
              const isSelected = vessel.mmsi === selectedMmsi
              return (
                <button
                  key={vessel.mmsi}
                  onClick={() => onSelectVessel(isSelected ? null : vessel.mmsi)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3.5 py-1.5 text-left border-b border-zinc-800/30 transition-colors',
                    isSelected ? 'bg-cyan-950/20 border-l-2 border-l-cyan-500' : 'hover:bg-zinc-800/30',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[12px] text-zinc-400 truncate">{vessel.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-[11px] text-zinc-600">{vessel.mmsi}</span>
                      <span className={cn(
                        'font-display text-[10px] font-semibold tracking-[0.5px] uppercase px-1 py-px rounded-sm border',
                        VESSEL_TYPE_COLORS[vessel.type] || VESSEL_TYPE_COLORS.other,
                      )}>
                        {vessel.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="font-mono text-[12px] text-zinc-600">{vessel.speed.toFixed(1)} kn</span>
                    <span className="font-mono text-[12px] text-zinc-600">{vessel.course.toFixed(0)}°</span>
                  </div>
                </button>
              )
            })}
            {filteredVessels.length > 200 && (
              <div className="px-3.5 py-1.5 font-mono text-[13px] text-zinc-600">
                +{filteredVessels.length - 200} more...
              </div>
            )}
            {filteredVessels.length === 0 && vesselCount === 0 && (
              <div className="flex-1 flex items-center justify-center py-12">
                <p className="text-[13px] text-zinc-600">
                  {vesselConnected ? 'Waiting for vessel data...' : 'Connecting to AIS...'}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
      <>
      {/* Metrics grid */}
      <div className="grid grid-cols-2 border-b border-zinc-800 flex-shrink-0">
        {[
          { val: stats.tracked, label: 'Tracked', color: 'text-zinc-50' },
          { val: stats.visible, label: 'Visible', color: 'text-green-400' },
          { val: stats.constellations, label: 'Constellations', color: 'text-orange-400' },
          { val: 'CelesTrak', label: 'Source', color: 'text-blue-400' },
        ].map(({ val, label, color }, i) => (
          <div
            key={label}
            className={cn(
              'p-2.5 border-zinc-800',
              i % 2 === 0 ? 'border-r' : '',
              i < 2 ? 'border-b' : '',
            )}
          >
            <div className={cn('font-display text-xl font-semibold leading-none mb-1', color)}>
              {val}
            </div>
            <div className="text-[13px] font-medium tracking-[1.5px] text-zinc-600 uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-2.5 pt-2.5 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or NORAD ID…"
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-50 text-[13px] pl-7 pr-2.5 py-1.5 rounded-sm outline-none placeholder-zinc-700 focus:border-orange-800 transition-colors"
          />
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
            <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1 px-2.5 py-2 border-b border-zinc-800 flex-shrink-0 flex-wrap">
        {(['all', ...CATEGORY_ORDER] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'font-display text-[13px] font-medium tracking-[1px] uppercase px-2 py-0.5 border rounded-sm transition-all',
              categoryFilter === cat
                ? 'text-orange-400 border-orange-800/60 bg-orange-950/40'
                : 'text-zinc-600 border-zinc-700 hover:text-zinc-400 hover:border-zinc-600',
            )}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat].split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Constellation groups */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {Array.from(groupedConstellations.entries()).map(([cat, consts]) => {
          const isExpanded = expandedCategories.has(cat)
          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggleCategoryExpand(cat)}
                className="w-full flex items-center gap-2 px-3.5 py-2 border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors"
              >
                <span className="text-[13px] text-zinc-600">{isExpanded ? '▾' : '▸'}</span>
                <span className="font-display text-[12px] font-semibold tracking-[2px] text-zinc-500 uppercase flex-1 text-left">
                  {CATEGORY_LABELS[cat]}
                </span>
                <span className="font-mono text-[13px] text-zinc-600">{consts.length}</span>
              </button>

              {isExpanded && consts.map(c => {
                const isOn = toggles.get(c.id) ?? false
                const isLoading = loading.has(c.id)
                const sats = getSatellites(c.id)
                const isConstExpanded = expandedConstellations.has(c.id)
                const colorHex = `#${c.color.toString(16).padStart(6, '0')}`

                // Filter satellites by search query
                const filteredSats = query
                  ? sats.filter(s =>
                    s.name.toLowerCase().includes(query.toLowerCase()) ||
                    String(s.noradId).includes(query)
                  )
                  : sats

                return (
                  <div key={c.id}>
                    {/* Constellation header */}
                    <div className="flex items-center border-b border-zinc-800/40">
                      <button
                        onClick={() => isOn && sats.length > 0 && toggleConstellationExpand(c.id)}
                        className={cn(
                          'flex-1 flex items-center gap-2 pl-6 pr-1 py-1.5 text-left transition-colors',
                          isOn ? 'hover:bg-zinc-800/30' : '',
                        )}
                      >
                        <span
                          className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: isOn ? colorHex : '#3f3f46' }}
                        />
                        <span className={cn(
                          'font-display text-[13px] font-medium tracking-wide flex-1 truncate',
                          isOn ? 'text-zinc-300' : 'text-zinc-600',
                        )}>
                          {c.name}
                        </span>
                        {isLoading && <span className="text-[12px] text-zinc-600 animate-pulse">loading</span>}
                        {!isLoading && sats.length > 0 && (
                          <span className="font-mono text-[13px] text-zinc-600">{sats.length}</span>
                        )}
                        {isOn && sats.length > 0 && (
                          <span className="text-[13px] text-zinc-600">{isConstExpanded ? '▾' : '▸'}</span>
                        )}
                      </button>
                      {/* Toggle checkbox */}
                      <button
                        onClick={() => onToggle(c.id)}
                        className="px-2 py-1.5 flex-shrink-0"
                      >
                        <span className={cn(
                          'inline-block w-3 h-3 rounded-sm border transition-all',
                          isOn ? 'border-current' : 'border-zinc-600',
                        )} style={isOn ? { backgroundColor: colorHex, borderColor: colorHex } : undefined}>
                          {isOn && (
                            <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
                              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Satellite list */}
                    {isConstExpanded && isOn && filteredSats.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                        {filteredSats.slice(0, 100).map(sat => {
                          const pos = getPositions(c.id).find(p => p.noradId === sat.noradId)
                          const isSelected = sat.noradId === selectedSatId
                          return (
                            <button
                              key={sat.noradId}
                              onClick={() => onSelectSatellite(isSelected ? null : sat.noradId)}
                              className={cn(
                                'w-full flex items-center gap-2 pl-8 pr-3 py-1 text-left border-b border-zinc-800/30 transition-colors',
                                isSelected ? 'bg-orange-950/20 border-l-2 border-l-orange-500' : 'hover:bg-zinc-800/30',
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-[12px] text-zinc-400 truncate">{sat.name}</div>
                                <div className="font-mono text-[12px] text-zinc-600">{sat.noradId}</div>
                              </div>
                              {pos && (
                                <div className="flex flex-col items-end flex-shrink-0">
                                  <span className="font-mono text-[12px] text-zinc-600">{pos.alt.toFixed(0)} km</span>
                                  <span className="font-mono text-[12px] text-zinc-600">{pos.velocity.toFixed(1)} km/s</span>
                                </div>
                              )}
                            </button>
                          )
                        })}
                        {filteredSats.length > 100 && (
                          <div className="px-8 py-1.5 font-mono text-[13px] text-zinc-600">
                            +{filteredSats.length - 100} more…
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      </>
      )}
    </aside>
  )
}
