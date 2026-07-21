import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { FLIGHT_TYPES, FLIGHT_TYPE_LABELS } from '@/types'
import type { FlightRecord } from '@/types'
import { useFlightStore } from '@/stores/flight-store'
import { useSelectionStore } from '@/stores/selection-store'
import { MasterToggle, TypeToggle } from './shared'
import { PipelineError } from '@/components/ui/PipelineError'
import type { FlightType } from '@/types'

export function AircraftSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { flights, version, connected, count, typeToggles, toggleType, enableAllTypes, disableAllTypes } = useFlightStore()
  const { selectedIcao, selectFlight } = useSelectionStore()

  const [expandedTypes, setExpandedTypes] = useState<Set<FlightType>>(new Set())

  const toggleTypeExpand = (type: FlightType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  const flightsByType = useMemo(() => {
    void version
    const counts = new Map<FlightType, FlightRecord[]>()
    for (const t of FLIGHT_TYPES) counts.set(t, [])
    for (const f of flights.values()) {
      const arr = counts.get(f.type)
      if (arr) arr.push(f)
    }
    return counts
  }, [flights, version])

  const allOn = useMemo(() => [...typeToggles.values()].every(v => v), [typeToggles])
  const noneOn = useMemo(() => [...typeToggles.values()].every(v => !v), [typeToggles])

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="flex min-h-10 w-full items-center gap-2 border-b border-line-muted px-3.5 transition-colors hover:bg-panel-raised"
      >
        <span className="text-[11px] text-muted-foreground" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="neo-kicker flex-1 text-left text-domain-flight">Aircraft</span>
        <PipelineError errors={!connected ? ['ADS-B feed disconnected'] : []} />
        <span className={cn('neo-data text-[9px] uppercase', connected ? 'text-success' : 'text-danger')}>{connected ? 'Live' : 'Off'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        <MasterToggle
          allOn={allOn}
          noneOn={noneOn}
          onToggle={() => allOn ? disableAllTypes() : enableAllTypes()}
        />
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {FLIGHT_TYPES.map(type => {
            const typeFlights = flightsByType.get(type) ?? []
            const isOn = typeToggles.get(type) ?? true
            const isExpanded = expandedTypes.has(type)
            const dotColor = 'var(--domain-flight)'

            const filtered = typeFlights.sort((a, b) => a.callsign.localeCompare(b.callsign))

            return (
              <div key={type}>
                <div className="flex items-center border-b border-line-muted">
                  <button
                    onClick={() => isOn && typeFlights.length > 0 && toggleTypeExpand(type)}
                    className={cn(
                      'flex min-h-9 flex-1 items-center gap-2 py-1 pl-4 pr-1 text-left transition-colors',
                      isOn ? 'hover:bg-panel-raised' : '',
                    )}
                  >
                    <span className="inline-block size-2 flex-shrink-0 border border-domain-flight" style={{ backgroundColor: isOn ? dotColor : 'transparent' }} />
                    <span className={cn('flex-1 font-mono text-xs', isOn ? 'text-foreground' : 'text-muted-foreground')}>
                      {FLIGHT_TYPE_LABELS[type]}
                    </span>
                    <span className="neo-data text-[11px] text-muted-foreground">{typeFlights.length}</span>
                    {isOn && typeFlights.length > 0 && <span className="text-[11px] text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>}
                  </button>
                  <TypeToggle on={isOn} color={dotColor} label={FLIGHT_TYPE_LABELS[type]} onClick={() => toggleType(type)} />
                </div>

                {isExpanded && isOn && filtered.length > 0 && (
                  <div className="neo-scrollbar max-h-[200px] overflow-y-auto">
                    {filtered.slice(0, 200).map(flight => {
                      const isSelected = flight.icao24 === selectedIcao
                      return (
                        <button
                          key={flight.icao24}
                          onClick={() => selectFlight(isSelected ? null : flight.icao24)}
                          className={cn(
                            'flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1 pl-7 pr-3 text-left transition-colors',
                            isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-mono text-[11px]">{flight.callsign}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn('neo-data text-[10px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{flight.icao24.toUpperCase()}</span>
                              <span className={cn('border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider', isSelected ? 'border-signal-foreground/50' : 'border-domain-flight text-domain-flight')}>
                                {flight.type}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>FL{Math.round(flight.altitude * 3.28084 / 100)}</span>
                            <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{flight.heading.toFixed(0)}°</span>
                          </div>
                        </button>
                      )
                    })}
                    {filtered.length > 200 && (
                      <div className="px-7 py-2 font-mono text-[11px] text-muted-foreground">+{filtered.length - 200} more...</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
