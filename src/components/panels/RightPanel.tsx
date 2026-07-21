import { useState, useRef, useEffect, useMemo } from 'react'
import { CONSTELLATIONS } from '@/data/constellations'
import { cn } from '@/lib/utils'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useRFStore } from '@/stores/rf-store'
import { useAlertStore } from '@/stores/alert-store'
import { AlertRuleEditor, AlertRuleList } from '@/components/ui/AlertRuleEditor'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { useIncidents } from '@/hooks/useIncidents'
import { useOsintStore } from '@/stores/osint-store'
import { OsintModal } from '@/components/ui/OsintModal'
import type { OsintPost } from '@/lib/osint-client'
import { useSelectionStore } from '@/stores/selection-store'
import { useWatchlistStore } from '@/stores/watchlist-store'
import { useFlightInfo } from '@/hooks/useFlightInfo'
import { useNow } from '@/hooks/useNow'
import { findNearbyEntities, type CorrelatedEntity } from '@/lib/correlation'
import type { HexdbFlightInfo } from '@/lib/hexdb'
import type { SatelliteRecord, SatellitePosition, VesselRecord, FlightRecord, ConstellationMeta, WeatherEvent, NewsEvent, ConflictEvent, CyberEvent, RFSpot } from '@/types'
import type { SanctionMatch } from '@/lib/sanctions-client'

const NAV_STATUS_LABELS: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  15: 'Undefined',
}

const DOMAIN_COLORS_MAP: Record<string, string> = {
  vessel: 'text-domain-vessel',
  flight: 'text-domain-flight',
  weather: 'text-domain-weather',
  news: 'text-domain-news',
  conflict: 'text-domain-conflict',
  cyber: 'text-domain-cyber',
  satellite: 'text-domain-satellite',
}

