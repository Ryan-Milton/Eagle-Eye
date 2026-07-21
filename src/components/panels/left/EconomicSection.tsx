import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useEconomicStore } from '@/stores/economic-store'
import { ECONOMIC_INDICATORS } from '@/lib/economic-client'
import type { EconomicIndicator } from '@/lib/economic-client'
import { PipelineError } from '@/components/ui/PipelineError'

function formatValue(value: number | null, indicatorId: string): string {
  if (value == null) return '—'
  if (indicatorId === 'NY.GDP.MKTP.CD' || indicatorId === 'BN.CAB.XOKA.CD') {
    const abs = Math.abs(value)
    const sign = value < 0 ? '-' : ''
    if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`
    return `${sign}$${abs.toFixed(0)}`
  }
  return `${value.toFixed(1)}%`
}

export function EconomicSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { indicators, version, count, errors, selectedIndicator, setSelectedIndicator } = useEconomicStore()

  const byIndicator = useMemo(() => {
    void version
    const groups = new Map<string, EconomicIndicator[]>()
    for (const ind of ECONOMIC_INDICATORS) groups.set(ind.id, [])
    for (const entry of indicators.values()) {
      const arr = groups.get(entry.indicatorId)
      if (arr) arr.push(entry)
    }
    return groups
  }, [indicators, version])

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
        <span className="neo-kicker flex-1 text-left text-domain-economic">Economic</span>
        <PipelineError errors={errors} />
        <span className={cn('neo-data text-[9px] uppercase', hasData ? 'text-success' : 'text-muted-foreground')}>{hasData ? 'Ready' : 'Idle'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {/* Indicator selector */}
          <div className="border-b border-line-muted p-3">
            <select
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className="min-h-9 w-full border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-focus"
            >
              {ECONOMIC_INDICATORS.map(ind => (
                <option key={ind.id} value={ind.id}>{ind.name}</option>
              ))}
            </select>
          </div>

          {/* Country list for selected indicator */}
          <div className="neo-scrollbar max-h-[300px] overflow-y-auto">
            {(() => {
              const entries = byIndicator.get(selectedIndicator) ?? []
              const sorted = [...entries].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
              const dotColor = 'var(--domain-economic)'

              return sorted.slice(0, 200).map(entry => (
                <div
                  key={entry.id}
                  className="flex min-h-9 w-full items-center gap-2 border-b border-line-muted py-1.5 pl-4 pr-3 text-left"
                >
                  <span className="inline-block size-2 flex-shrink-0 border border-domain-economic" style={{ backgroundColor: dotColor }} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-mono text-[11px] text-foreground">{entry.country}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{entry.countryCode} · {entry.year}</div>
                  </div>
                  <span className="neo-data flex-shrink-0 text-[11px] text-foreground">
                    {formatValue(entry.value, entry.indicatorId)}
                  </span>
                </div>
              ))
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
