import { useState } from 'react'
import { Activity, Bell, Menu, PanelLeft, PanelRight, Star } from 'lucide-react'
import { Pip } from '@/components/ui/Pip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useClock } from '@/hooks/useClock'
import { useNow } from '@/hooks/useNow'
import { useAppStore } from '@/stores/app-store'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { usePortStore } from '@/stores/port-store'
import { useRFStore } from '@/stores/rf-store'
import { useCameraStore } from '@/stores/camera-store'
import { useAlertStore } from '@/stores/alert-store'
import { useWatchlistStore } from '@/stores/watchlist-store'
import type { NavView } from '@/types'

const NAV_VIEWS: NavView[] = ['Globe', 'Objects', 'Graph', 'Signals', 'Reports']

interface RegionPreset {
  label: string
  center: [number, number]
  zoom: number
}

const REGION_PRESETS: RegionPreset[] = [
  { label: 'Ukraine / Black Sea', center: [34.0, 47.0], zoom: 5 },
  { label: 'Middle East', center: [44.0, 31.0], zoom: 4 },
  { label: 'Strait of Hormuz', center: [56.3, 26.5], zoom: 7 },
  { label: 'Suez Canal', center: [32.3, 30.5], zoom: 8 },
  { label: 'South China Sea', center: [114.0, 12.0], zoom: 5 },
  { label: 'Taiwan Strait', center: [119.5, 24.0], zoom: 6 },
  { label: 'Horn of Africa / Red Sea', center: [45.0, 12.5], zoom: 5 },
  { label: 'Baltic Sea / NATO Flank', center: [20.5, 58.0], zoom: 5 },
  { label: 'Korean Peninsula', center: [127.5, 37.5], zoom: 6 },
  { label: 'Arctic', center: [0, 80], zoom: 3 },
  { label: 'Mediterranean', center: [18.0, 36.0], zoom: 4 },
  { label: 'Gulf of Guinea', center: [3.0, 3.0], zoom: 5 },
]

interface TopBarProps {
  onOpenTracking: () => void
  onOpenIntelligence: () => void
}

interface SourceStatus {
  label: string
  value: string | number
  healthy: boolean
}

const controlClass = 'grid h-full min-w-11 place-items-center border-l border-line-muted bg-panel text-muted-foreground transition-colors hover:bg-signal hover:text-signal-foreground focus-visible:outline-focus'

