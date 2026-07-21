import { cn } from '@/lib/utils'

export function MasterToggle({ allOn, noneOn, onToggle }: { allOn: boolean; noneOn: boolean; onToggle: () => void }) {
  const indeterminate = !allOn && !noneOn
  return (
    <button
      type="button"
      aria-label={allOn ? 'Disable all layers' : 'Enable all layers'}
      aria-pressed={allOn}
      onClick={e => { e.stopPropagation(); onToggle() }}
      className="grid size-9 flex-shrink-0 place-items-center text-muted-foreground hover:bg-panel-raised hover:text-foreground"
    >
      <span className={cn(
        'inline-flex size-5 items-center justify-center border transition-colors',
        allOn ? 'border-signal bg-signal text-signal-foreground' : indeterminate ? 'border-line bg-muted text-foreground' : 'border-line-muted bg-background',
      )}>
        {allOn && (
          <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
        {indeterminate && (
          <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
            <line x1="3" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="px-2.5 pt-2 pb-1.5 flex-shrink-0">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-9 w-full border border-input bg-background py-1 pl-8 pr-2.5 font-mono text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-focus focus:ring-1 focus:ring-focus"
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
          <line x1="7.5" y1="7.5" x2="10" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

export function TypeToggle({ on, color, label, onClick }: { on: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${on ? 'Hide' : 'Show'} ${label}`}
      aria-pressed={on}
      onClick={e => { e.stopPropagation(); onClick() }}
      className="grid size-9 flex-shrink-0 place-items-center text-muted-foreground hover:bg-panel-raised"
    >
      <span className={cn(
        'inline-flex size-5 items-center justify-center border transition-colors',
        on ? 'border-current' : 'border-line-muted bg-background',
      )} style={on ? { backgroundColor: color, borderColor: color } : undefined}>
        {on && (
          <svg viewBox="0 0 12 12" className="w-full h-full" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--background)" strokeWidth="1.5" />
          </svg>
        )}
      </span>
    </button>
  )
}
