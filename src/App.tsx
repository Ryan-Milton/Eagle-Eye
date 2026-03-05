import { useAppStore } from '@/stores/app-store'
import { useSatelliteInit } from '@/hooks/useSatelliteInit'
import { useVesselInit } from '@/hooks/useVesselInit'
import { useFlightInit } from '@/hooks/useFlightInit'
import { useWeatherInit } from '@/hooks/useWeatherInit'
import { TopBar } from '@/components/panels/TopBar'
import { BottomBar } from '@/components/panels/BottomBar'
import { LeftPanel } from '@/components/panels/left/LeftPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { MapboxGlobeView } from '@/components/globe/MapboxGlobeView'

export default function App() {
  useSatelliteInit()
  useVesselInit()
  useFlightInit()
  useWeatherInit()

  const activeView = useAppStore(s => s.activeView)

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <TopBar />
      <LeftPanel />
      {activeView === 'Globe' && <MapboxGlobeView />}
      <RightPanel />
      <BottomBar />
    </div>
  )
}
