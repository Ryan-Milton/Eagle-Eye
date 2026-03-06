import { useState } from 'react'
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
import { SearchResults } from './SearchResults'

type SectionId = 'satellites' | 'maritime' | 'aircraft' | 'weather' | 'news' | 'conflicts' | 'cyber' | 'osint' | 'ports' | 'rf' | 'economic' | 'cameras'

export function LeftPanel() {
  const [expandedSections, setExpandedSections] = useState<Set<SectionId>>(new Set())
  const [globalQuery, setGlobalQuery] = useState('')

  const toggleSection = (id: SectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const isSearching = globalQuery.length > 0

  return (
    <aside className="fixed top-[46px] left-0 bottom-[34px] w-64 bg-zinc-900 border-r border-zinc-800 z-40 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[12px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">Tracking</span>
      </div>

      <SearchInput value={globalQuery} onChange={setGlobalQuery} placeholder="Search all entities..." focusColor="focus:border-orange-800" />

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
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
          </>
        )}
      </div>
    </aside>
  )
}
