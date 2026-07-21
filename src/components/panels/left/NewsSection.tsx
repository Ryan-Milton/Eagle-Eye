import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from '@/types'
import type { NewsEvent, NewsCategory } from '@/types'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { ConfidencePip } from '@/components/ui/ConfidencePip'
import { computeConfidence } from '@/lib/confidence'
import { useNewsStore } from '@/stores/news-store'
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

export function NewsSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { events, version, count, errors, categoryToggles, toggleCategory, enableAllCategories, disableAllCategories } = useNewsStore()
  const { selectedNewsId, selectNews } = useSelectionStore()

  const [expandedCats, setExpandedCats] = useState<Set<NewsCategory>>(new Set())

  const toggleCatExpand = (cat: NewsCategory) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  const eventsByCat = useMemo(() => {
    void version
    const counts = new Map<NewsCategory, NewsEvent[]>()
    for (const t of NEWS_CATEGORIES) counts.set(t, [])
    for (const e of events.values()) {
      const arr = counts.get(e.category)
      if (arr) arr.push(e)
    }
    return counts
  }, [events, version])

  const allOn = useMemo(() => [...categoryToggles.values()].every(v => v), [categoryToggles])
  const noneOn = useMemo(() => [...categoryToggles.values()].every(v => !v), [categoryToggles])

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
        <span className="neo-kicker flex-1 text-left text-domain-news">News & Events</span>
        <PipelineError errors={errors} />
        <span className={cn('neo-data text-[9px] uppercase', hasData ? 'text-success' : 'text-muted-foreground')}>{hasData ? 'Live' : 'Idle'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        <MasterToggle
          allOn={allOn}
          noneOn={noneOn}
          onToggle={() => allOn ? disableAllCategories() : enableAllCategories()}
        />
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {NEWS_CATEGORIES.map(cat => {
            const catEvents = eventsByCat.get(cat) ?? []
            const isOn = categoryToggles.get(cat) ?? true
            const isExpanded = expandedCats.has(cat)
            const dotColor = 'var(--domain-news)'

            const sorted = catEvents.sort((a, b) => b.time - a.time)

            return (
              <div key={cat}>
                <div className="flex items-center border-b border-line-muted">
                  <button
                    onClick={() => isOn && catEvents.length > 0 && toggleCatExpand(cat)}
                    className={cn(
                      'flex min-h-9 flex-1 items-center gap-2 py-1 pl-4 pr-1 text-left transition-colors',
                      isOn ? 'hover:bg-panel-raised' : '',
                    )}
                  >
                    <span className="inline-block size-2 flex-shrink-0 border border-domain-news" style={{ backgroundColor: isOn ? dotColor : 'transparent' }} />
                    <span className={cn('flex-1 font-mono text-xs', isOn ? 'text-foreground' : 'text-muted-foreground')}>
                      {NEWS_CATEGORY_LABELS[cat]}
                    </span>
                    <span className="neo-data text-[11px] text-muted-foreground">{catEvents.length}</span>
                    {isOn && catEvents.length > 0 && <span className="text-[11px] text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>}
                  </button>
                  <TypeToggle on={isOn} color={dotColor} label={NEWS_CATEGORY_LABELS[cat]} onClick={() => toggleCategory(cat)} />
                </div>

                {isExpanded && isOn && sorted.length > 0 && (
                  <div className="neo-scrollbar max-h-[200px] overflow-y-auto">
                    {sorted.slice(0, 200).map(event => {
                      const isSelected = event.id === selectedNewsId
                      return (
                        <button
                          key={event.id}
                          onClick={() => selectNews(isSelected ? null : event.id)}
                          className={cn(
                            'flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1 pl-7 pr-3 text-left transition-colors',
                            isSelected ? 'border-l-2 border-l-signal bg-signal text-signal-foreground' : 'hover:bg-panel-raised',
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-mono text-[11px]">{event.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <SourceBadge source={event.source} />
                              <ConfidencePip level={computeConfidence({ source: event.source, time: event.time })} />
                              {event.tone < -3 && <span className="font-mono text-[9px] text-danger">NEG</span>}
                              {event.tone > 3 && <span className="font-mono text-[9px] text-success">POS</span>}
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
