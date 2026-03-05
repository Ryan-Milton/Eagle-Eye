import { Pip } from '@/components/ui/Pip'
import { useClock } from '@/hooks/useClock'
import type { NavView } from '@/types'
import type { SatelliteStats } from '@/hooks/useSatellites'

const NAV_VIEWS: NavView[] = ['Globe', 'Objects', 'Graph', 'Signals', 'Reports']

interface TopBarProps {
  activeView: NavView
  onViewChange: (v: NavView) => void
  sessionStart: number
  getStats: () => SatelliteStats
  vesselCount: number
  vesselConnected: boolean
  flightCount: number
  flightConnected: boolean
}

export function TopBar({ activeView, onViewChange, sessionStart, getStats, vesselCount, vesselConnected, flightCount, flightConnected }: TopBarProps) {
  const { time, date } = useClock(sessionStart)
  const stats = getStats()

  const dataAge = stats.lastFetchTime
    ? Math.round((Date.now() - stats.lastFetchTime) / 60_000)
    : null

  return (
    <header className="fixed top-0 left-0 right-0 h-[46px] bg-zinc-900 border-b border-zinc-800 flex items-center pl-4 z-50">

      {/* Logo */}
      <div className="flex items-center gap-2.5 pr-5 border-r border-zinc-800 h-full flex-shrink-0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <polygon points="11,1 21,6 21,16 11,21 1,16 1,6" stroke="#e8640a" strokeWidth="1.5" fill="none" />
          <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="rgba(232,100,10,0.12)" stroke="#e8640a" strokeWidth="0.75" />
          <circle cx="11" cy="11" r="2" fill="#e8640a" />
        </svg>
        <div>
          <div className="font-display text-base font-bold tracking-[3px] text-zinc-50 uppercase">Eagle Eye</div>
          <div className="text-[13px] text-zinc-600 tracking-[2px] uppercase mt-px">Geospatial Intel</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex h-full ml-1">
        {NAV_VIEWS.map(view => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={[
              'font-display text-xs font-medium tracking-[2px] uppercase px-4 h-full',
              'border-r border-zinc-800 border-b-2 transition-colors',
              activeView === view
                ? 'text-zinc-50 border-b-orange-500'
                : 'text-zinc-600 border-b-transparent hover:text-zinc-400',
            ].join(' ')}
          >
            {view}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center ml-auto h-full">
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          <Pip color="ok" /> TLE Live
        </div>
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          <span className="text-zinc-400">{stats.enabledCount}</span> Sats
        </div>
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          <span className="text-cyan-400">{vesselCount}</span> Vessels
        </div>
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          <Pip color={vesselConnected ? 'ok' : 'danger'} /> AIS
        </div>
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          <span className="text-yellow-400">{flightCount}</span> Flights
        </div>
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          <Pip color={flightConnected ? 'ok' : 'danger'} /> ADS-B
        </div>
        <div className="flex items-center gap-2 px-4 h-full border-l border-zinc-800 font-mono text-[12px] text-zinc-600">
          {dataAge !== null ? (
            <><Pip color={dataAge < 30 ? 'ok' : 'warn'} /> {dataAge < 1 ? '<1m' : `${dataAge}m`} ago</>
          ) : (
            <><Pip color="danger" /> No data</>
          )}
        </div>
        <div className="flex flex-col justify-center items-end px-4 h-full border-l border-zinc-800 min-w-[104px]">
          <span className="font-mono text-sm font-medium text-zinc-50 tracking-wide">{time}</span>
          <span className="font-mono text-[13px] text-zinc-600 tracking-wide mt-px">{date}</span>
        </div>
      </div>
    </header>
  )
}
