import { useState, useRef, useEffect, useMemo } from 'react'
import { CONSTELLATIONS } from '@/data/constellations'
import { cn } from '@/lib/utils'
import { VESSEL_TYPE_COLORS, FLIGHT_TYPE_COLORS, WEATHER_TYPE_COLORS } from '@/lib/colors'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useFlightInfo } from '@/hooks/useFlightInfo'
import type { HexdbFlightInfo } from '@/lib/hexdb'
import type { SatelliteRecord, SatellitePosition, VesselRecord, FlightRecord, ConstellationMeta, WeatherEvent } from '@/types'

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

export function RightPanel() {
  const { selectedSatId, selectedMmsi, selectedIcao, selectedEventId } = useSelectionStore()
  const { getSatellites, getPositions, toggles, version: satVersion } = useSatelliteStore()
  const { vessels, version: vesselVersion } = useVesselStore()
  const { flights, version: flightVersion } = useFlightStore()
  const { events, version: weatherVersion } = useWeatherStore()

  // Derive selected records
  void vesselVersion // trigger re-render
  void flightVersion
  void weatherVersion
  const selectedVessel = selectedMmsi ? vessels.get(selectedMmsi) ?? null : null
  const selectedFlight = selectedIcao ? flights.get(selectedIcao) ?? null : null
  const selectedEvent = selectedEventId ? events.get(selectedEventId) ?? null : null

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
  const colorHex = constellation ? `#${constellation.color.toString(16).padStart(6, '0')}` : '#3f3f46'

  const epochAgeRef = useRef<number | null>(null)
  useEffect(() => {
    if (!selectedSatellite) { epochAgeRef.current = null; return }
    epochAgeRef.current = Math.round((Date.now() - selectedSatellite.epoch.getTime()) / (1000 * 60 * 60))
  }, [selectedSatellite])
  const epochAge = epochAgeRef.current

  return (
    <aside className="fixed top-[46px] right-0 bottom-[34px] w-[272px] bg-zinc-900 border-l border-zinc-800 z-40 flex flex-col overflow-hidden">

      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[12px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">
          {selectedEvent ? 'Event Detail' : selectedFlight ? 'Flight Detail' : selectedVessel ? 'Vessel Detail' : 'Satellite Detail'}
        </span>
      </div>

      {selectedEvent ? (
        <WeatherEventDetail event={selectedEvent} />
      ) : selectedFlight ? (
        <FlightDetail flight={selectedFlight} flightInfo={flightInfo} flightInfoLoading={flightInfoLoading} />
      ) : selectedVessel ? (
        <VesselDetail vessel={selectedVessel} />
      ) : !selectedSatellite ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-zinc-600">Select a satellite, vessel, or flight to view details</p>
        </div>
      ) : (
        <SatelliteDetail satellite={selectedSatellite} position={selectedPosition} constellation={constellation} colorHex={colorHex} epochAge={epochAge} />
      )}
    </aside>
  )
}

