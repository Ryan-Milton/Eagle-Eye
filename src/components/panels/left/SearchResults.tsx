import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CONSTELLATIONS } from '@/data/constellations'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useSelectionStore } from '@/stores/selection-store'

export function SearchResults({ query }: { query: string }) {
  const { toggles, version: satVersion, getPositions, getSatellites } = useSatelliteStore()
  const { vessels, version: vesselVersion } = useVesselStore()
  const { flights, version: flightVersion } = useFlightStore()
  const { events: weatherEvents, version: weatherVersion } = useWeatherStore()
  const { events: newsEvents, version: newsVersion } = useNewsStore()
  const { events: conflictEvents, version: conflictVersion } = useConflictStore()
  const { events: cyberEvents, version: cyberVersion } = useCyberStore()
  const { selectedSatId, selectSatellite, selectedMmsi, selectVessel, selectedIcao, selectFlight, selectedEventId, selectEvent, selectedNewsId, selectNews, selectedConflictId, selectConflict, selectedCyberId, selectCyber } = useSelectionStore()

  const searchResults = useMemo(() => {
    const q = query.toLowerCase()

    const matchedSats: { sat: ReturnType<typeof getSatellites>[number]; constellation: typeof CONSTELLATIONS[number]; pos: ReturnType<typeof getPositions>[number] | undefined }[] = []
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

    const matchedVessels = [...vessels.values()]
      .filter(v => v.name.toLowerCase().includes(q) || String(v.mmsi).includes(q) || v.type.toLowerCase().includes(q))
      .sort((a, b) => b.lastUpdate - a.lastUpdate)

    const matchedFlights = [...flights.values()]
      .filter(f => f.callsign.toLowerCase().includes(q) || f.icao24.toLowerCase().includes(q) || f.originCountry.toLowerCase().includes(q) || f.type.toLowerCase().includes(q))
      .sort((a, b) => a.callsign.localeCompare(b.callsign))

    const matchedEvents = [...weatherEvents.values()]
      .filter(e => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.source.toLowerCase().includes(q))
      .sort((a, b) => b.time - a.time)

    const matchedNews = [...newsEvents.values()]
      .filter(e => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.source.toLowerCase().includes(q))
      .sort((a, b) => b.time - a.time)

    const matchedConflicts = [...conflictEvents.values()]
      .filter(e => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.actors.some(a => a.toLowerCase().includes(q)))
      .sort((a, b) => b.time - a.time)

    const matchedCyber = [...cyberEvents.values()]
      .filter(e => e.title.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || (e.ip && e.ip.includes(q)))
      .sort((a, b) => b.time - a.time)

    return { sats: matchedSats, vessels: matchedVessels, flights: matchedFlights, events: matchedEvents, news: matchedNews, conflicts: matchedConflicts, cyber: matchedCyber }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, satVersion, toggles, getSatellites, getPositions, vessels, vesselVersion, flights, flightVersion, weatherEvents, weatherVersion, newsEvents, newsVersion, conflictEvents, conflictVersion, cyberEvents, cyberVersion])

  const totalResults = searchResults.sats.length + searchResults.vessels.length + searchResults.flights.length + searchResults.events.length + searchResults.news.length + searchResults.conflicts.length + searchResults.cyber.length

  return (
    <div>
      <div className="flex-shrink-0 border-b border-line-muted px-3.5 py-2">
        <span className="neo-data text-[11px] text-muted-foreground">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
      </div>

      {/* Satellite results */}
      {searchResults.sats.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-satellite">Satellites</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.sats.length}</span>
          </div>
          {searchResults.sats.slice(0, 100).map(({ sat, constellation, pos }) => {
            const isSelected = sat.noradId === selectedSatId
            return (
              <button
                key={sat.noradId}
                onClick={() => selectSatellite(isSelected ? null : sat.noradId)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <span className="inline-block size-2 flex-shrink-0 border border-domain-satellite bg-domain-satellite" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{sat.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('neo-data text-[10px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{sat.noradId}</span>
                    <span className={cn('font-mono text-[10px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{constellation.name}</span>
                  </div>
                </div>
                {pos && (
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{pos.alt.toFixed(0)} km</span>
                  </div>
                )}
              </button>
            )
          })}
          {searchResults.sats.length > 100 && (
            <div className="px-3.5 py-2 font-mono text-[11px] text-muted-foreground">+{searchResults.sats.length - 100} more...</div>
          )}
        </div>
      )}

      {/* Vessel results */}
      {searchResults.vessels.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-vessel">Maritime</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.vessels.length}</span>
          </div>
          {searchResults.vessels.slice(0, 200).map(vessel => {
            const isSelected = vessel.mmsi === selectedMmsi
            return (
              <button
                key={vessel.mmsi}
                onClick={() => selectVessel(isSelected ? null : vessel.mmsi)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{vessel.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('neo-data text-[10px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{vessel.mmsi}</span>
                    <span className={cn(
                      'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                      isSelected ? 'border-signal-foreground/50' : 'border-domain-vessel text-domain-vessel',
                    )}>
                      {vessel.type}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{vessel.speed.toFixed(1)} kn</span>
                </div>
              </button>
            )
          })}
          {searchResults.vessels.length > 200 && (
            <div className="px-3.5 py-2 font-mono text-[11px] text-muted-foreground">+{searchResults.vessels.length - 200} more...</div>
          )}
        </div>
      )}

      {/* Flight results */}
      {searchResults.flights.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-flight">Aircraft</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.flights.length}</span>
          </div>
          {searchResults.flights.slice(0, 200).map(flight => {
            const isSelected = flight.icao24 === selectedIcao
            return (
              <button
                key={flight.icao24}
                onClick={() => selectFlight(isSelected ? null : flight.icao24)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{flight.callsign}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('neo-data text-[10px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{flight.icao24.toUpperCase()}</span>
                    <span className={cn(
                      'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                      isSelected ? 'border-signal-foreground/50' : 'border-domain-flight text-domain-flight',
                    )}>
                      {flight.type}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>FL{Math.round(flight.altitude * 3.28084 / 100)}</span>
                </div>
              </button>
            )
          })}
          {searchResults.flights.length > 200 && (
            <div className="px-3.5 py-2 font-mono text-[11px] text-muted-foreground">+{searchResults.flights.length - 200} more...</div>
          )}
        </div>
      )}

      {/* Weather event results */}
      {searchResults.events.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-weather">Weather & Events</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.events.length}</span>
          </div>
          {searchResults.events.slice(0, 200).map(event => {
            const isSelected = event.id === selectedEventId
            return (
              <button
                key={event.id}
                onClick={() => selectEvent(isSelected ? null : event.id)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <span className="inline-block size-2 flex-shrink-0 border border-domain-weather bg-domain-weather" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{event.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <SourceBadge source={event.source} />
                    <span className={cn(
                      'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                      isSelected ? 'border-signal-foreground/50' : 'border-domain-weather text-domain-weather',
                    )}>
                      {event.type}
                    </span>
                  </div>
                </div>
                {event.magnitude !== null && (
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>M{event.magnitude.toFixed(1)}</span>
                  </div>
                )}
              </button>
            )
          })}
          {searchResults.events.length > 200 && (
            <div className="px-3.5 py-2 font-mono text-[11px] text-muted-foreground">+{searchResults.events.length - 200} more...</div>
          )}
        </div>
      )}

      {/* News results */}
      {searchResults.news.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-news">News</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.news.length}</span>
          </div>
          {searchResults.news.slice(0, 200).map(event => {
            const isSelected = event.id === selectedNewsId
            return (
              <button
                key={event.id}
                onClick={() => selectNews(isSelected ? null : event.id)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <span className="inline-block size-2 flex-shrink-0 border border-domain-news bg-domain-news" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{event.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                      isSelected ? 'border-signal-foreground/50' : 'border-domain-news text-domain-news',
                    )}>
                      {event.category}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Conflict results */}
      {searchResults.conflicts.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-conflict">Conflicts</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.conflicts.length}</span>
          </div>
          {searchResults.conflicts.slice(0, 200).map(event => {
            const isSelected = event.id === selectedConflictId
            return (
              <button
                key={event.id}
                onClick={() => selectConflict(isSelected ? null : event.id)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <span className="inline-block size-2 flex-shrink-0 border border-domain-conflict bg-domain-conflict" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{event.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                      isSelected ? 'border-signal-foreground/50' : 'border-domain-conflict text-domain-conflict',
                    )}>
                      {event.type}
                    </span>
                    {event.fatalities > 0 && <span className="font-mono text-[10px] text-danger">{event.fatalities}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Cyber results */}
      {searchResults.cyber.length > 0 && (
        <div>
          <div className="border-b border-line-muted bg-background px-3.5 py-2">
            <span className="neo-kicker text-domain-cyber">Cyber Threats</span>
            <span className="neo-data ml-2 text-[11px] text-muted-foreground">{searchResults.cyber.length}</span>
          </div>
          {searchResults.cyber.slice(0, 200).map(event => {
            const isSelected = event.id === selectedCyberId
            return (
              <button
                key={event.id}
                onClick={() => selectCyber(isSelected ? null : event.id)}
                className={cn(
                  'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1 pl-3.5 pr-3 text-left transition-colors',
                  isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate font-mono text-[11px]">{event.title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn(
                      'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                      isSelected ? 'border-signal-foreground/50' : 'border-domain-cyber text-domain-cyber',
                    )}>
                      {event.type}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {totalResults === 0 && (
        <div className="flex items-center justify-center border-b border-line-muted bg-background px-4 py-8 text-center">
          <span className="font-mono text-xs text-muted-foreground">No results for &quot;{query}&quot;.</span>
        </div>
      )}
    </div>
  )
}
