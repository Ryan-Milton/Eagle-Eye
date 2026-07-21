import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { usePortStore } from '@/stores/port-store'
import type { Port } from '@/lib/ports-client'
import { TypeToggle } from './shared'

const SIZE_LABELS: Record<string, string> = { large: 'Large', medium: 'Medium', small: 'Small' }

export function PortSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { ports, version, count, visible, setVisible } = usePortStore()
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set())

  const toggleSizeExpand = (size: string) => {
    setExpandedSizes(prev => {
      const next = new Set(prev)
      if (next.has(size)) next.delete(size); else next.add(size)
      return next
    })
  }

  const portsBySize = useMemo(() => {
    void version
    const groups = new Map<string, Port[]>()
    for (const size of ['large', 'medium', 'small']) groups.set(size, [])
    for (const p of ports.values()) {
      const arr = groups.get(p.size)
      if (arr) arr.push(p)
    }
    return groups
  }, [ports, version])

  const hasData = count > 0

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        aria-expanded={expanded}
        className="flex min-h-10 w-full items-center gap-2 border-b border-line-muted px-3.5 transition-colors hover:bg-panel-raised"
      >
        <span className="text-[11px] text-muted-foreground" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="neo-kicker flex-1 text-left text-domain-port">Ports</span>
        <span className={cn('neo-data text-[9px] uppercase', hasData ? 'text-success' : 'text-muted-foreground')}>{hasData ? 'Ready' : 'Idle'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        <TypeToggle on={visible} color="var(--domain-port)" label="ports" onClick={() => setVisible(!visible)} />
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {['large', 'medium', 'small'].map(size => {
            const sizePorts = portsBySize.get(size) ?? []
            const isExpanded = expandedSizes.has(size)
            const dotColor = 'var(--domain-port)'

            return (
              <div key={size}>
                <div className="flex items-center border-b border-line-muted">
                  <button
                    onClick={() => sizePorts.length > 0 && toggleSizeExpand(size)}
                    className="flex min-h-9 flex-1 items-center gap-2 py-1 pl-4 pr-1 text-left transition-colors hover:bg-panel-raised"
                  >
                    <span className="inline-block size-2 flex-shrink-0 border border-domain-port" style={{ backgroundColor: dotColor }} />
                    <span className="flex-1 font-mono text-xs text-foreground">
                      {SIZE_LABELS[size]}
                    </span>
                    <span className="neo-data text-[11px] text-muted-foreground">{sizePorts.length}</span>
                    {sizePorts.length > 0 && <span className="text-[11px] text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>}
                  </button>
                </div>

                {isExpanded && sizePorts.length > 0 && (
                  <div className="neo-scrollbar max-h-[200px] overflow-y-auto">
                    {sizePorts.slice(0, 200).map(port => (
                      <div
                        key={port.id}
                        className="flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1 pl-7 pr-3 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-mono text-[11px] text-foreground">{port.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{port.country} · {port.harborType}</div>
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