function WeatherEventDetail({ event }: { event: WeatherEvent }) {
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
    setConditions(null)
    setConditionsLoading(true)
    fetch(`/api/weather/conditions?lat=${event.lat}&lon=${event.lon}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setConditions(data))
      .catch(() => setConditions(null))
      .finally(() => setConditionsLoading(false))
  }, [event.id, event.lat, event.lon])

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-sm font-bold tracking-wide text-zinc-50">{event.title}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[12px] text-zinc-500">{event.source.toUpperCase()}</span>
          <span className={cn(
            'font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border',
            WEATHER_TYPE_COLORS[event.type] || WEATHER_TYPE_COLORS.alert,
          )}>{event.type}</span>
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(event.lat).toFixed(4)}°${event.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(event.lon).toFixed(4)}°${event.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Event Details</div>
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
              warn={event.expires < Date.now() + 3600_000}
            />
          )}
          <DetailRow label="Last Update" value={new Date(event.lastUpdate).toISOString().slice(11, 19) + 'Z'} />
        </div>
      </div>

      {event.description && (
        <div className="px-3.5 py-3 border-b border-zinc-800">
          <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Description</div>
          <p className="font-mono text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap">{event.description.slice(0, 500)}</p>
        </div>
      )}

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Local Conditions</div>
        {conditionsLoading ? (
          <div className="font-mono text-[12px] text-zinc-600 animate-pulse">Loading conditions...</div>
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
          <div className="font-mono text-[12px] text-zinc-600">No conditions available</div>
        )}
      </div>
    </div>
  )
}

function FlightDetail({ flight, flightInfo, flightInfoLoading }: {
  flight: FlightRecord
  flightInfo: HexdbFlightInfo
  flightInfoLoading: boolean
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
      {flightInfo.imageUrl && <AircraftImage url={flightInfo.imageUrl} alt={flight.callsign} />}

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-sm font-bold tracking-wide text-zinc-50">{flight.callsign}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[12px] text-zinc-500">ICAO {flight.icao24.toUpperCase()}</span>
          <span className={cn(
            'font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border',
            FLIGHT_TYPE_COLORS[flight.type] || FLIGHT_TYPE_COLORS.other,
          )}>{flight.type}</span>
        </div>
        {flight.originCountry && <div className="font-mono text-[12px] text-zinc-500 mt-1">{flight.originCountry}</div>}
      </div>

      {flightInfo.aircraft && (
        <div className="px-3.5 py-3 border-b border-zinc-800">
          <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Aircraft</div>
          <div className="grid grid-cols-2 gap-2">
            <DetailRow label="Registration" value={flightInfo.aircraft.Registration} />
            <DetailRow label="Type" value={flightInfo.aircraft.Type || flightInfo.aircraft.ICAOTypeCode} />
            <DetailRow label="Manufacturer" value={flightInfo.aircraft.Manufacturer} />
            <DetailRow label="Owner" value={flightInfo.aircraft.RegisteredOwners} />
          </div>
        </div>
      )}

      {flightInfo.route && (
        <div className="px-3.5 py-3 border-b border-zinc-800">
          <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Route</div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[13px] text-yellow-400 font-bold">{flightInfo.route.route}</span>
          </div>
          {flightInfo.origin && (
            <div className="mb-1.5">
              <div className="font-mono text-[11px] text-zinc-600 uppercase">Origin</div>
              <div className="font-mono text-[12px] text-zinc-300">{flightInfo.origin.airport}</div>
              <div className="font-mono text-[11px] text-zinc-500">
                {flightInfo.origin.iata}/{flightInfo.origin.icao} — {flightInfo.origin.region_name}, {flightInfo.origin.country_code}
              </div>
            </div>
          )}
          {flightInfo.destination && (
            <div>
              <div className="font-mono text-[11px] text-zinc-600 uppercase">Destination</div>
              <div className="font-mono text-[12px] text-zinc-300">{flightInfo.destination.airport}</div>
              <div className="font-mono text-[11px] text-zinc-500">
                {flightInfo.destination.iata}/{flightInfo.destination.icao} — {flightInfo.destination.region_name}, {flightInfo.destination.country_code}
              </div>
            </div>
          )}
        </div>
      )}

      {flightInfoLoading && !flightInfo.aircraft && (
        <div className="px-3.5 py-3 border-b border-zinc-800">
          <div className="font-mono text-[12px] text-zinc-600 animate-pulse">Loading aircraft data...</div>
        </div>
      )}

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(flight.lat).toFixed(4)}°${flight.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(flight.lon).toFixed(4)}°${flight.lon >= 0 ? 'E' : 'W'}`} />
          <DetailRow label="Altitude" value={`${Math.round(flight.altitude)} m (FL${Math.round(flight.altitude * 3.28084 / 100)})`} />
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Movement</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Speed" value={`${(flight.speed * 1.94384).toFixed(0)} kn`} />
          <DetailRow label="Heading" value={`${flight.heading.toFixed(0)}°`} />
          <DetailRow label="Vert Rate" value={`${(flight.verticalRate * 196.85).toFixed(0)} fpm`} warn={Math.abs(flight.verticalRate) > 10} />
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">ADS-B Data</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Last Update" value={new Date(flight.lastUpdate).toISOString().slice(11, 19) + 'Z'} />
          <DetailRow label="Age" value={`${Math.round((Date.now() - flight.lastUpdate) / 1000)}s`} />
        </div>
      </div>
    </div>
  )
}