export function TopBar({ onOpenTracking, onOpenIntelligence }: TopBarProps) {
  const { activeView, setActiveView, sessionStart, flyTo } = useAppStore()
  const [navOpen, setNavOpen] = useState(false)
  const { time, date } = useClock(sessionStart)
  const now = useNow()
  const getStats = useSatelliteStore(s => s.getStats)
  const vesselCount = useVesselStore(s => s.count)
  const vesselConnected = useVesselStore(s => s.connected)
  const flightCount = useFlightStore(s => s.count)
  const flightConnected = useFlightStore(s => s.connected)
  const weatherCount = useWeatherStore(s => s.count)
  const weatherLastFetch = useWeatherStore(s => s.lastFetch)
  const newsCount = useNewsStore(s => s.count)
  const newsLastFetch = useNewsStore(s => s.lastFetch)
  const conflictCount = useConflictStore(s => s.count)
  const conflictLastFetch = useConflictStore(s => s.lastFetch)
  const cyberCount = useCyberStore(s => s.count)
  const cyberLastFetch = useCyberStore(s => s.lastFetch)
  const portCount = usePortStore(s => s.count)
  const portLastFetch = usePortStore(s => s.lastFetch)
  const rfCount = useRFStore(s => s.count)
  const rfLastFetch = useRFStore(s => s.lastFetch)
  const camCount = useCameraStore(s => s.count)
  const camLastFetch = useCameraStore(s => s.lastFetch)
  const unackAlerts = useAlertStore(s => s.unacknowledgedCount)
  const watchlistSize = useWatchlistStore(s => s.watchlist.size)

  const stats = getStats()
  const dataAge = stats.lastFetchTime
    ? Math.round((now - stats.lastFetchTime) / 60_000)
    : null
  const sources: SourceStatus[] = [
    { label: 'TLE', value: dataAge === null ? 'OFF' : dataAge < 1 ? '<1m' : `${dataAge}m`, healthy: dataAge !== null && dataAge < 30 },
    { label: 'SAT', value: stats.enabledCount, healthy: stats.enabledCount > 0 },
    { label: 'AIS', value: vesselCount, healthy: vesselConnected },
    { label: 'ADSB', value: flightCount, healthy: flightConnected },
    { label: 'WX', value: weatherCount, healthy: Boolean(weatherLastFetch) },
    { label: 'NEWS', value: newsCount, healthy: Boolean(newsLastFetch) },
    { label: 'CON', value: conflictCount, healthy: Boolean(conflictLastFetch) },
    { label: 'CYB', value: cyberCount, healthy: Boolean(cyberLastFetch) },
    { label: 'PORT', value: portCount, healthy: Boolean(portLastFetch) },
    { label: 'RF', value: rfCount, healthy: Boolean(rfLastFetch) },
    { label: 'CAM', value: camCount, healthy: Boolean(camLastFetch) },
  ]
  const activeSources = sources.filter(source => source.healthy).length

  const selectView = (view: NavView) => {
    setActiveView(view)
    setNavOpen(false)
  }

  const selectRegion = (region: RegionPreset) => {
    flyTo(region.center, region.zoom)
    setNavOpen(false)
  }

  return (
    <header className="relative z-40 col-span-full row-start-1 flex min-w-0 items-stretch border-b border-line bg-panel text-foreground">
      <div className="flex min-w-11 shrink-0 items-center gap-2 border-r border-line px-2 sm:px-3">
        <svg aria-hidden="true" className="size-7 text-signal" viewBox="0 0 22 22" fill="none">
          <polygon points="11,1 21,6 21,16 11,21 1,16 1,6" stroke="currentColor" strokeWidth="1.5" />
          <polygon points="11,5 17,8.5 17,13.5 11,17 5,13.5 5,8.5" fill="color-mix(in srgb, currentColor 18%, transparent)" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="11" cy="11" r="2" fill="currentColor" />
        </svg>
        <div className="hidden leading-none sm:block md:hidden lg:block">
          <div className="neo-display whitespace-nowrap text-sm uppercase tracking-[0.16em]">Eagle Eye</div>
          <div className="mt-1 hidden whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground lg:block">Geospatial Intel</div>
        </div>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetTrigger asChild>
          <button type="button" className={`${controlClass} md:hidden`} aria-label="Open navigation">
            <Menu aria-hidden="true" className="size-4" />
          </button>
        </SheetTrigger>
        <SheetContent side="top" className="max-h-[85dvh] overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>Operations</SheetTitle>
          </SheetHeader>
          <nav aria-label="Primary navigation" className="mt-5 grid grid-cols-2 border-l border-t border-line sm:grid-cols-5">
            {NAV_VIEWS.map(view => (
              <button
                key={view}
                type="button"
                onClick={() => selectView(view)}
                aria-current={activeView === view ? 'page' : undefined}
                className={`min-h-12 border-b border-r border-line px-3 font-mono text-xs font-bold uppercase tracking-wider ${activeView === view ? 'bg-signal text-signal-foreground' : 'bg-panel hover:bg-panel-raised'}`}
              >
                {view}
              </button>
            ))}
          </nav>
          <div className="mt-5">
            <div className="neo-kicker mb-2 text-muted-foreground">Region presets</div>
            <div className="grid border-l border-t border-line sm:grid-cols-2">
              {REGION_PRESETS.map(region => (
                <button
                  key={region.label}
                  type="button"
                  onClick={() => selectRegion(region)}
                  className="min-h-10 border-b border-r border-line px-3 text-left font-mono text-xs hover:bg-signal hover:text-signal-foreground"
                >
                  {region.label}
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <nav aria-label="Primary navigation" className="hidden min-w-0 items-stretch md:flex">
        {NAV_VIEWS.map(view => (
          <button
            key={view}
            type="button"
            onClick={() => selectView(view)}
            aria-current={activeView === view ? 'page' : undefined}
            className={`relative border-r border-line-muted px-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors lg:px-3 ${activeView === view ? 'bg-signal text-signal-foreground' : 'text-muted-foreground hover:bg-panel-raised hover:text-foreground'}`}
          >
            {view}
          </button>
        ))}
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="hidden border-r border-line-muted px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-panel-raised hover:text-foreground md:block lg:px-3">
            Regions
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[70dvh] w-64 overflow-y-auto">
          <DropdownMenuLabel>Region presets</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {REGION_PRESETS.map(region => (
            <DropdownMenuItem key={region.label} onSelect={() => selectRegion(region)}>
              {region.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="min-w-0 flex-1" />

      <div className="hidden items-stretch 2xl:flex" aria-label="Source status">
        {sources.map(source => (
          <div key={source.label} className="flex min-w-12 flex-col items-center justify-center border-l border-line-muted px-1.5 font-mono leading-none">
            <span className="text-[10px] font-bold text-foreground">{source.value}</span>
            <span className="mt-1 flex items-center gap-1 text-[8px] text-muted-foreground">
              <Pip color={source.healthy ? 'ok' : 'danger'} /> {source.label}
            </span>
          </div>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`${controlClass} gap-1 px-2 2xl:hidden`} aria-label={`Source status: ${activeSources} of ${sources.length} active`}>
            <Activity aria-hidden="true" className="size-4" />
            <span className="hidden font-mono text-[10px] font-bold sm:inline">{activeSources}/{sources.length}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Operational sources</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="grid grid-cols-2 gap-px bg-line-muted">
            {sources.map(source => (
              <div key={source.label} className="flex items-center gap-2 bg-panel px-2 py-2 font-mono text-xs">
                <Pip color={source.healthy ? 'ok' : 'danger'} />
                <span className="text-muted-foreground">{source.label}</span>
                <strong className="ml-auto text-foreground">{source.value}</strong>
              </div>
            ))}
          </div>
          <DropdownMenuSeparator />
          <div className="grid grid-cols-2 gap-2 px-2 py-2 font-mono text-xs">
            <span className="flex items-center gap-2"><Bell className="size-3.5 text-danger" /> Alerts <strong className="ml-auto">{unackAlerts}</strong></span>
            <span className="flex items-center gap-2"><Star className="size-3.5 text-domain-watchlist" /> Watch <strong className="ml-auto">{watchlistSize}</strong></span>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="hidden items-stretch lg:flex">
        <div className="flex min-w-12 flex-col items-center justify-center border-l border-line-muted font-mono" title="Unacknowledged alerts">
          <Bell aria-hidden="true" className="size-3.5 text-danger" />
          <span className="text-[9px] font-bold">{unackAlerts}</span>
        </div>
        <div className="flex min-w-12 flex-col items-center justify-center border-l border-line-muted font-mono" title="Watchlist entities">
          <Star aria-hidden="true" className="size-3.5 text-domain-watchlist" />
          <span className="text-[9px] font-bold">{watchlistSize}</span>
        </div>
      </div>

      <button type="button" onClick={onOpenTracking} className={`${controlClass} lg:hidden`} aria-label="Open tracking panel">
        <PanelLeft aria-hidden="true" className="size-4" />
      </button>
      <button type="button" onClick={onOpenIntelligence} className={`${controlClass} xl:hidden`} aria-label="Open intelligence panel">
        <PanelRight aria-hidden="true" className="size-4" />
      </button>
      <div className="flex items-center border-l border-line-muted px-1.5">
        <ThemeToggle />
      </div>
      <div className="flex min-w-[3.8rem] flex-col items-end justify-center border-l border-line px-2 font-mono leading-none sm:min-w-[6.5rem] sm:px-3">
        <span className="text-[11px] font-bold tracking-wide sm:text-xs">{time}</span>
        <span className="mt-1 hidden text-[8px] tracking-wide text-muted-foreground sm:block">{date}</span>
      </div>
    </header>
  )
}
