import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useRFStore } from '@/stores/rf-store'
import { getFrequencyBand } from '@/lib/rf-client'
import { MasterToggle, TypeToggle } from './shared'
import type { RFSpot } from '@/types'

type RFSource = 'psk' | 'rbn' | 'satnogs'

const SOURCE_LABELS: Record<RFSource, string> = { psk: 'PSK Reporter', rbn: 'Rev. Beacon', satnogs: 'SatNOGS' }
const SOURCES: RFSource[] = ['psk', 'rbn', 'satnogs']

function formatFreq(hz: number): string {
  if (hz >= 1_000_000_000) return `${(hz / 1_000_000_000).toFixed(1)} GHz`
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(1)} MHz`
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(0)} kHz`
  return `${hz} Hz`
}

function timeAgo(ms: number): string {
  const sec = Math.round((Date.now() - ms) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  return `${hr}h ago`
}

export function RFSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { spots, version, count, sourceToggles, toggleSource } = useRFStore()
  const [expandedSources, setExpandedSources] = useState<Set<RFSource>>(new Set())

  const toggleSourceExpand = (src: RFSource) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(src)) next.delete(src); else next.add(src)
      return next
    })
  }

  const spotsBySource = useMemo(() => {
    void version
    const groups = new Map<RFSource, RFSpot[]>()
    for (const s of SOURCES) groups.set(s, [])
    for (const spot of spots.values()) {
      const arr = groups.get(spot.source)
      if (arr) arr.push(spot)
    }
    return groups
  }, [spots, version])

  const allOn = useMemo(() => SOURCES.every(s => sourceToggles.get(s) !== false), [sourceToggles])
  const noneOn = useMemo(() => SOURCES.every(s => sourceToggles.get(s) === false), [sourceToggles])
  const hasData = count > 0

  return (
    <div>
      <div
        role="button" tabIndex={0} aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="flex min-h-10 w-full items-center gap-2 border-b border-line-muted px-3.5 transition-colors hover:bg-panel-raised"
      >
        <span className="text-[11px] text-muted-foreground" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="neo-kicker flex-1 text-left text-domain-rf">RF Spectrum</span>
        <span className={cn('neo-data text-[9px] uppercase', hasData ? 'text-success' : 'text-muted-foreground')}>{hasData ? 'Live' : 'Idle'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        <MasterToggle
          allOn={allOn}
          noneOn={noneOn}
          onToggle={() => SOURCES.forEach(s => toggleSource(s))}
        />
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {SOURCES.map(src => {
            const srcSpots = spotsBySource.get(src) ?? []
            const isOn = sourceToggles.get(src) !== false
            const isExpanded = expandedSources.has(src)
            const dotColor = 'var(--domain-rf)'
            const sorted = srcSpots.sort((a, b) => b.time - a.time)

            return (
              <div key={src}>
                <div className="flex items-center border-b border-line-muted">
                  <button
                    onClick={() => isOn && srcSpots.length > 0 && toggleSourceExpand(src)}
                    className={cn(
                      'flex min-h-9 flex-1 items-center gap-2 py-1 pl-4 pr-1 text-left transition-colors',
                      isOn ? 'hover:bg-panel-raised' : '',
                    )}
                  >
                    <span className="inline-block size-2 flex-shrink-0 border border-domain-rf" style={{ backgroundColor: isOn ? dotColor : 'transparent' }} />
                    <span className={cn('flex-1 font-mono text-xs', isOn ? 'text-foreground' : 'text-muted-foreground')}>
                      {SOURCE_LABELS[src]}
                    </span>
                    <span className="neo-data text-[11px] text-muted-foreground">{srcSpots.length}</span>
                    {isOn && srcSpots.length > 0 && <span className="text-[11px] text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>}
                  </button>
                  <TypeToggle on={isOn} color={dotColor} label={SOURCE_LABELS[src]} onClick={() => toggleSource(src)} />
                </div>

                {isExpanded && isOn && sorted.length > 0 && (
                  <div className="neo-scrollbar max-h-[200px] overflow-y-auto">
                    {sorted.slice(0, 200).map(spot => (
                      <div
                        key={spot.id}
                        className="flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1 pl-7 pr-3 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-mono text-[11px] text-foreground">
                            {spot.txCall} → {spot.rxCall}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="neo-data text-[10px] text-muted-foreground">{formatFreq(spot.frequency)}</span>
                            <span className="font-mono text-[10px] text-domain-rf">{getFrequencyBand(spot.frequency)}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{spot.mode}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="neo-data text-[11px] text-muted-foreground">{timeAgo(spot.time)}</span>
                          {spot.snr > 0 && <span className="neo-data text-[10px] text-muted-foreground">{spot.snr}dB</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
