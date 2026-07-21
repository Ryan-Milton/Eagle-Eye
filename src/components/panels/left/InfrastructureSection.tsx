import { cn } from '@/lib/utils'
import {
  useInfrastructureStore,
  INFRASTRUCTURE_LAYERS,
  INFRASTRUCTURE_LABELS,
  type InfrastructureLayerType,
} from '@/stores/infrastructure-store'
import { TypeToggle } from './shared'

const LAYER_ICONS: Record<InfrastructureLayerType, string> = {
  cables: '〰',
  pipelines: '═',
  nuclear: '☢',
  chokepoints: '◇',
}

export function InfrastructureSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { toggles, toggle } = useInfrastructureStore()
  const enabledCount = INFRASTRUCTURE_LAYERS.filter(l => toggles.get(l)).length

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
        <span className="neo-kicker flex-1 text-left text-domain-infrastructure">Infrastructure</span>
        <span className={cn('neo-data text-[9px] uppercase', enabledCount > 0 ? 'text-success' : 'text-muted-foreground')}>{enabledCount > 0 ? 'On' : 'Off'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{enabledCount}/{INFRASTRUCTURE_LAYERS.length}</span>
      </div>

      {expanded && (
        <div className="border-b border-line-muted bg-background">
          {INFRASTRUCTURE_LAYERS.map(layer => {
            const enabled = toggles.get(layer) ?? false
            return (
              <div
                key={layer}
                className="flex min-h-10 items-center gap-2 border-b border-line-muted py-1 pl-5 pr-1 transition-colors hover:bg-panel-raised"
              >
                <span className="w-4 text-center text-[12px] text-domain-infrastructure">{LAYER_ICONS[layer]}</span>
                <span className="flex-1 font-mono text-[11px] text-foreground">{INFRASTRUCTURE_LABELS[layer]}</span>
                <TypeToggle on={enabled} color="var(--domain-infrastructure)" label={INFRASTRUCTURE_LABELS[layer]} onClick={() => toggle(layer)} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
