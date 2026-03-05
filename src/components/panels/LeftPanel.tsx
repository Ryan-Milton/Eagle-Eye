import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { CONSTELLATIONS, CATEGORY_LABELS } from '@/data/constellations'
import { cn } from '@/lib/utils'
import { VESSEL_TYPES, VESSEL_TYPE_LABELS, FLIGHT_TYPES, FLIGHT_TYPE_LABELS } from '@/types'
import type { ConstellationId, SatCategory, SatelliteRecord, SatellitePosition, VesselRecord, VesselType, FlightRecord, FlightType } from '@/types'

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

const VESSEL_TYPE_DOT_COLORS: Record<string, string> = {
  cargo: '#22d3ee', tanker: '#fb7185', passenger: '#a78bfa', fishing: '#4ade80',
  military: '#f87171', tug: '#fbbf24', pleasure: '#60a5fa', other: '#a1a1aa',
}

const FLIGHT_TYPE_COLORS: Record<string, string> = {
  commercial: 'text-yellow-400 border-yellow-800/60 bg-yellow-950/40',
  cargo: 'text-amber-400 border-amber-800/60 bg-amber-950/40',
  military: 'text-red-400 border-red-800/60 bg-red-950/40',
  private: 'text-blue-400 border-blue-800/60 bg-blue-950/40',
  helicopter: 'text-green-400 border-green-800/60 bg-green-950/40',
  other: 'text-zinc-400 border-zinc-700/60 bg-zinc-800/40',
}

const FLIGHT_TYPE_DOT_COLORS: Record<string, string> = {
  commercial: '#facc15', cargo: '#f59e0b', military: '#f87171',
  private: '#60a5fa', helicopter: '#4ade80', other: '#a1a1aa',
}

type SectionId = 'satellites' | 'maritime' | 'aircraft'

interface LeftPanelProps {
  toggles: Map<ConstellationId, boolean>
  onToggle: (id: ConstellationId) => void
  onEnableAllConstellations: () => void
  onDisableAllConstellations: () => void
  getSatellites: (id: ConstellationId) => SatelliteRecord[]
  getPositions: (id: ConstellationId) => SatellitePosition[]
  version: number
  loading: Set<ConstellationId>
  selectedSatId: number | null
  onSelectSatellite: (noradId: number | null) => void
  vessels: Map<number, VesselRecord>
  vesselCount: number
  vesselConnected: boolean
  vesselVersion: number
  selectedMmsi: number | null
  onSelectVessel: (mmsi: number | null) => void
  vesselTypeToggles: Map<VesselType, boolean>
  onToggleVesselType: (type: VesselType) => void
  onEnableAllVesselTypes: () => void
  onDisableAllVesselTypes: () => void
  flights: Map<string, FlightRecord>
  flightCount: number
  flightConnected: boolean
  flightVersion: number
  selectedIcao: string | null
  onSelectFlight: (icao: string | null) => void
  flightTypeToggles: Map<FlightType, boolean>
  onToggleFlightType: (type: FlightType) => void
  onEnableAllFlightTypes: () => void
  onDisableAllFlightTypes: () => void
}