export function RightPanel() {
  const { selectedSatId, selectedMmsi, selectedIcao, selectedEventId, selectedNewsId, selectedConflictId, selectedCyberId, selectedRFId } = useSelectionStore()
  const { getSatellites, getPositions, toggles, version: satVersion } = useSatelliteStore()
  const { vessels, version: vesselVersion } = useVesselStore()
  const { flights, version: flightVersion } = useFlightStore()
  const { events, version: weatherVersion } = useWeatherStore()
  const { events: newsEvents, version: newsVersion } = useNewsStore()
  const { events: conflictEvents, version: conflictVersion } = useConflictStore()
  const { events: cyberEvents, version: cyberVersion } = useCyberStore()
  const { spots: rfSpots, version: rfVersion } = useRFStore()

  // Derive selected records
  void vesselVersion
  void flightVersion
  void weatherVersion
  void newsVersion
  void conflictVersion
  void cyberVersion
  void rfVersion
  const selectedVessel = selectedMmsi ? vessels.get(selectedMmsi) ?? null : null
  const selectedFlight = selectedIcao ? flights.get(selectedIcao) ?? null : null
  const selectedEvent = selectedEventId ? events.get(selectedEventId) ?? null : null
  const selectedNews = selectedNewsId ? newsEvents.get(selectedNewsId) ?? null : null
  const selectedConflict = selectedConflictId ? conflictEvents.get(selectedConflictId) ?? null : null
  const selectedCyber = selectedCyberId ? cyberEvents.get(selectedCyberId) ?? null : null
  const selectedRF = selectedRFId ? rfSpots.get(selectedRFId) ?? null : null

  const { satellite: selectedSatellite, position: selectedPosition } = useMemo(() => {
    if (!selectedSatId) return { satellite: null, position: null }
    const allSats = [...toggles.keys()].flatMap(id => getSatellites(id))
    const satellite = allSats.find(s => s.noradId === selectedSatId) ?? null
    let position = null
    for (const id of toggles.keys()) {
      const pos = getPositions(id).find(p => p.noradId === selectedSatId)
      if (pos) { position = pos; break }
    }
    return { satellite, position }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSatId, satVersion, toggles])

  const { info: flightInfo, loading: flightInfoLoading } = useFlightInfo(
    selectedIcao,
    selectedFlight?.callsign ?? null,
  )

  const constellation = selectedSatellite
    ? CONSTELLATIONS.find(c => c.id === selectedSatellite.constellationId) ?? null
    : null
  const epochAgeRef = useRef<number | null>(null)
  useEffect(() => {
    if (!selectedSatellite) { epochAgeRef.current = null; return }
    epochAgeRef.current = Math.round((Date.now() - selectedSatellite.epoch.getTime()) / (1000 * 60 * 60))
  }, [selectedSatellite])
  const epochAge = epochAgeRef.current

  // Determine entity ID + lat/lon for watchlist and nearby
  const selectedEntityId = selectedRF ? `rf-${selectedRF.id}`
    : selectedCyber ? `cyber-${selectedCyber.id}`
    : selectedConflict ? `conflict-${selectedConflict.id}`
    : selectedNews ? `news-${selectedNews.id}`
    : selectedEvent ? `weather-${selectedEvent.id}`
    : selectedFlight ? `flight-${selectedFlight.icao24}`
    : selectedVessel ? `vessel-${selectedVessel.mmsi}`
    : selectedSatellite ? `sat-${selectedSatellite.noradId}`
    : null

  const selectedLat = selectedRF?.rxLat ?? selectedCyber?.lat ?? selectedConflict?.lat ?? selectedNews?.lat ?? selectedEvent?.lat ?? selectedFlight?.lat ?? selectedVessel?.lat ?? selectedPosition?.lat ?? null
  const selectedLon = selectedRF?.rxLon ?? selectedCyber?.lon ?? selectedConflict?.lon ?? selectedNews?.lon ?? selectedEvent?.lon ?? selectedFlight?.lon ?? selectedVessel?.lon ?? selectedPosition?.lon ?? null

  // Watchlist
  const isWatched = useWatchlistStore(s => selectedEntityId ? s.watchlist.has(selectedEntityId) : false)
  const toggleWatch = useWatchlistStore(s => s.toggle)

  // Nearby entities (50km radius)
  const nearby = useMemo(() => {
    if (selectedLat == null || selectedLon == null || !selectedEntityId) return []
    const sources = [
      { domain: 'vessel', entities: [...vessels.values()].map(v => ({ id: `vessel-${v.mmsi}`, name: v.name || String(v.mmsi), lat: v.lat, lon: v.lon })) },
      { domain: 'flight', entities: [...flights.values()].map(f => ({ id: `flight-${f.icao24}`, name: f.callsign, lat: f.lat, lon: f.lon })) },
      { domain: 'weather', entities: [...events.values()].map(e => ({ id: `weather-${e.id}`, name: e.title, lat: e.lat, lon: e.lon })) },
      { domain: 'news', entities: [...newsEvents.values()].map(e => ({ id: `news-${e.id}`, name: e.title, lat: e.lat, lon: e.lon })) },
      { domain: 'conflict', entities: [...conflictEvents.values()].map(e => ({ id: `conflict-${e.id}`, name: e.title, lat: e.lat, lon: e.lon })) },
      { domain: 'cyber', entities: [...cyberEvents.values()].map(e => ({ id: `cyber-${e.id}`, name: e.title, lat: e.lat, lon: e.lon })) },
    ]
    return findNearbyEntities(selectedLat, selectedLon, 50, selectedEntityId, sources).slice(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId, selectedLat, selectedLon, vesselVersion, flightVersion, weatherVersion, newsVersion, conflictVersion, cyberVersion])

  // Determine panel title
  let panelTitle = 'Entity Detail'
  if (selectedRF) panelTitle = 'RF Signal'
  else if (selectedCyber) panelTitle = 'Cyber Threat'
  else if (selectedConflict) panelTitle = 'Conflict Event'
  else if (selectedNews) panelTitle = 'News Event'
  else if (selectedEvent) panelTitle = 'Weather Event'
  else if (selectedFlight) panelTitle = 'Flight Detail'
  else if (selectedVessel) panelTitle = 'Vessel Detail'
  else if (selectedSatellite) panelTitle = 'Satellite Detail'

  const hasSelection = selectedSatellite || selectedVessel || selectedFlight || selectedEvent || selectedNews || selectedConflict || selectedCyber || selectedRF

  // Entity selected by ID but data not yet resolved (e.g. alert clicked during data refresh)
  const hasSelectionId = selectedSatId !== null || selectedMmsi !== null || selectedIcao !== null || selectedEventId !== null || selectedNewsId !== null || selectedConflictId !== null || selectedCyberId !== null || selectedRFId !== null
  const selectionPending = hasSelectionId && !hasSelection

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-line bg-panel">

      {/* Header */}
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-line px-3.5">
        <span className="neo-kicker text-muted-foreground">
          {hasSelection ? panelTitle : selectionPending ? 'Loading Entity...' : 'Intelligence Feed'}
        </span>
        {selectedEntityId && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleWatch(selectedEntityId)}
                  aria-label={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                  aria-pressed={isWatched}
                  className={cn('grid size-9 place-items-center border font-mono text-sm transition-colors', isWatched ? 'border-signal bg-signal text-signal-foreground' : 'border-line-muted bg-background text-muted-foreground hover:border-line hover:text-foreground')}
                >
                  {isWatched ? '★' : '☆'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{isWatched ? 'Remove from watchlist' : 'Add to watchlist'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {selectedRF ? (
        <RFDetail spot={selectedRF} nearby={nearby} />
      ) : selectedCyber ? (
        <CyberDetail event={selectedCyber} nearby={nearby} />
      ) : selectedConflict ? (
        <ConflictDetail event={selectedConflict} nearby={nearby} />
      ) : selectedNews ? (
        <NewsDetail event={selectedNews} nearby={nearby} />
      ) : selectedEvent ? (
        <WeatherEventDetail event={selectedEvent} nearby={nearby} />
      ) : selectedFlight ? (
        <FlightDetail flight={selectedFlight} flightInfo={flightInfo} flightInfoLoading={flightInfoLoading} nearby={nearby} />
      ) : selectedVessel ? (
        <VesselDetail vessel={selectedVessel} nearby={nearby} />
      ) : selectedSatellite ? (
        <SatelliteDetail satellite={selectedSatellite} position={selectedPosition} constellation={constellation} epochAge={epochAge} nearby={nearby} />
      ) : selectionPending ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-3 inline-block size-5 border-2 border-line-muted border-t-signal motion-safe:animate-spin" aria-hidden="true" />
            <p className="font-mono text-[11px] text-muted-foreground">Loading entity data...</p>
          </div>
        </div>
      ) : (
        <IntelligenceFeed />
      )}
    </aside>
  )
}

function IntelligenceFeed() {
  const alerts = useAlertStore(s => s.alerts)
  const unackCount = useAlertStore(s => s.unacknowledgedCount)
  const acknowledge = useAlertStore(s => s.acknowledge)
  const acknowledgeAll = useAlertStore(s => s.acknowledgeAll)
  const { posts, platformToggles, version, count } = useOsintStore()
  const { selectEvent, selectConflict, selectCyber, selectVessel, selectFlight } = useSelectionStore()
  const [osintModalPost, setOsintModalPost] = useState<OsintPost | null>(null)
  const [showRuleEditor, setShowRuleEditor] = useState(false)
  const incidents = useIncidents()

  const severityColor = (sev: string) => {
    if (sev === 'critical') return 'text-danger border-l-danger'
    if (sev === 'warning') return 'text-warning border-l-warning'
    return 'text-info border-l-info'
  }

  const sortedPosts = useMemo(() => {
    void version
    return [...posts.values()]
      .filter(p => platformToggles.get(p.platform) !== false)
      .sort((a, b) => b.time - a.time)
      .slice(0, 50)
  }, [version, posts, platformToggles])

  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      {/* Alerts section */}
      <div className="border-b border-line">
        <div className="flex min-h-10 items-center justify-between border-b border-line-muted px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="neo-kicker text-muted-foreground">Alerts</span>
            {unackCount > 0 && (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center border border-danger bg-danger px-1 font-mono text-[8px] font-bold text-background" aria-label={`${unackCount} unacknowledged alerts`}>
                {unackCount > 99 ? '99' : unackCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button onClick={acknowledgeAll} className="min-h-9 border border-transparent px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:border-line-muted hover:text-foreground">Ack All</button>
            )}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowRuleEditor(prev => !prev)}
                    aria-label="Add alert rule"
                    aria-expanded={showRuleEditor}
                    className="grid size-9 place-items-center border border-line-muted bg-background font-mono text-sm leading-none text-muted-foreground transition-colors hover:bg-signal hover:text-signal-foreground"
                  >
                    +
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add Alert Rule</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {showRuleEditor && (
          <div className="border-b border-line-muted p-3">
            <AlertRuleEditor onClose={() => setShowRuleEditor(false)} />
          </div>
        )}
        {alerts.length === 0 ? (
          <div className="bg-background py-6 text-center">
            <p className="font-mono text-[11px] text-muted-foreground">No alerts.</p>
          </div>
        ) : (
          alerts.map(a => (
            <button
              key={a.id}
              onClick={() => {
                if (!a.acknowledged) acknowledge(a.id)
                if (a.entityId) {
                  switch (a.domain) {
                    case 'weather': selectEvent(a.entityId); break
                    case 'conflict': selectConflict(a.entityId); break
                    case 'cyber': selectCyber(a.entityId); break
                    case 'vessel': selectVessel(Number(a.entityId)); break
                    case 'flight': selectFlight(a.entityId); break
                  }
                }
              }}
              className={cn(
                'w-full border-b border-l-2 border-b-line-muted px-3.5 py-2 text-left transition-colors',
                severityColor(a.severity),
                a.acknowledged ? 'opacity-40' : 'hover:bg-panel-raised',
              )}
            >
              <div className="font-mono text-[11px] font-medium">{a.title}</div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{a.description}</div>
              <div className="mt-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                {a.domain} — {new Date(a.time).toISOString().slice(11, 19)}Z
              </div>
            </button>
          ))
        )}
        <AlertRuleList />
      </div>

      {/* Correlated incidents section */}
      {incidents.length > 0 && (
        <div className="border-b border-line">
          <div className="flex min-h-10 items-center gap-2 border-b border-line-muted px-3.5 py-2">
            <span className="neo-kicker text-warning">Incidents</span>
            <span className="neo-data text-[10px] text-muted-foreground">{incidents.length}</span>
          </div>
          {incidents.slice(0, 10).map(inc => (
            <div
              key={inc.id}
              className="border-b border-line-muted px-3.5 py-2 transition-colors hover:bg-panel-raised"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-medium text-foreground">
                  {inc.events.length} events correlated
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {inc.sourceCount} sources
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {inc.domains.map(d => (
                  <span
                    key={d}
                    className={cn(
                      'border bg-background px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider',
                      d === 'conflict' ? 'border-domain-conflict text-domain-conflict'
                        : d === 'weather' ? 'border-domain-weather text-domain-weather'
                        : d === 'cyber' ? 'border-domain-cyber text-domain-cyber'
                        : d === 'news' ? 'border-domain-news text-domain-news'
                        : 'border-line-muted text-muted-foreground',
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-1 space-y-0.5">
                {inc.events.slice(0, 3).map(e => (
                  <div key={`${e.domain}-${e.id}`} className="truncate font-mono text-[10px] text-muted-foreground">
                    {e.title}
                  </div>
                ))}
                {inc.events.length > 3 && (
                  <div className="font-mono text-[10px] text-muted-foreground">+{inc.events.length - 3} more</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OSINT feed section */}
      <div>
        <div className="flex min-h-10 items-center gap-2 border-b border-line-muted px-3.5 py-2">
          <span className="neo-kicker text-domain-osint">OSINT</span>
          <span className="neo-data text-[10px] text-muted-foreground">{count}</span>
        </div>
        {sortedPosts.length === 0 ? (
          <div className="bg-background py-6 text-center">
            <p className={cn('font-mono text-[11px] text-muted-foreground', count === 0 && 'motion-safe:animate-pulse-signal')}>{count === 0 ? 'Loading OSINT...' : 'No geolocated posts.'}</p>
          </div>
        ) : (
          sortedPosts.map(post => (
            <button
              key={post.id}
              onClick={() => setOsintModalPost(post)}
              className="block min-h-10 w-full border-b border-line-muted px-3.5 py-2 text-left transition-colors hover:bg-panel-raised"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={cn(
                  'border border-domain-osint px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-domain-osint',
                )}>
                  {post.platform.slice(0, 3)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{post.author}</span>
                <span className="ml-auto font-mono text-[9px] text-muted-foreground">{post.locationName}</span>
              </div>
              <div className="truncate font-mono text-[11px] text-foreground">{post.text}</div>
              <div className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                {new Date(post.time).toISOString().slice(11, 19)}Z
              </div>
            </button>
          ))
        )}
      </div>
      <OsintModal post={osintModalPost} onClose={() => setOsintModalPost(null)} />
    </div>
  )
}

function NearbyEntities({ nearby }: { nearby: CorrelatedEntity[] }) {
  if (nearby.length === 0) return null
  return (
    <div className="border-b border-line-muted px-3.5 py-3">
      <div className="neo-kicker mb-2 text-muted-foreground">Nearby Entities</div>
      <div className="space-y-1.5">
        {nearby.map(e => (
          <div key={e.id} className="flex items-center gap-2">
            <span className={cn('w-7 font-mono text-[10px] uppercase', DOMAIN_COLORS_MAP[e.domain] ?? 'text-muted-foreground')}>
              {e.domain.slice(0, 3)}
            </span>
            <span className="flex-1 truncate font-mono text-[11px] text-foreground">{e.name}</span>
            <span className="neo-data text-[10px] text-muted-foreground">{e.distance.toFixed(0)}km</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NewsDetail({ event, nearby }: { event: NewsEvent; nearby: CorrelatedEntity[] }) {
  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{event.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <SourceBadge source={event.source} />
          <span className={cn(
            'border border-domain-news bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-news',
          )}>{event.category}</span>
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(event.lat).toFixed(4)}°${event.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(event.lon).toFixed(4)}°${event.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Analysis</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Tone" value={event.tone.toFixed(1)} warn={event.tone < -5} />
          <DetailRow label="Articles" value={String(event.articleCount)} />
          <DetailRow label="Time" value={new Date(event.time).toISOString().slice(0, 16).replace('T', ' ') + 'Z'} />
        </div>
      </div>

      {event.url && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <a href={event.url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[11px] text-signal underline decoration-line-muted underline-offset-4 hover:decoration-signal">
            View source article
          </a>
        </div>
      )}

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function ConflictDetail({ event, nearby }: { event: ConflictEvent; nearby: CorrelatedEntity[] }) {
  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{event.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <SourceBadge source={event.source} />
          <span className={cn(
            'border border-domain-conflict bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-conflict',
          )}>{event.type}</span>
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(event.lat).toFixed(4)}°${event.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(event.lon).toFixed(4)}°${event.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Details</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Fatalities" value={String(event.fatalities)} warn={event.fatalities > 0} />
          <DetailRow label="Event Time" value={new Date(event.time).toISOString().slice(0, 16).replace('T', ' ') + 'Z'} />
        </div>
      </div>

      {event.actors.length > 0 && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Actors</div>
          {event.actors.map((actor, i) => (
            <div key={i} className="mt-1 font-mono text-[12px] text-foreground">{actor}</div>
          ))}
        </div>
      )}

      {event.description && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Description</div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">{event.description.slice(0, 500)}</p>
        </div>
      )}

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function CyberDetail({ event, nearby }: { event: CyberEvent; nearby: CorrelatedEntity[] }) {
  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{event.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <SourceBadge source={event.source} />
          <span className={cn(
            'border border-domain-cyber bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-cyber',
          )}>{event.type}</span>
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(event.lat).toFixed(4)}°${event.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(event.lon).toFixed(4)}°${event.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Threat Details</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Severity" value={`${event.severity}/10`} warn={event.severity >= 7} />
          {event.ip && <DetailRow label="IP Address" value={event.ip} />}
          <DetailRow label="Event Time" value={new Date(event.time).toISOString().slice(0, 16).replace('T', ' ') + 'Z'} />
        </div>
      </div>

      {event.description && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Description</div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">{event.description.slice(0, 500)}</p>
        </div>
      )}

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function RFDetail({ spot, nearby }: { spot: RFSpot; nearby: CorrelatedEntity[] }) {
  const freqMHz = (spot.frequency / 1_000_000).toFixed(3)
  const band = spot.frequency < 30_000_000 ? 'HF' : spot.frequency < 300_000_000 ? 'VHF' : 'UHF+'

  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{spot.txCall} → {spot.rxCall}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[12px] text-muted-foreground">{spot.mode}</span>
          <SourceBadge source={spot.source} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Signal</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Frequency" value={`${freqMHz} MHz`} />
          <DetailRow label="Band" value={band} />
          <DetailRow label="SNR" value={`${spot.snr} dB`} warn={spot.snr < 5} />
          <DetailRow label="Time" value={new Date(spot.time).toISOString().slice(11, 19) + 'Z'} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Transmitter</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Callsign" value={spot.txCall} />
          <DetailRow label="Latitude" value={spot.txLat !== 0 ? `${Math.abs(spot.txLat).toFixed(4)}°${spot.txLat >= 0 ? 'N' : 'S'}` : 'N/A'} />
          <DetailRow label="Longitude" value={spot.txLon !== 0 ? `${Math.abs(spot.txLon).toFixed(4)}°${spot.txLon >= 0 ? 'E' : 'W'}` : 'N/A'} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Receiver</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Callsign" value={spot.rxCall} />
          <DetailRow label="Latitude" value={spot.rxLat !== 0 ? `${Math.abs(spot.rxLat).toFixed(4)}°${spot.rxLat >= 0 ? 'N' : 'S'}` : 'N/A'} />
          <DetailRow label="Longitude" value={spot.rxLon !== 0 ? `${Math.abs(spot.rxLon).toFixed(4)}°${spot.rxLon >= 0 ? 'E' : 'W'}` : 'N/A'} />
        </div>
      </div>

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function WeatherEventDetail({ event, nearby }: { event: WeatherEvent; nearby: CorrelatedEntity[] }) {
  const now = useNow()
  const [conditions, setConditions] = useState<{
    current?: {
      temperature_2m?: number
      relative_humidity_2m?: number
      wind_speed_10m?: number
      wind_direction_10m?: number
      precipitation?: number
      surface_pressure?: number
    }
    current_units?: Record<string, string>
  } | null>(null)
  const [conditionsLoading, setConditionsLoading] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setConditions(null)
      setConditionsLoading(true)
    })
    fetch(`/api/weather/conditions?lat=${event.lat}&lon=${event.lon}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setConditions(data))
      .catch(() => setConditions(null))
      .finally(() => setConditionsLoading(false))
  }, [event.id, event.lat, event.lon])

  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{event.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <SourceBadge source={event.source} />
          <span className={cn(
            'border border-domain-weather bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-weather',
          )}>{event.type}</span>
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(event.lat).toFixed(4)}°${event.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(event.lon).toFixed(4)}°${event.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Event Details</div>
        <div className="grid grid-cols-2 gap-2">
          {event.magnitude !== null && (
            <DetailRow label="Magnitude" value={`M${event.magnitude.toFixed(1)}`} warn={event.magnitude >= 5.0} />
          )}
          <DetailRow label="Source" value={event.source.toUpperCase()} />
          <DetailRow label="Event Time" value={new Date(event.time).toISOString().slice(0, 16).replace('T', ' ') + 'Z'} />
          {event.expires && (
            <DetailRow
              label="Expires"
              value={new Date(event.expires).toISOString().slice(0, 16).replace('T', ' ') + 'Z'}
              warn={event.expires < now + 3600_000}
            />
          )}
          <DetailRow label="Last Update" value={new Date(event.lastUpdate).toISOString().slice(11, 19) + 'Z'} />
        </div>
      </div>

      {event.description && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Description</div>
          <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">{event.description.slice(0, 500)}</p>
        </div>
      )}

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Local Conditions</div>
        {conditionsLoading ? (
          <div className="font-mono text-[12px] text-muted-foreground motion-safe:animate-pulse-signal">Loading conditions...</div>
        ) : conditions?.current ? (
          <div className="grid grid-cols-2 gap-2">
            {conditions.current.temperature_2m != null && (
              <DetailRow label="Temperature" value={`${conditions.current.temperature_2m}${conditions.current_units?.temperature_2m ?? '°C'}`} />
            )}
            {conditions.current.relative_humidity_2m != null && (
              <DetailRow label="Humidity" value={`${conditions.current.relative_humidity_2m}%`} />
            )}
            {conditions.current.wind_speed_10m != null && (
              <DetailRow label="Wind Speed" value={`${conditions.current.wind_speed_10m} ${conditions.current_units?.wind_speed_10m ?? 'km/h'}`} />
            )}
            {conditions.current.wind_direction_10m != null && (
              <DetailRow label="Wind Dir" value={`${conditions.current.wind_direction_10m}°`} />
            )}
            {conditions.current.precipitation != null && (
              <DetailRow label="Precipitation" value={`${conditions.current.precipitation} ${conditions.current_units?.precipitation ?? 'mm'}`} />
            )}
            {conditions.current.surface_pressure != null && (
              <DetailRow label="Pressure" value={`${conditions.current.surface_pressure} ${conditions.current_units?.surface_pressure ?? 'hPa'}`} />
            )}
          </div>
        ) : (
          <div className="font-mono text-[12px] text-muted-foreground">No conditions available.</div>
        )}
      </div>

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function FlightDetail({ flight, flightInfo, flightInfoLoading, nearby }: {
  flight: FlightRecord
  flightInfo: HexdbFlightInfo
  flightInfoLoading: boolean
  nearby: CorrelatedEntity[]
}) {
  const now = useNow()
  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      {flightInfo.imageUrl && <AircraftImage key={flightInfo.imageUrl} url={flightInfo.imageUrl} alt={flight.callsign} />}

      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{flight.callsign}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="neo-data text-[12px] text-muted-foreground">ICAO {flight.icao24.toUpperCase()}</span>
          <span className={cn(
            'border border-domain-flight bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-flight',
          )}>{flight.type}</span>
        </div>
        {flight.originCountry && <div className="mt-1 font-mono text-[12px] text-muted-foreground">{flight.originCountry}</div>}
      </div>

      {flightInfo.aircraft && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Aircraft</div>
          <div className="grid grid-cols-2 gap-2">
            <DetailRow label="Registration" value={flightInfo.aircraft.Registration} />
            <DetailRow label="Type" value={flightInfo.aircraft.Type || flightInfo.aircraft.ICAOTypeCode} />
            <DetailRow label="Manufacturer" value={flightInfo.aircraft.Manufacturer} />
            <DetailRow label="Owner" value={flightInfo.aircraft.RegisteredOwners} />
          </div>
        </div>
      )}

      {flightInfo.route && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Route</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="neo-data text-[13px] font-bold text-domain-flight">{flightInfo.route.route}</span>
          </div>
          {flightInfo.origin && (
            <div className="mb-1.5">
              <div className="neo-kicker text-muted-foreground">Origin</div>
              <div className="font-mono text-[12px] text-foreground">{flightInfo.origin.airport}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {flightInfo.origin.iata}/{flightInfo.origin.icao} — {flightInfo.origin.region_name}, {flightInfo.origin.country_code}
              </div>
            </div>
          )}
          {flightInfo.destination && (
            <div>
              <div className="neo-kicker text-muted-foreground">Destination</div>
              <div className="font-mono text-[12px] text-foreground">{flightInfo.destination.airport}</div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {flightInfo.destination.iata}/{flightInfo.destination.icao} — {flightInfo.destination.region_name}, {flightInfo.destination.country_code}
              </div>
            </div>
          )}
        </div>
      )}

      {flightInfoLoading && !flightInfo.aircraft && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="font-mono text-[12px] text-muted-foreground motion-safe:animate-pulse-signal">Loading aircraft data...</div>
        </div>
      )}

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(flight.lat).toFixed(4)}°${flight.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(flight.lon).toFixed(4)}°${flight.lon >= 0 ? 'E' : 'W'}`} />
          <DetailRow label="Altitude" value={`${Math.round(flight.altitude)} m (FL${Math.round(flight.altitude * 3.28084 / 100)})`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Movement</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Speed" value={`${(flight.speed * 1.94384).toFixed(0)} kn`} />
          <DetailRow label="Heading" value={`${flight.heading.toFixed(0)}°`} />
          <DetailRow label="Vert Rate" value={`${(flight.verticalRate * 196.85).toFixed(0)} fpm`} warn={Math.abs(flight.verticalRate) > 10} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">ADS-B Data</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Last Update" value={new Date(flight.lastUpdate).toISOString().slice(11, 19) + 'Z'} />
          <DetailRow label="Age" value={`${Math.round((now - flight.lastUpdate) / 1000)}s`} />
        </div>
      </div>

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function VesselDetail({ vessel, nearby }: { vessel: VesselRecord; nearby: CorrelatedEntity[] }) {
  const now = useNow()
  const [sanctions, setSanctions] = useState<SanctionMatch[]>([])
  const [sanctionsLoading, setSanctionsLoading] = useState(false)

  useEffect(() => {
    const name = vessel.name?.trim()
    const shouldCheck = Boolean(name && name !== String(vessel.mmsi))
    queueMicrotask(() => {
      setSanctions([])
      setSanctionsLoading(shouldCheck)
    })
    if (!name || !shouldCheck) return
    fetch(`/api/sanctions/check?q=${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.matches) setSanctions(data.matches) })
      .catch(() => {})
      .finally(() => setSanctionsLoading(false))
  }, [vessel.mmsi, vessel.name])
  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{vessel.name}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="neo-data text-[12px] text-muted-foreground">MMSI {vessel.mmsi}</span>
          <span className={cn(
            'border border-domain-vessel bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-vessel',
          )}>{vessel.type}</span>
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Current Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(vessel.lat).toFixed(4)}°${vessel.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(vessel.lon).toFixed(4)}°${vessel.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Movement</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Speed (SOG)" value={`${vessel.speed.toFixed(1)} kn`} />
          <DetailRow label="Course (COG)" value={`${vessel.course.toFixed(1)}°`} />
          <DetailRow label="Heading" value={vessel.heading === 511 ? 'N/A' : `${vessel.heading}°`} />
          <DetailRow label="Nav Status" value={NAV_STATUS_LABELS[vessel.navStatus] ?? `Code ${vessel.navStatus}`} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">AIS Data</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Last Update" value={new Date(vessel.lastUpdate).toISOString().slice(11, 19) + 'Z'} />
          <DetailRow label="Age" value={`${Math.round((now - vessel.lastUpdate) / 1000)}s`} />
        </div>
      </div>

      {/* Sanctions check */}
      {sanctionsLoading && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="font-mono text-[12px] text-muted-foreground motion-safe:animate-pulse-signal">Checking sanctions...</div>
        </div>
      )}
      {sanctions.length > 0 && (
        <div className="border-b border-danger bg-panel px-3.5 py-3">
          <div className="neo-kicker mb-2 text-danger">Sanctioned</div>
          {sanctions.map(s => (
            <div key={s.id} className="mb-2">
              <div className="font-mono text-[12px] text-danger">{s.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground">{s.datasets.slice(0, 3).join(', ')}</div>
              <div className="neo-data text-[10px] text-muted-foreground">Match: {(s.score * 100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      )}

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function SatelliteDetail({ satellite, position, constellation, epochAge, nearby }: {
  satellite: SatelliteRecord
  position: SatellitePosition | null
  constellation: ConstellationMeta | null
  epochAge: number | null
  nearby: CorrelatedEntity[]
}) {
  return (
    <div className="neo-scrollbar flex-1 overflow-y-auto">
      <div className="border-b border-line px-3.5 py-3">
        <div className="font-display text-sm font-bold tracking-wide text-foreground">{satellite.name}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="neo-data text-[12px] text-muted-foreground">NORAD {satellite.noradId}</span>
          {constellation && (
            <span
              className="border border-domain-satellite bg-background px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-satellite"
            >{constellation.name}</span>
          )}
        </div>
      </div>

      {position && (
        <div className="border-b border-line-muted px-3.5 py-3">
          <div className="neo-kicker mb-2 text-muted-foreground">Current Position</div>
          <div className="grid grid-cols-2 gap-2">
            <DetailRow label="Latitude" value={`${Math.abs(position.lat).toFixed(4)}°${position.lat >= 0 ? 'N' : 'S'}`} />
            <DetailRow label="Longitude" value={`${Math.abs(position.lon).toFixed(4)}°${position.lon >= 0 ? 'E' : 'W'}`} />
            <DetailRow label="Altitude" value={`${position.alt.toFixed(1)} km`} />
            <DetailRow label="Velocity" value={`${position.velocity.toFixed(2)} km/s`} />
          </div>
        </div>
      )}

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">Orbital Parameters</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Inclination" value={`${satellite.inclination.toFixed(2)}°`} />
          <DetailRow label="Period" value={`${satellite.period.toFixed(1)} min`} />
          <DetailRow label="Eccentricity" value={satellite.eccentricity.toFixed(6)} />
        </div>
      </div>

      <div className="border-b border-line-muted px-3.5 py-3">
        <div className="neo-kicker mb-2 text-muted-foreground">TLE Data</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Epoch" value={satellite.epoch.toISOString().slice(0, 16).replace('T', ' ') + 'Z'} />
          <DetailRow label="Age" value={epochAge !== null ? `${epochAge}h` : '—'} warn={epochAge !== null && epochAge > 48} />
        </div>
      </div>

      <NearbyEntities nearby={nearby} />
    </div>
  )
}

function AircraftImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  if (error) return null

  return (
    <div className="relative w-full border-b border-line bg-background">
      {!loaded && (
        <div className="h-32 flex items-center justify-center">
          <div className="font-mono text-[11px] text-muted-foreground motion-safe:animate-pulse-signal">Loading image...</div>
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className={cn('w-full object-cover', loaded ? 'block' : 'hidden')}
        style={{ maxHeight: 160 }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  )
}

function DetailRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="neo-kicker text-muted-foreground">{label}</div>
      <div className={cn('neo-data mt-0.5 text-[13px]', warn ? 'text-warning' : 'text-foreground')}>{value}</div>
    </div>
  )
}
