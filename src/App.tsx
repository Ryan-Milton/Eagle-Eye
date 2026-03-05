import { useState, useRef, useCallback } from 'react'
import { TopBar } from '@/components/panels/TopBar'
import { BottomBar } from '@/components/panels/BottomBar'
import { LeftPanel } from '@/components/panels/LeftPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { GlobeView } from '@/components/globe/GlobeView'
import { MapboxGlobeView } from '@/components/globe/MapboxGlobeView'
import { useConstellationToggles } from '@/hooks/useConstellationToggles'
import { useSatellites } from '@/hooks/useSatellites'
import { useVessels } from '@/hooks/useVessels'
import { useFlights } from '@/hooks/useFlights'
import type { NavView, TrackingMode } from '@/types'

export default function App() {
  const sessionStart = useRef(Date.now()).current
  const [activeView, setActiveView] = useState<NavView>('Globe')
  const [selectedSatId, setSelectedSatId] = useState<number | null>(null)
  const [selectedMmsi, setSelectedMmsi] = useState<number | null>(null)
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null)
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('satellites')
  const { toggles, toggle } = useConstellationToggles()
  const { version, loading, getPositions, getSatellites, getStats } = useSatellites(toggles)
  const { version: vesselVersion, vessels, connected: vesselConnected, vesselCount } = useVessels(true)
  const { version: flightVersion, flights, connected: flightConnected, flightCount } = useFlights(true)

  const getSatelliteCount = useCallback((id: Parameters<typeof getSatellites>[0]) => {
    return getSatellites(id).length
  }, [getSatellites])

  // Mutual exclusion: selecting one type clears the others
  const handleSelectSatellite = useCallback((noradId: number | null) => {
    setSelectedSatId(noradId)
    if (noradId !== null) { setSelectedMmsi(null); setSelectedIcao(null) }
  }, [])

  const handleSelectVessel = useCallback((mmsi: number | null) => {
    setSelectedMmsi(mmsi)
    if (mmsi !== null) { setSelectedSatId(null); setSelectedIcao(null) }
  }, [])

  const handleSelectFlight = useCallback((icao: string | null) => {
    setSelectedIcao(icao)
    if (icao !== null) { setSelectedSatId(null); setSelectedMmsi(null) }
  }, [])

  // Find selected records
  const selectedVessel = selectedMmsi ? vessels.get(selectedMmsi) ?? null : null
  const selectedFlight = selectedIcao ? flights.get(selectedIcao) ?? null : null

  // Find selected satellite record + position
  const selectedSatellite = selectedSatId ? (() => {
    for (const [, sats] of Object.entries([...toggles.keys()])) {
      void sats
    }
    // Search all loaded constellations
    const allSats = [...toggles.keys()].flatMap(id => getSatellites(id))
    return allSats.find(s => s.noradId === selectedSatId) ?? null
  })() : null

  const selectedPosition = selectedSatId ? (() => {
    for (const id of toggles.keys()) {
      const pos = getPositions(id).find(p => p.noradId === selectedSatId)
      if (pos) return pos
    }
    return null
  })() : null

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <TopBar
        activeView={activeView}
        onViewChange={setActiveView}
        sessionStart={sessionStart}
        getStats={getStats}
        vesselCount={vesselCount}
        vesselConnected={vesselConnected}
        flightCount={flightCount}
        flightConnected={flightConnected}
      />
      <LeftPanel
        toggles={toggles}
        onToggle={toggle}
        getSatellites={getSatellites}
        getPositions={getPositions}
        version={version}
        loading={loading}
        selectedSatId={selectedSatId}
        onSelectSatellite={handleSelectSatellite}
        trackingMode={trackingMode}
        onTrackingModeChange={setTrackingMode}
        vessels={vessels}
        vesselCount={vesselCount}
        vesselConnected={vesselConnected}
        vesselVersion={vesselVersion}
        selectedMmsi={selectedMmsi}
        onSelectVessel={handleSelectVessel}
        flights={flights}
        flightCount={flightCount}
        flightConnected={flightConnected}
        flightVersion={flightVersion}
        selectedIcao={selectedIcao}
        onSelectFlight={handleSelectFlight}
      />
      {activeView === 'Globe' && (
        <GlobeView
          toggles={toggles}
          getPositions={getPositions}
          version={version}
          selectedSatId={selectedSatId}
          onSatelliteClick={handleSelectSatellite}
          onToggle={toggle}
          loading={loading}
          getSatelliteCount={getSatelliteCount}
          vesselLayer={{
            enabled: true,
            vessels,
            version: vesselVersion,
            selectedMmsi,
            onVesselClick: handleSelectVessel,
          }}
          flightLayer={{
            enabled: true,
            flights,
            version: flightVersion,
            selectedIcao,
            onFlightClick: handleSelectFlight,
          }}
        />
      )}
      {activeView === 'Map' && (
        <MapboxGlobeView
          toggles={toggles}
          getPositions={getPositions}
          version={version}
          vessels={vessels}
          vesselVersion={vesselVersion}
          flights={flights}
          flightVersion={flightVersion}
          selectedSatId={selectedSatId}
          onSatelliteClick={handleSelectSatellite}
          selectedMmsi={selectedMmsi}
          onVesselClick={handleSelectVessel}
          selectedIcao={selectedIcao}
          onFlightClick={handleSelectFlight}
        />
      )}
      <RightPanel
        satellite={selectedSatellite}
        position={selectedPosition}
        vessel={selectedVessel}
        flight={selectedFlight}
      />
      <BottomBar sessionStart={sessionStart} />
    </div>
  )
}