function VesselDetail({ vessel }: { vessel: VesselRecord }) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-sm font-bold tracking-wide text-zinc-50">{vessel.name}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[12px] text-zinc-500">MMSI {vessel.mmsi}</span>
          <span className={cn(
            'font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border',
            VESSEL_TYPE_COLORS[vessel.type] || VESSEL_TYPE_COLORS.other,
          )}>{vessel.type}</span>
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Current Position</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Latitude" value={`${Math.abs(vessel.lat).toFixed(4)}°${vessel.lat >= 0 ? 'N' : 'S'}`} />
          <DetailRow label="Longitude" value={`${Math.abs(vessel.lon).toFixed(4)}°${vessel.lon >= 0 ? 'E' : 'W'}`} />
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Movement</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Speed (SOG)" value={`${vessel.speed.toFixed(1)} kn`} />
          <DetailRow label="Course (COG)" value={`${vessel.course.toFixed(1)}°`} />
          <DetailRow label="Heading" value={vessel.heading === 511 ? 'N/A' : `${vessel.heading}°`} />
          <DetailRow label="Nav Status" value={NAV_STATUS_LABELS[vessel.navStatus] ?? `Code ${vessel.navStatus}`} />
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">AIS Data</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Last Update" value={new Date(vessel.lastUpdate).toISOString().slice(11, 19) + 'Z'} />
          <DetailRow label="Age" value={`${Math.round((Date.now() - vessel.lastUpdate) / 1000)}s`} />
        </div>
      </div>
    </div>
  )
}

function SatelliteDetail({ satellite, position, constellation, colorHex, epochAge }: {
  satellite: SatelliteRecord
  position: SatellitePosition | null
  constellation: ConstellationMeta | null
  colorHex: string
  epochAge: number | null
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-sm font-bold tracking-wide text-zinc-50">{satellite.name}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[12px] text-zinc-500">NORAD {satellite.noradId}</span>
          {constellation && (
            <span
              className="font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border"
              style={{ color: colorHex, borderColor: colorHex + '40', backgroundColor: colorHex + '15' }}
            >{constellation.name}</span>
          )}
        </div>
      </div>

      {position && (
        <div className="px-3.5 py-3 border-b border-zinc-800">
          <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Current Position</div>
          <div className="grid grid-cols-2 gap-2">
            <DetailRow label="Latitude" value={`${Math.abs(position.lat).toFixed(4)}°${position.lat >= 0 ? 'N' : 'S'}`} />
            <DetailRow label="Longitude" value={`${Math.abs(position.lon).toFixed(4)}°${position.lon >= 0 ? 'E' : 'W'}`} />
            <DetailRow label="Altitude" value={`${position.alt.toFixed(1)} km`} />
            <DetailRow label="Velocity" value={`${position.velocity.toFixed(2)} km/s`} />
          </div>
        </div>
      )}

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">Orbital Parameters</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Inclination" value={`${satellite.inclination.toFixed(2)}°`} />
          <DetailRow label="Period" value={`${satellite.period.toFixed(1)} min`} />
          <DetailRow label="Eccentricity" value={satellite.eccentricity.toFixed(6)} />
        </div>
      </div>

      <div className="px-3.5 py-3 border-b border-zinc-800">
        <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">TLE Data</div>
        <div className="grid grid-cols-2 gap-2">
          <DetailRow label="Epoch" value={satellite.epoch.toISOString().slice(0, 16).replace('T', ' ') + 'Z'} />
          <DetailRow label="Age" value={epochAge !== null ? `${epochAge}h` : '—'} warn={epochAge !== null && epochAge > 48} />
        </div>
      </div>
    </div>
  )
}

function AircraftImage({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoaded(false)
    setError(false)
  }, [url])

  if (error) return null

  return (
    <div className="relative w-full border-b border-zinc-800 bg-zinc-950">
      {!loaded && (
        <div className="h-32 flex items-center justify-center">
          <div className="font-mono text-[11px] text-zinc-600 animate-pulse">Loading image...</div>
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
      <div className="font-mono text-[12px] text-zinc-600 tracking-wide uppercase">{label}</div>
      <div className={cn('font-mono text-[13px] mt-0.5', warn ? 'text-yellow-400' : 'text-zinc-300')}>{value}</div>
    </div>
  )
}
