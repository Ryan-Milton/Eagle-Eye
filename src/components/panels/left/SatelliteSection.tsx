import { useState, useMemo } from 'react'
import { CONSTELLATIONS, CATEGORY_LABELS } from '@/data/constellations'
import { cn } from '@/lib/utils'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useSelectionStore } from '@/stores/selection-store'
import { MasterToggle, TypeToggle } from './shared'
import { PipelineError } from '@/components/ui/PipelineError'
import type { SatCategory, ConstellationId } from '@/types'

const CATEGORY_ORDER: SatCategory[] = [
  'station', 'comms', 'nav', 'weather', 'earth-obs', 'scientific', 'military', 'amateur',
]

export function SatelliteSection({ expanded, onToggle: onToggleSection }: { expanded: boolean; onToggle: () => void }) {
  const { toggles, toggle, enableAll, disableAll, version, loading, getPositions, getSatellites } = useSatelliteStore()
  const { selectedSatId, selectSatellite } = useSelectionStore()

  const [expandedCategories, setExpandedCategories] = useState<Set<SatCategory>>(new Set())
  const [expandedConstellations, setExpandedConstellations] = useState<Set<ConstellationId>>(new Set())

  const toggleCategoryExpand = (cat: SatCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  const toggleConstellationExpand = (id: ConstellationId) => {
    setExpandedConstellations(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const satStats = useMemo(() => {
    let tracked = 0, visible = 0, constellations = 0
    for (const c of CONSTELLATIONS) {
      const sats = getSatellites(c.id)
      tracked += sats.length
      if (toggles.get(c.id)) { visible += sats.length; constellations++ }
    }
    return { tracked, visible, constellations }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, toggles, getSatellites])

  const allOn = useMemo(() => [...toggles.values()].every(v => v), [toggles])
  const noneOn = useMemo(() => [...toggles.values()].every(v => !v), [toggles])

  const groupedConstellations = useMemo(() => {
    const map = new Map<SatCategory, typeof CONSTELLATIONS>()
    for (const cat of CATEGORY_ORDER) {
      const consts = CONSTELLATIONS.filter(c => c.category === cat)
      if (consts.length > 0) map.set(cat, consts)
    }
    return map
  }, [])

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggleSection}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSection() } }}
        className="flex min-h-10 w-full items-center gap-2 border-b border-line-muted px-3.5 transition-colors hover:bg-panel-raised"
      >
        <span className="text-[11px] text-muted-foreground" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="neo-kicker flex-1 text-left text-domain-satellite">Satellite</span>
        <PipelineError errors={satStats.tracked === 0 && !loading.size ? ['TLE data not yet loaded'] : []} />
        <span className="neo-data text-[11px] text-muted-foreground">{satStats.visible}/{satStats.tracked}</span>
        <MasterToggle
          allOn={allOn}
          noneOn={noneOn}
          onToggle={() => allOn ? disableAll() : enableAll()}
        />
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {Array.from(groupedConstellations.entries()).map(([cat, consts]) => {
            const isExpanded = expandedCategories.has(cat)
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategoryExpand(cat)}
                  className="flex min-h-9 w-full items-center gap-2 border-b border-line-muted px-3.5 transition-colors hover:bg-panel-raised"
                >
                   <span className="text-[11px] text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>
                   <span className="neo-kicker flex-1 text-left text-muted-foreground">
                    {CATEGORY_LABELS[cat]}
                  </span>
                   <span className="neo-data text-[11px] text-muted-foreground">{consts.length}</span>
                </button>

                {isExpanded && consts.map(c => {
                  const isOn = toggles.get(c.id) ?? false
                  const isLoading = loading.has(c.id)
                  const sats = getSatellites(c.id)
                  const isConstExpanded = expandedConstellations.has(c.id)

                  return (
                    <div key={c.id}>
                       <div className="flex items-center border-b border-line-muted">
                        <button
                          onClick={() => isOn && sats.length > 0 && toggleConstellationExpand(c.id)}
                          className={cn(
                             'flex min-h-9 flex-1 items-center gap-2 py-1 pl-6 pr-1 text-left transition-colors',
                             isOn ? 'hover:bg-panel-raised' : '',
                          )}
                        >
                           <span className={cn('inline-block size-2 flex-shrink-0 border border-domain-satellite', isOn && 'bg-domain-satellite')} />
                           <span className={cn('flex-1 truncate font-mono text-xs', isOn ? 'text-foreground' : 'text-muted-foreground')}>
                            {c.name}
                          </span>
                           {isLoading && <span className="font-mono text-[11px] text-muted-foreground motion-safe:animate-pulse-signal">Loading...</span>}
                           {!isLoading && sats.length > 0 && <span className="neo-data text-[11px] text-muted-foreground">{sats.length}</span>}
                           {isOn && sats.length > 0 && <span className="text-[11px] text-muted-foreground">{isConstExpanded ? '▾' : '▸'}</span>}
                        </button>
                         <TypeToggle on={isOn} color="var(--domain-satellite)" label={c.name} onClick={() => toggle(c.id)} />
                      </div>

                      {isConstExpanded && isOn && sats.length > 0 && (
                         <div className="neo-scrollbar max-h-[200px] overflow-y-auto">
                          {sats.slice(0, 100).map(sat => {
                            const pos = getPositions(c.id).find(p => p.noradId === sat.noradId)
                            const isSelected = sat.noradId === selectedSatId
                            return (
                              <button
                                key={sat.noradId}
                                onClick={() => selectSatellite(isSelected ? null : sat.noradId)}
                                className={cn(
                                   'flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1 pl-8 pr-3 text-left transition-colors',
                                   isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                   <div className="truncate font-mono text-[11px]">{sat.name}</div>
                                   <div className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{sat.noradId}</div>
                                </div>
                                {pos && (
                                  <div className="flex flex-col items-end flex-shrink-0">
                                     <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{pos.alt.toFixed(0)} km</span>
                                     <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{pos.velocity.toFixed(1)} km/s</span>
                                  </div>
                                )}
                              </button>
                            )
                          })}
                          {sats.length > 100 && (
                             <div className="px-8 py-2 font-mono text-[11px] text-muted-foreground">+{sats.length - 100} more...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
