import { useState } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useSatelliteInit } from '@/hooks/useSatelliteInit'
import { useVesselInit } from '@/hooks/useVesselInit'
import { useFlightInit } from '@/hooks/useFlightInit'
import { useWeatherInit } from '@/hooks/useWeatherInit'
import { useNewsInit } from '@/hooks/useNewsInit'
import { useConflictInit } from '@/hooks/useConflictInit'
import { useCyberInit } from '@/hooks/useCyberInit'
import { useOsintInit } from '@/hooks/useOsintInit'
import { usePortInit } from '@/hooks/usePortInit'
import { useRFInit } from '@/hooks/useRFInit'
import { useEconomicInit } from '@/hooks/useEconomicInit'
import { useCameraInit } from '@/hooks/useCameraInit'
import { useAlertEngine } from '@/hooks/useAlertEngine'
import { useDarkVesselDetection } from '@/hooks/useDarkVesselDetection'
import { usePersistence } from '@/hooks/usePersistence'
import { AlertToastContainer } from '@/components/ui/AlertToast'
import { TopBar } from '@/components/panels/TopBar'
import { BottomBar } from '@/components/panels/BottomBar'
import { LeftPanel } from '@/components/panels/left/LeftPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { MapboxGlobeView } from '@/components/globe/MapboxGlobeView'
import { ObjectsView } from '@/components/views/ObjectsView'
import { GraphView } from '@/components/views/GraphView'
import { SignalsView } from '@/components/views/SignalsView'
import { ReportsView } from '@/components/views/ReportsView'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ViewErrorBoundary } from '@/components/layout/ViewErrorBoundary'

export default function App() {
  useSatelliteInit()
  useVesselInit()
  useFlightInit()
  useWeatherInit()
  useNewsInit()
  useConflictInit()
  useCyberInit()
  useOsintInit()
  usePortInit()
  useRFInit()
  useEconomicInit()
  useCameraInit()
  useAlertEngine()
  useDarkVesselDetection()
  usePersistence()

  const activeView = useAppStore(s => s.activeView)
  const [trackingOpen, setTrackingOpen] = useState(false)
  const [intelligenceOpen, setIntelligenceOpen] = useState(false)
  const showDesktopTracking = useMediaQuery('(min-width: 64rem)')
  const showDesktopIntelligence = useMediaQuery('(min-width: 80rem)')

  return (
    <div className="neo-noise grid h-dvh w-screen grid-cols-[minmax(0,1fr)] grid-rows-[4rem_minmax(0,1fr)_2.75rem] overflow-hidden bg-background text-foreground lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_18rem]">
      <TopBar
        onOpenTracking={() => setTrackingOpen(true)}
        onOpenIntelligence={() => setIntelligenceOpen(true)}
      />

      {showDesktopTracking && (
        <div className="col-start-1 row-start-2 min-h-0">
          <LeftPanel />
        </div>
      )}

      <main className="relative col-start-1 row-start-2 min-h-0 min-w-0 overflow-hidden lg:col-start-2 xl:col-start-2">
        <ViewErrorBoundary key={activeView}>
          {activeView === 'Globe' && <MapboxGlobeView />}
          {activeView === 'Objects' && <ObjectsView />}
          {activeView === 'Graph' && <GraphView />}
          {activeView === 'Signals' && <SignalsView />}
          {activeView === 'Reports' && <ReportsView />}
        </ViewErrorBoundary>
      </main>

      {showDesktopIntelligence && (
        <div className="col-start-3 row-start-2 min-h-0">
          <RightPanel />
        </div>
      )}

      {!showDesktopTracking && trackingOpen && (
        <Sheet open={trackingOpen} onOpenChange={setTrackingOpen}>
          <SheetContent side="left" className="w-[min(90vw,18rem)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Tracking</SheetTitle>
            </SheetHeader>
            <LeftPanel />
          </SheetContent>
        </Sheet>
      )}

      {!showDesktopIntelligence && intelligenceOpen && (
        <Sheet open={intelligenceOpen} onOpenChange={setIntelligenceOpen}>
          <SheetContent side="right" className="w-[min(90vw,18rem)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Intelligence</SheetTitle>
            </SheetHeader>
            <RightPanel />
          </SheetContent>
        </Sheet>
      )}

      <AlertToastContainer />
      <BottomBar />
    </div>
  )
}
