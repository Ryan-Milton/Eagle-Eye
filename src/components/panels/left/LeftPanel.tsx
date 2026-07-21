import { useState, useEffect, useCallback } from 'react'
import { SearchInput } from './shared'
import { SatelliteSection } from './SatelliteSection'
import { MaritimeSection } from './MaritimeSection'
import { AircraftSection } from './AircraftSection'
import { WeatherSection } from './WeatherSection'
import { NewsSection } from './NewsSection'
import { ConflictSection } from './ConflictSection'
import { CyberSection } from './CyberSection'
// import { OsintSection } from './OsintSection'
import { PortSection } from './PortSection'
import { RFSection } from './RFSection'
// import { EconomicSection } from './EconomicSection'
import { CameraSection } from './CameraSection'
import { InfrastructureSection } from './InfrastructureSection'
import { SearchResults } from './SearchResults'

type SectionId = 'satellites' | 'maritime' | 'aircraft' | 'weather' | 'news' | 'conflicts' | 'cyber' | 'osint' | 'ports' | 'rf' | 'economic' | 'cameras' | 'infrastructure'

const STORAGE_KEY = 'eagle-eye-expanded-sections'

function loadExpandedSections(): Set<SectionId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return new Set(JSON.parse(raw) as SectionId[])
  } catch { /* ignore */ }
  return new Set()
}

export function LeftPanel() {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(loadExpandedSections)
  const [globalQuery, setGlobalQuery] = useState('')

  // Persist expanded sections to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedSections]))
  }, [expandedSections])

  const toggleSection = useCallback((id: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const isSearching = globalQuery.length > 0

  return (
    <aside className="relative flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-line bg-panel">
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-line px-3.5">
        <span className="neo-kicker text-muted-foreground">Tracking</span>
      </div>

      <SearchInput value={globalQuery} onChange={setGlobalQuery} placeholder="Search all entities..." />

      <div className="neo-scrollbar flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResults query={globalQuery} />
        ) : (
          <>
            <SatelliteSection expanded={expandedSections.has('satellites')} onToggle={() => toggleSection('satellites')} />
            <MaritimeSection expanded={expandedSections.has('maritime')} onToggle={() => toggleSection('maritime')} />
            <AircraftSection expanded={expandedSections.has('aircraft')} onToggle={() => toggleSection('aircraft')} />
            <WeatherSection expanded={expandedSections.has('weather')} onToggle={() => toggleSection('weather')} />
            <NewsSection expanded={expandedSections.has('news')} onToggle={() => toggleSection('news')} />
            <ConflictSection expanded={expandedSections.has('conflicts')} onToggle={() => toggleSection('conflicts')} />
            <CyberSection expanded={expandedSections.has('cyber')} onToggle={() => toggleSection('cyber')} />
            {/* <OsintSection /> */}
            <PortSection expanded={expandedSections.has('ports')} onToggle={() => toggleSection('ports')} />
            <RFSection expanded={expandedSections.has('rf')} onToggle={() => toggleSection('rf')} />
            {/* <EconomicSection expanded={expandedSections.has('economic')} onToggle={() => toggleSection('economic')} /> */}
            <CameraSection expanded={expandedSections.has('cameras')} onToggle={() => toggleSection('cameras')} />
            <InfrastructureSection expanded={expandedSections.has('infrastructure')} onToggle={() => toggleSection('infrastructure')} />
          </>
        )}
      </div>
    </aside>
  )
}
