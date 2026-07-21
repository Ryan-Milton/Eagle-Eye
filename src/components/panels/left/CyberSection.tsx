import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CYBER_EVENT_TYPES, CYBER_EVENT_LABELS } from '@/types'
import type { CyberEvent, CyberEventType } from '@/types'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { ConfidencePip } from '@/components/ui/ConfidencePip'
import { computeConfidence } from '@/lib/confidence'
import { useCyberStore } from '@/stores/cyber-store'
import { useSelectionStore } from '@/stores/selection-store'
import { MasterToggle, TypeToggle } from './shared'
import { PipelineError } from '@/components/ui/PipelineError'

function timeAgo(ms: number): string {
  const sec = Math.round((Date.now() - ms) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

export function CyberSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { events, version, count, errors, typeToggles, toggleType, enableAllTypes, disableAllTypes } = useCyberStore()
  const { selectedCyberId, selectCyber } = useSelectionStore()

  const [expandedTypes, setExpandedTypes] = useState<Set<CyberEventType>>(new Set())

  const toggleTypeExpand = (type: CyberEventType) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  const eventsByType = useMemo(() => {
    void version
    const counts = new Map<CyberEventType, CyberEvent[]>()
    for (const t of CYBER_EVENT_TYPES) counts.set(t, [])
    for (const e of events.values()) {
      const arr = counts.get(e.type)
      if (arr) arr.push(e)
    }
    return counts
  }, [events, version])

  const allOn = useMemo(() => [...typeToggles.values()].every(v => v), [typeToggles])
  const noneOn = useMemo(() => [...typeToggles.values()].every(v => !v), [typeToggles])

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
        <span className="neo-kicker flex-1 text-left text-domain-cyber">Cyber Threats</span>
        <PipelineError errors={errors} />
        <span className={cn('neo-data text-[9px] uppercase', hasData ? 'text-success' : 'text-muted-foreground')}>{hasData ? 'Live' : 'Idle'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        <MasterToggle
          allOn={allOn}
          noneOn={noneOn}
          onToggle={() => allOn ? disableAllTypes() : enableAllTypes()}
        />
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {CYBER_EVENT_TYPES.map(type => {
            const typeEvents = eventsByType.get(type) ?? []
            const isOn = typeToggles.get(type) ?? true
            const isExpanded = expandedTypes.has(type)
            const dotColor = 'var(--domain-cyber)'

            const sorted = typeEvents.sort((a, b) => b.time - a.time)

            return (
              <div key={type}>
                <div className="flex items-center border-b border-line-muted">
                  <button
                    onClick={() => isOn && typeEvents.length > 0 && toggleTypeExpand(type)}
                    className={cn(
                      'flex min-h-9 flex-1 items-center gap-2 py-1 pl-4 pr-1 text-left transition-colors',
                      isOn ? 'hover:bg-panel-raised' : '',
                    )}
                  >
                    <span className="inline-block size-2 flex-shrink-0 border border-domain-cyber" style={{ backgroundColor: isOn ? dotColor : 'transparent' }} />
                    <span className={cn('flex-1 font-mono text-xs', isOn ? 'text-foreground' : 'text-muted-foreground')}>
                      {CYBER_EVENT_LABELS[type]}
                    </span>
                    <span className="neo-data text-[11px] text-muted-foreground">{typeEvents.length}</span>
                    {isOn && typeEvents.length > 0 && <span className="text-[11px] text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>}
                  </button>
                  <TypeToggle on={isOn} color={dotColor} label={CYBER_EVENT_LABELS[type]} onClick={() => toggleType(type)} />
                </div>

                {isExpanded && isOn && sorted.length > 0 && (
                  <div className="neo-scrollbar max-h-[200px] overflow-y-auto">
                    {sorted.slice(0, 200).map(event => {
                      const isSelected = event.id === selectedCyberId
                      return (
                        <button
                          key={event.id}
                          onClick={() => selectCyber(isSelected ? null : event.id)}
                          className={cn(
                            'flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1 pl-7 pr-3 text-left transition-colors',
                            isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-mono text-[11px]">{event.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn(
                                'border px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider',
                                isSelected ? 'border-signal-foreground/50' : 'border-domain-cyber text-domain-cyber',
                              )}>
                                {event.type}
                              </span>
                              <SourceBadge source={event.source} />
                              <ConfidencePip level={computeConfidence({ source: event.source, time: event.time, severity: event.severity })} />
                              <span className={cn('neo-data text-[10px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>sev {event.severity}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className={cn('neo-data text-[11px]', isSelected ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{timeAgo(event.time)}</span>
                          </div>
                        </button>
                      )
                    })}
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
