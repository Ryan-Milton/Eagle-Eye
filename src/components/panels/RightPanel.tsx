import { useRef, useEffect } from 'react'
import { CONSTELLATIONS } from '@/data/constellations'
import { cn } from '@/lib/utils'
import type { SatelliteRecord, SatellitePosition, VesselRecord, FlightRecord } from '@/types'

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

interface RightPanelProps {
  satellite: SatelliteRecord | null
  position: SatellitePosition | null
  vessel: VesselRecord | null
  flight: FlightRecord | null
}

export function RightPanel({ satellite, position, vessel, flight }: RightPanelProps) {
  const constellation = satellite
    ? CONSTELLATIONS.find(c => c.id === satellite.constellationId)
    : null
  const colorHex = constellation ? `#${constellation.color.toString(16).padStart(6, '0')}` : '#3f3f46'

  const epochAgeRef = useRef<number | null>(null)
  useEffect(() => {
    if (!satellite) { epochAgeRef.current = null; return }
    epochAgeRef.current = Math.round((Date.now() - satellite.epoch.getTime()) / (1000 * 60 * 60))
  }, [satellite])
  const epochAge = epochAgeRef.current

  return (
    <aside className="fixed top-[46px] right-0 bottom-[34px] w-[272px] bg-zinc-900 border-l border-zinc-800 z-40 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[12px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">
          {flight ? 'Flight Detail' : vessel ? 'Vessel Detail' : 'Satellite Detail'}
        </span>
      </div>

      {flight ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {/* Flight identity section */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-sm font-bold tracking-wide text-zinc-50">
              {flight.callsign}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-[12px] text-zinc-500">ICAO {flight.icao24.toUpperCase()}</span>
              <span className={cn(
                'font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border',
                FLIGHT_TYPE_COLORS[flight.type] || FLIGHT_TYPE_COLORS.other,
              )}>
                {flight.type}
              </span>
            </div>
            {flight.originCountry && (
              <div className="font-mono text-[12px] text-zinc-500 mt-1">{flight.originCountry}</div>
            )}
          </div>

          {/* Current position */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              Position
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow label="Latitude" value={`${Math.abs(flight.lat).toFixed(4)}°${flight.lat >= 0 ? 'N' : 'S'}`} />
              <DetailRow label="Longitude" value={`${Math.abs(flight.lon).toFixed(4)}°${flight.lon >= 0 ? 'E' : 'W'}`} />
              <DetailRow label="Altitude" value={`${Math.round(flight.altitude)} m (FL${Math.round(flight.altitude * 3.28084 / 100)})`} />
            </div>
          </div>

          {/* Movement */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              Movement
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow label="Speed" value={`${(flight.speed * 1.94384).toFixed(0)} kn`} />
              <DetailRow label="Heading" value={`${flight.heading.toFixed(0)}°`} />
              <DetailRow label="Vert Rate" value={`${(flight.verticalRate * 196.85).toFixed(0)} fpm`} warn={Math.abs(flight.verticalRate) > 10} />
            </div>
          </div>

          {/* ADS-B Data */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              ADS-B Data
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow
                label="Last Update"
                value={new Date(flight.lastUpdate).toISOString().slice(11, 19) + 'Z'}
              />
              <DetailRow
                label="Age"
                value={`${Math.round((Date.now() - flight.lastUpdate) / 1000)}s`}
              />
            </div>
          </div>
        </div>
      ) : vessel ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {/* Vessel name section */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-sm font-bold tracking-wide text-zinc-50">
              {vessel.name}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-[12px] text-zinc-500">MMSI {vessel.mmsi}</span>
              <span className={cn(
                'font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border',
                VESSEL_TYPE_COLORS[vessel.type] || VESSEL_TYPE_COLORS.other,
              )}>
                {vessel.type}
              </span>
            </div>
          </div>

          {/* Current position */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              Current Position
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow label="Latitude" value={`${Math.abs(vessel.lat).toFixed(4)}°${vessel.lat >= 0 ? 'N' : 'S'}`} />
              <DetailRow label="Longitude" value={`${Math.abs(vessel.lon).toFixed(4)}°${vessel.lon >= 0 ? 'E' : 'W'}`} />
            </div>
          </div>

          {/* Movement */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              Movement
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow label="Speed (SOG)" value={`${vessel.speed.toFixed(1)} kn`} />
              <DetailRow label="Course (COG)" value={`${vessel.course.toFixed(1)}°`} />
              <DetailRow label="Heading" value={vessel.heading === 511 ? 'N/A' : `${vessel.heading}°`} />
              <DetailRow label="Nav Status" value={NAV_STATUS_LABELS[vessel.navStatus] ?? `Code ${vessel.navStatus}`} />
            </div>
          </div>

          {/* Data */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              AIS Data
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow
                label="Last Update"
                value={new Date(vessel.lastUpdate).toISOString().slice(11, 19) + 'Z'}
              />
              <DetailRow
                label="Age"
                value={`${Math.round((Date.now() - vessel.lastUpdate) / 1000)}s`}
              />
            </div>
          </div>
        </div>
      ) : !satellite ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-zinc-600">Select a satellite, vessel, or flight to view details</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          {/* Name section */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-sm font-bold tracking-wide text-zinc-50">
              {satellite.name}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-[12px] text-zinc-500">NORAD {satellite.noradId}</span>
              {constellation && (
                <span
                  className="font-display text-[13px] font-semibold tracking-[1px] uppercase px-1.5 py-0.5 rounded-sm border"
                  style={{ color: colorHex, borderColor: colorHex + '40', backgroundColor: colorHex + '15' }}
                >
                  {constellation.name}
                </span>
              )}
            </div>
          </div>

          {/* Current position */}
          {position && (
            <div className="px-3.5 py-3 border-b border-zinc-800">
              <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
                Current Position
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DetailRow label="Latitude" value={`${Math.abs(position.lat).toFixed(4)}°${position.lat >= 0 ? 'N' : 'S'}`} />
                <DetailRow label="Longitude" value={`${Math.abs(position.lon).toFixed(4)}°${position.lon >= 0 ? 'E' : 'W'}`} />
                <DetailRow label="Altitude" value={`${position.alt.toFixed(1)} km`} />
                <DetailRow label="Velocity" value={`${position.velocity.toFixed(2)} km/s`} />
              </div>
            </div>
          )}

          {/* Orbital parameters */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              Orbital Parameters
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow label="Inclination" value={`${satellite.inclination.toFixed(2)}°`} />
              <DetailRow label="Period" value={`${satellite.period.toFixed(1)} min`} />
              <DetailRow label="Eccentricity" value={satellite.eccentricity.toFixed(6)} />
            </div>
          </div>

          {/* TLE Epoch */}
          <div className="px-3.5 py-3 border-b border-zinc-800">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-600 uppercase mb-2">
              TLE Data
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DetailRow
                label="Epoch"
                value={satellite.epoch.toISOString().slice(0, 16).replace('T', ' ') + 'Z'}
              />
              <DetailRow
                label="Age"
                value={epochAge !== null ? `${epochAge}h` : '—'}
                warn={epochAge !== null && epochAge > 48}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function DetailRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[12px] text-zinc-600 tracking-wide uppercase">{label}</div>
      <div className={cn('font-mono text-[13px] mt-0.5', warn ? 'text-yellow-400' : 'text-zinc-300')}>
        {value}
      </div>
    </div>
  )
}