function MasterToggle({ allOn, noneOn, onToggle }: { allOn: boolean; noneOn: boolean; onToggle: () => void }) {
  const indeterminate = !allOn && !noneOn
  return (
    <button onClick={e => { e.stopPropagation(); onToggle() }} className="px-2 py-1.5 flex-shrink-0">
      <span className={cn(
        'inline-flex items-center justify-center w-3 h-3 rounded-sm border transition-all',
        allOn ? 'bg-orange-500 border-orange-500' : indeterminate ? 'bg-zinc-600 border-zinc-600' : 'border-zinc-600',
      )}>
        {allOn && (
          <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {indeterminate && (
          <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
            <line x1="3" y1="6" x2="9" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </button>
  )
}

function SearchInput({ value, onChange, placeholder, focusColor }: { value: string; onChange: (v: string) => void; placeholder: string; focusColor: string }) {
  return (
    <div className="px-2.5 pt-2 pb-1.5 flex-shrink-0">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn('w-full bg-zinc-800 border border-zinc-700 text-zinc-50 text-[12px] pl-7 pr-2.5 py-1 rounded-sm outline-none placeholder-zinc-700 transition-colors', focusColor)}
        />
        <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
          <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

function TypeToggle({ on, color, onClick }: { on: boolean; color: string; onClick: () => void }) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick() }} className="px-2 py-1.5 flex-shrink-0">
      <span className={cn(
        'inline-block w-3 h-3 rounded-sm border transition-all',
        on ? 'border-current' : 'border-zinc-600',
      )} style={on ? { backgroundColor: color, borderColor: color } : undefined}>
        {on && (
          <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function LeftPanel({
  toggles,
  onToggle,
  onEnableAllConstellations,
  onDisableAllConstellations,
  getSatellites,
  getPositions,
  version,
  loading,
  selectedSatId,
  onSelectSatellite,
  vessels,
  vesselCount,
  vesselConnected,
  vesselVersion,
  selectedMmsi,
  onSelectVessel,
  vesselTypeToggles,
  onToggleVesselType,
  onEnableAllVesselTypes,
  onDisableAllVesselTypes,
  flights,
  flightCount,
  flightConnected,
  flightVersion,
  selectedIcao,
  onSelectFlight,
  flightTypeToggles,
  onToggleFlightType,
  onEnableAllFlightTypes,
  onDisableAllFlightTypes,
}: LeftPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set())
  const [globalQuery, setGlobalQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<SatCategory>>(new Set())
  const [expandedConstellations, setExpandedConstellations] = useState<Set<ConstellationId>>(new Set())
  const [expandedVesselTypes, setExpandedVesselTypes] = useState<Set<VesselType>>(new Set())
  const [expandedFlightTypes, setExpandedFlightTypes] = useState<Set<FlightType>>(new Set())

  const toggleSection = (id: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

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

  const toggleVesselTypeExpand = (type: VesselType) => {
    setExpandedVesselTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  const toggleFlightTypeExpand = (type: FlightType) => {
    setExpandedFlightTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  // Satellite stats
  const satStats = useMemo(() => {
    let tracked = 0, visible = 0, constellations = 0
    for (const c of CONSTELLATIONS) {
      const sats = getSatellites(c.id)
      tracked += sats.length
      if (toggles.get(c.id)) { visible += sats.length; constellations++ }
    }
    return { tracked, visible, constellations }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, toggles, getSatellites])

  const allConstellationsOn = useMemo(() => [...toggles.values()].every(v => v), [toggles])
  const noConstellationsOn = useMemo(() => [...toggles.values()].every(v => !v), [toggles])

  // Vessel counts by type
  const vesselsByType = useMemo(() => {
    void vesselVersion
    const counts = new Map<VesselType, VesselRecord[]>()
    for (const t of VESSEL_TYPES) counts.set(t, [])
    for (const v of vessels.values()) {
      const arr = counts.get(v.type)
      if (arr) arr.push(v)
    }
    return counts
  }, [vessels, vesselVersion])

  const allVesselTypesOn = useMemo(() => [...vesselTypeToggles.values()].every(v => v), [vesselTypeToggles])
  const noVesselTypesOn = useMemo(() => [...vesselTypeToggles.values()].every(v => !v), [vesselTypeToggles])

  // Flight counts by type
  const flightsByType = useMemo(() => {
    void flightVersion
    const counts = new Map<FlightType, FlightRecord[]>()
    for (const t of FLIGHT_TYPES) counts.set(t, [])
    for (const f of flights.values()) {
      const arr = counts.get(f.type)
      if (arr) arr.push(f)
    }
    return counts
  }, [flights, flightVersion])

  const allFlightTypesOn = useMemo(() => [...flightTypeToggles.values()].every(v => v), [flightTypeToggles])
  const noFlightTypesOn = useMemo(() => [...flightTypeToggles.values()].every(v => !v), [flightTypeToggles])

  // Grouped constellations
  const groupedConstellations = useMemo(() => {
    const map = new Map<SatCategory, typeof CONSTELLATIONS>()
    for (const cat of CATEGORY_ORDER) {
      const consts = CONSTELLATIONS.filter(c => c.category === cat)
      if (consts.length > 0) map.set(cat, consts)
    }
    return map
  }, [])

  // Global search results
  const isSearching = globalQuery.length > 0
  const searchResults = useMemo(() => {
    if (!isSearching) return null
    const q = globalQuery.toLowerCase()

    // Search satellites
    const matchedSats: { sat: SatelliteRecord; constellation: typeof CONSTELLATIONS[number]; pos: SatellitePosition | undefined }[] = []
    for (const c of CONSTELLATIONS) {
      if (!toggles.get(c.id)) continue
      const sats = getSatellites(c.id)
      const positions = getPositions(c.id)
      for (const sat of sats) {
        if (sat.name.toLowerCase().includes(q) || String(sat.noradId).includes(q)) {
          matchedSats.push({ sat, constellation: c, pos: positions.find(p => p.noradId === sat.noradId) })
        }
      }
    }

    // Search vessels
    const matchedVessels: VesselRecord[] = []
    for (const v of vessels.values()) {
      if (v.name.toLowerCase().includes(q) || String(v.mmsi).includes(q) || v.type.toLowerCase().includes(q)) {
        matchedVessels.push(v)
      }
    }
    matchedVessels.sort((a, b) => b.lastUpdate - a.lastUpdate)

    // Search flights
    const matchedFlights: FlightRecord[] = []
    for (const f of flights.values()) {
      if (f.callsign.toLowerCase().includes(q) || f.icao24.toLowerCase().includes(q) || f.originCountry.toLowerCase().includes(q) || f.type.toLowerCase().includes(q)) {
        matchedFlights.push(f)
      }
    }
    matchedFlights.sort((a, b) => a.callsign.localeCompare(b.callsign))

    return { sats: matchedSats, vessels: matchedVessels, flights: matchedFlights }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalQuery, isSearching, version, toggles, getSatellites, getPositions, vessels, vesselVersion, flights, flightVersion])

  const totalResults = searchResults ? searchResults.sats.length + searchResults.vessels.length + searchResults.flights.length : 0

  return (
    <aside className="fixed top-[46px] left-0 bottom-[34px] w-64 bg-zinc-900 border-r border-zinc-800 z-40 flex flex-col overflow-hidden">
      {/* Panel title */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[12px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">Tracking</span>
      </div>

      {/* Global search */}
      <SearchInput value={globalQuery} onChange={setGlobalQuery} placeholder="Search all entities..." focusColor="focus:border-orange-800" />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">

      {isSearching && searchResults ? (
        /* ── SEARCH RESULTS VIEW ── */
        <div>
          <div className="px-3.5 py-1.5 border-b border-zinc-800 flex-shrink-0">
            <span className="font-mono text-[11px] text-zinc-500">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          </div>

          {/* Satellite results */}
          {searchResults.sats.length > 0 && (
            <div>
              <div className="px-3.5 py-1.5 border-b border-zinc-800/60">
                <span className="font-display text-[11px] font-semibold tracking-[1.5px] text-orange-400/70 uppercase">Satellites</span>
                <span className="font-mono text-[11px] text-zinc-600 ml-2">{searchResults.sats.length}</span>
              </div>
              {searchResults.sats.slice(0, 100).map(({ sat, constellation, pos }) => {
                const isSelected = sat.noradId === selectedSatId
                const colorHex = `#${constellation.color.toString(16).padStart(6, '0')}`
                return (
                  <button
                    key={sat.noradId}
                    onClick={() => onSelectSatellite(isSelected ? null : sat.noradId)}
                    className={cn(
                      'w-full flex items-center gap-2 pl-3.5 pr-3 py-1 text-left border-b border-zinc-800/20 transition-colors',
                      isSelected ? 'bg-orange-950/20 border-l-2 border-l-orange-500' : 'hover:bg-zinc-800/30',
                    )}
                  >
                    <span className="inline-block w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] text-zinc-400 truncate">{sat.name}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-zinc-600">{sat.noradId}</span>
                        <span className="font-mono text-[10px] text-zinc-700">{constellation.name}</span>
                      </div>
                    </div>
                    {pos && (
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="font-mono text-[11px] text-zinc-600">{pos.alt.toFixed(0)} km</span>
                      </div>
                    )}
                  </button>
                )
              })}
              {searchResults.sats.length > 100 && (
                <div className="px-3.5 py-1 font-mono text-[11px] text-zinc-600">+{searchResults.sats.length - 100} more...</div>
              )}
            </div>
          )}

          {/* Vessel results */}
          {searchResults.vessels.length > 0 && (
            <div>
              <div className="px-3.5 py-1.5 border-b border-zinc-800/60">
                <span className="font-display text-[11px] font-semibold tracking-[1.5px] text-cyan-400/70 uppercase">Maritime</span>
                <span className="font-mono text-[11px] text-zinc-600 ml-2">{searchResults.vessels.length}</span>
              </div>
              {searchResults.vessels.slice(0, 200).map(vessel => {
                const isSelected = vessel.mmsi === selectedMmsi
                return (
                  <button
                    key={vessel.mmsi}
                    onClick={() => onSelectVessel(isSelected ? null : vessel.mmsi)}
                    className={cn(
                      'w-full flex items-center gap-2 pl-3.5 pr-3 py-1 text-left border-b border-zinc-800/20 transition-colors',
                      isSelected ? 'bg-cyan-950/20 border-l-2 border-l-cyan-500' : 'hover:bg-zinc-800/30',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] text-zinc-400 truncate">{vessel.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-zinc-600">{vessel.mmsi}</span>
                        <span className={cn(
                          'font-display text-[9px] font-semibold tracking-[0.5px] uppercase px-1 py-px rounded-sm border',
                          VESSEL_TYPE_COLORS[vessel.type] || VESSEL_TYPE_COLORS.other,
                        )}>
                          {vessel.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="font-mono text-[11px] text-zinc-600">{vessel.speed.toFixed(1)} kn</span>
                    </div>
                  </button>
                )
              })}
              {searchResults.vessels.length > 200 && (
                <div className="px-3.5 py-1 font-mono text-[11px] text-zinc-600">+{searchResults.vessels.length - 200} more...</div>
              )}
            </div>
          )}

          {/* Flight results */}
          {searchResults.flights.length > 0 && (
            <div>
              <div className="px-3.5 py-1.5 border-b border-zinc-800/60">
                <span className="font-display text-[11px] font-semibold tracking-[1.5px] text-yellow-400/70 uppercase">Aircraft</span>
                <span className="font-mono text-[11px] text-zinc-600 ml-2">{searchResults.flights.length}</span>
              </div>
              {searchResults.flights.slice(0, 200).map(flight => {
                const isSelected = flight.icao24 === selectedIcao
                return (
                  <button
                    key={flight.icao24}
                    onClick={() => onSelectFlight(isSelected ? null : flight.icao24)}
                    className={cn(
                      'w-full flex items-center gap-2 pl-3.5 pr-3 py-1 text-left border-b border-zinc-800/20 transition-colors',
                      isSelected ? 'bg-yellow-950/20 border-l-2 border-l-yellow-500' : 'hover:bg-zinc-800/30',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] text-zinc-400 truncate">{flight.callsign}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-zinc-600">{flight.icao24.toUpperCase()}</span>
                        <span className={cn(
                          'font-display text-[9px] font-semibold tracking-[0.5px] uppercase px-1 py-px rounded-sm border',
                          FLIGHT_TYPE_COLORS[flight.type] || FLIGHT_TYPE_COLORS.other,
                        )}>
                          {flight.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="font-mono text-[11px] text-zinc-600">FL{Math.round(flight.altitude * 3.28084 / 100)}</span>
                    </div>
                  </button>
                )
              })}
              {searchResults.flights.length > 200 && (
                <div className="px-3.5 py-1 font-mono text-[11px] text-zinc-600">+{searchResults.flights.length - 200} more...</div>
              )}
            </div>
          )}

          {totalResults === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-[12px] text-zinc-600">No results for "{globalQuery}"</span>
            </div>
          )}
        </div>
      ) : (
        /* ── ACCORDION VIEW ── */
        <>

        {/* ── SATELLITE SECTION ── */}
        <div>
          <button
            onClick={() => toggleSection('satellites')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="text-[11px] text-zinc-600">{expandedSections.has('satellites') ? '▾' : '▸'}</span>
            <span className="font-display text-[12px] font-semibold tracking-[2px] text-orange-400 uppercase flex-1 text-left">Satellite</span>
            <span className="font-mono text-[11px] text-zinc-500">{satStats.visible}/{satStats.tracked}</span>
            <MasterToggle
              allOn={allConstellationsOn}
              noneOn={noConstellationsOn}
              onToggle={() => allConstellationsOn ? onDisableAllConstellations() : onEnableAllConstellations()}
            />
          </button>

          {expandedSections.has('satellites') && (
            <div className="border-b border-zinc-800">
              {Array.from(groupedConstellations.entries()).map(([cat, consts]) => {
                const isExpanded = expandedCategories.has(cat)
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategoryExpand(cat)}
                      className="w-full flex items-center gap-2 px-3.5 py-1.5 border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors"
                    >
                      <span className="text-[11px] text-zinc-600">{isExpanded ? '▾' : '▸'}</span>
                      <span className="font-display text-[11px] font-semibold tracking-[1.5px] text-zinc-500 uppercase flex-1 text-left">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-600">{consts.length}</span>
                    </button>

                    {isExpanded && consts.map(c => {
                      const isOn = toggles.get(c.id) ?? false
                      const isLoading = loading.has(c.id)
                      const sats = getSatellites(c.id)
                      const isConstExpanded = expandedConstellations.has(c.id)
                      const colorHex = `#${c.color.toString(16).padStart(6, '0')}`

                      const filteredSats = sats

                      return (
                        <div key={c.id}>
                          <div className="flex items-center border-b border-zinc-800/30">
                            <button
                              onClick={() => isOn && sats.length > 0 && toggleConstellationExpand(c.id)}
                              className={cn(
                                'flex-1 flex items-center gap-2 pl-6 pr-1 py-1 text-left transition-colors',
                                isOn ? 'hover:bg-zinc-800/30' : '',
                              )}
                            >
                              <span className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: isOn ? colorHex : '#3f3f46' }} />
                              <span className={cn('font-display text-[12px] font-medium tracking-wide flex-1 truncate', isOn ? 'text-zinc-300' : 'text-zinc-600')}>
                                {c.name}
                              </span>
                              {isLoading && <span className="text-[11px] text-zinc-600 animate-pulse">loading</span>}
                              {!isLoading && sats.length > 0 && <span className="font-mono text-[11px] text-zinc-600">{sats.length}</span>}
                              {isOn && sats.length > 0 && <span className="text-[11px] text-zinc-600">{isConstExpanded ? '▾' : '▸'}</span>}
                            </button>
                            <TypeToggle on={isOn} color={colorHex} onClick={() => onToggle(c.id)} />
                          </div>

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
                                      'w-full flex items-center gap-2 pl-8 pr-3 py-1 text-left border-b border-zinc-800/20 transition-colors',
                                      isSelected ? 'bg-orange-950/20 border-l-2 border-l-orange-500' : 'hover:bg-zinc-800/30',
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-mono text-[11px] text-zinc-400 truncate">{sat.name}</div>
                                      <div className="font-mono text-[11px] text-zinc-600">{sat.noradId}</div>
                                    </div>
                                    {pos && (
                                      <div className="flex flex-col items-end flex-shrink-0">
                                        <span className="font-mono text-[11px] text-zinc-600">{pos.alt.toFixed(0)} km</span>
                                        <span className="font-mono text-[11px] text-zinc-600">{pos.velocity.toFixed(1)} km/s</span>
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                              {filteredSats.length > 100 && (
                                <div className="px-8 py-1 font-mono text-[11px] text-zinc-600">+{filteredSats.length - 100} more...</div>
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
          )}
        </div>

        {/* ── MARITIME SECTION ── */}
        <div>
          <button
            onClick={() => toggleSection('maritime')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="text-[11px] text-zinc-600">{expandedSections.has('maritime') ? '▾' : '▸'}</span>
            <span className="font-display text-[12px] font-semibold tracking-[2px] text-cyan-400 uppercase flex-1 text-left">Maritime</span>
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', vesselConnected ? 'bg-green-400' : 'bg-red-400')} />
            <span className="font-mono text-[11px] text-zinc-500">{vesselCount}</span>
            <MasterToggle
              allOn={allVesselTypesOn}
              noneOn={noVesselTypesOn}
              onToggle={() => allVesselTypesOn ? onDisableAllVesselTypes() : onEnableAllVesselTypes()}
            />
          </button>

          {expandedSections.has('maritime') && (
            <div className="border-b border-zinc-800">
              {VESSEL_TYPES.map(type => {
                const typeVessels = vesselsByType.get(type) ?? []
                const isOn = vesselTypeToggles.get(type) ?? true
                const isExpanded = expandedVesselTypes.has(type)
                const dotColor = VESSEL_TYPE_DOT_COLORS[type] ?? '#a1a1aa'

                const filtered = typeVessels.sort((a, b) => b.lastUpdate - a.lastUpdate)

                return (
                  <div key={type}>
                    <div className="flex items-center border-b border-zinc-800/40">
                      <button
                        onClick={() => isOn && typeVessels.length > 0 && toggleVesselTypeExpand(type)}
                        className={cn(
                          'flex-1 flex items-center gap-2 pl-4 pr-1 py-1.5 text-left transition-colors',
                          isOn ? 'hover:bg-zinc-800/30' : '',
                        )}
                      >
                        <span className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: isOn ? dotColor : '#3f3f46' }} />
                        <span className={cn('font-display text-[12px] font-medium tracking-wide flex-1', isOn ? 'text-zinc-300' : 'text-zinc-600')}>
                          {VESSEL_TYPE_LABELS[type]}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-600">{typeVessels.length}</span>
                        {isOn && typeVessels.length > 0 && <span className="text-[11px] text-zinc-600">{isExpanded ? '▾' : '▸'}</span>}
                      </button>
                      <TypeToggle on={isOn} color={dotColor} onClick={() => onToggleVesselType(type)} />
                    </div>

                    {isExpanded && isOn && filtered.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                        {filtered.slice(0, 200).map(vessel => {
                          const isSelected = vessel.mmsi === selectedMmsi
                          return (
                            <button
                              key={vessel.mmsi}
                              onClick={() => onSelectVessel(isSelected ? null : vessel.mmsi)}
                              className={cn(
                                'w-full flex items-center gap-2 pl-7 pr-3 py-1 text-left border-b border-zinc-800/20 transition-colors',
                                isSelected ? 'bg-cyan-950/20 border-l-2 border-l-cyan-500' : 'hover:bg-zinc-800/30',
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-[11px] text-zinc-400 truncate">{vessel.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-zinc-600">{vessel.mmsi}</span>
                                  <span className={cn(
                                    'font-display text-[9px] font-semibold tracking-[0.5px] uppercase px-1 py-px rounded-sm border',
                                    VESSEL_TYPE_COLORS[vessel.type] || VESSEL_TYPE_COLORS.other,
                                  )}>
                                    {vessel.type}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className="font-mono text-[11px] text-zinc-600">{vessel.speed.toFixed(1)} kn</span>
                                <span className="font-mono text-[11px] text-zinc-600">{vessel.course.toFixed(0)}°</span>
                              </div>
                            </button>
                          )
                        })}
                        {filtered.length > 200 && (
                          <div className="px-7 py-1 font-mono text-[11px] text-zinc-600">+{filtered.length - 200} more...</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── AIRCRAFT SECTION ── */}
        <div>
          <button
            onClick={() => toggleSection('aircraft')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
          >
            <span className="text-[11px] text-zinc-600">{expandedSections.has('aircraft') ? '▾' : '▸'}</span>
            <span className="font-display text-[12px] font-semibold tracking-[2px] text-yellow-400 uppercase flex-1 text-left">Aircraft</span>
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', flightConnected ? 'bg-green-400' : 'bg-red-400')} />
            <span className="font-mono text-[11px] text-zinc-500">{flightCount}</span>
            <MasterToggle
              allOn={allFlightTypesOn}
              noneOn={noFlightTypesOn}
              onToggle={() => allFlightTypesOn ? onDisableAllFlightTypes() : onEnableAllFlightTypes()}
            />
          </button>

          {expandedSections.has('aircraft') && (
            <div className="border-b border-zinc-800">
              {FLIGHT_TYPES.map(type => {
                const typeFlights = flightsByType.get(type) ?? []
                const isOn = flightTypeToggles.get(type) ?? true
                const isExpanded = expandedFlightTypes.has(type)
                const dotColor = FLIGHT_TYPE_DOT_COLORS[type] ?? '#a1a1aa'

                const filtered = typeFlights.sort((a, b) => a.callsign.localeCompare(b.callsign))

                return (
                  <div key={type}>
                    <div className="flex items-center border-b border-zinc-800/40">
                      <button
                        onClick={() => isOn && typeFlights.length > 0 && toggleFlightTypeExpand(type)}
                        className={cn(
                          'flex-1 flex items-center gap-2 pl-4 pr-1 py-1.5 text-left transition-colors',
                          isOn ? 'hover:bg-zinc-800/30' : '',
                        )}
                      >
                        <span className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ backgroundColor: isOn ? dotColor : '#3f3f46' }} />
                        <span className={cn('font-display text-[12px] font-medium tracking-wide flex-1', isOn ? 'text-zinc-300' : 'text-zinc-600')}>
                          {FLIGHT_TYPE_LABELS[type]}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-600">{typeFlights.length}</span>
                        {isOn && typeFlights.length > 0 && <span className="text-[11px] text-zinc-600">{isExpanded ? '▾' : '▸'}</span>}
                      </button>
                      <TypeToggle on={isOn} color={dotColor} onClick={() => onToggleFlightType(type)} />
                    </div>

                    {isExpanded && isOn && filtered.length > 0 && (
                      <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
                        {filtered.slice(0, 200).map(flight => {
                          const isSelected = flight.icao24 === selectedIcao
                          return (
                            <button
                              key={flight.icao24}
                              onClick={() => onSelectFlight(isSelected ? null : flight.icao24)}
                              className={cn(
                                'w-full flex items-center gap-2 pl-7 pr-3 py-1 text-left border-b border-zinc-800/20 transition-colors',
                                isSelected ? 'bg-yellow-950/20 border-l-2 border-l-yellow-500' : 'hover:bg-zinc-800/30',
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-mono text-[11px] text-zinc-400 truncate">{flight.callsign}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-zinc-600">{flight.icao24.toUpperCase()}</span>
                                  <span className={cn(
                                    'font-display text-[9px] font-semibold tracking-[0.5px] uppercase px-1 py-px rounded-sm border',
                                    FLIGHT_TYPE_COLORS[flight.type] || FLIGHT_TYPE_COLORS.other,
                                  )}>
                                    {flight.type}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className="font-mono text-[11px] text-zinc-600">FL{Math.round(flight.altitude * 3.28084 / 100)}</span>
                                <span className="font-mono text-[11px] text-zinc-600">{flight.heading.toFixed(0)}°</span>
                              </div>
                            </button>
                          )
                        })}
                        {filtered.length > 200 && (
                          <div className="px-7 py-1 font-mono text-[11px] text-zinc-600">+{filtered.length - 200} more...</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        </>
      )}
      </div>
    </aside>
  )
}
