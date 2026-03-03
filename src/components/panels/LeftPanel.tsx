import { useState } from 'react'
import { Pip } from '@/components/ui/Pip'
import { Badge } from '@/components/ui/Badge'
import { ENTITIES, SYSTEM_STATUS } from '@/data'
import { cn } from '@/lib/utils'
import type { Entity, FilterTab } from '@/types'

const FILTER_TABS: FilterTab[] = ['All', 'Person', 'Vehicle', 'Signal']

const TYPE_STYLES: Record<Entity['type'], { bg: string; text: string }> = {
  person:   { bg: 'bg-blue-950/50',   text: 'text-blue-400' },
  vehicle:  { bg: 'bg-yellow-950/50', text: 'text-yellow-400' },
  location: { bg: 'bg-green-950/50',  text: 'text-green-400' },
  signal:   { bg: 'bg-orange-950/50', text: 'text-orange-400' },
}

const CONF_PIP: Record<Entity['conf'], 'ok' | 'warn' | 'danger'> = {
  high: 'ok', med: 'warn', low: 'danger',
}

interface LeftPanelProps {
  selectedId: string | null
  onSelect: (entity: Entity) => void
}

export function LeftPanel({ selectedId, onSelect }: LeftPanelProps) {
  const [filter, setFilter] = useState<FilterTab>('All')
  const [query, setQuery]   = useState('')

  const filtered = ENTITIES.filter(e => {
    if (filter !== 'All' && e.type !== filter.toLowerCase()) return false
    if (query && !e.name.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  return (
    <aside className="fixed top-[46px] left-0 bottom-[34px] w-64 bg-zinc-900 border-r border-zinc-800 z-40 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[10px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">
          Tracked Objects
        </span>
        <Badge variant="default">{ENTITIES.length}</Badge>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 border-b border-zinc-800 flex-shrink-0">
        {[
          { val: SYSTEM_STATUS.activeTracks, label: 'Active Tracks', color: 'text-zinc-50' },
          { val: SYSTEM_STATUS.priority,     label: 'Priority',      color: 'text-red-400' },
          { val: `${SYSTEM_STATUS.avgConfidence}%`, label: 'Avg Confidence', color: 'text-orange-400' },
          { val: SYSTEM_STATUS.feedStatus,   label: 'Feed Status',   color: 'text-green-400' },
        ].map(({ val, label, color }, i) => (
          <div
            key={label}
            className={cn(
              'p-2.5 border-zinc-800',
              i % 2 === 0 ? 'border-r' : '',
              i < 2 ? 'border-b' : '',
            )}
          >
            <div className={cn('font-display text-xl font-semibold leading-none mb-1', color)}>
              {val}
            </div>
            <div className="text-[9px] font-medium tracking-[1.5px] text-zinc-600 uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-2.5 pt-2.5 flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search entities…"
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-50 text-[11px] pl-7 pr-2.5 py-1.5 rounded-sm outline-none placeholder-zinc-700 focus:border-orange-800 transition-colors"
          />
          {/* search icon */}
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" width="11" height="11" viewBox="0 0 11 11" fill="none">
            <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-2.5 py-2 border-b border-zinc-800 flex-shrink-0">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              'font-display text-[10px] font-medium tracking-[1.5px] uppercase px-2.5 py-1 border rounded-sm transition-all',
              filter === tab
                ? 'text-orange-400 border-orange-800/60 bg-orange-950/40'
                : 'text-zinc-600 border-zinc-700 hover:text-zinc-400 hover:border-zinc-600',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Entity list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {filtered.map(entity => {
          const styles = TYPE_STYLES[entity.type]
          const isSelected = entity.id === selectedId
          return (
            <button
              key={entity.id}
              onClick={() => onSelect(entity)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3.5 py-2.5 border-b border-zinc-800/60',
                'text-left transition-colors',
                isSelected
                  ? 'bg-orange-950/20 border-l-2 border-l-orange-500 pl-3'
                  : 'hover:bg-zinc-800/50',
              )}
            >
              {/* Type badge */}
              <div className={cn('w-[26px] h-[26px] rounded-sm flex items-center justify-center text-[11px] flex-shrink-0', styles.bg, styles.text)}>
                {entity.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-display text-xs font-semibold tracking-[0.5px] text-zinc-50 truncate">
                  {entity.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[9px] text-zinc-600">{entity.id}</span>
                  <Badge
                    variant={entity.conf === 'high' ? 'ok' : entity.conf === 'med' ? 'warn' : 'danger'}
                    className="text-[8px]"
                  >
                    {entity.conf}
                  </Badge>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Pip color={CONF_PIP[entity.conf]} />
                <span className="font-mono text-[9px] text-zinc-600">{entity.time}</span>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
