import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAlertRuleStore, type AlertRule, type RuleTrigger } from '@/stores/alert-rule-store'
import { useGeofenceStore } from '@/stores/geofence-store'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'

const TRIGGER_LABELS: Record<RuleTrigger, string> = {
  domain: 'Domain Filter',
  severity: 'Severity Threshold',
  keyword: 'Keyword Match',
  geofence: 'Geofence + Domain',
  proximity: 'Proximity Alert',
}

const DOMAINS = ['vessel', 'flight', 'weather', 'conflict', 'cyber', 'satellite']
const SEVERITIES: AlertRule['alertSeverity'][] = ['info', 'warning', 'critical']
const inputClass = 'mt-1 min-h-9 w-full border border-input bg-background px-2 font-mono text-[11px] text-foreground outline-none focus:border-focus focus:ring-1 focus:ring-focus'
const labelClass = 'neo-kicker text-muted-foreground'

export function AlertRuleEditor({ onClose }: { onClose: () => void }) {
  const { addRule } = useAlertRuleStore()
  const geofences = useGeofenceStore(s => s.geofences)

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState<RuleTrigger>('domain')
  const [alertSeverity, setAlertSeverity] = useState<AlertRule['alertSeverity']>('warning')

  // Domain trigger
  const [selectedDomains, setSelectedDomains] = useState<string[]>([])

  // Severity trigger
  const [severityThreshold, setSeverityThreshold] = useState(5)

  // Keyword trigger
  const [keywordInput, setKeywordInput] = useState('')

  // Geofence trigger
  const [geofenceId, setGeofenceId] = useState('')
  const [geofenceDomain, setGeofenceDomain] = useState('')

  // Proximity trigger
  const [proxLat, setProxLat] = useState('')
  const [proxLon, setProxLon] = useState('')
  const [proxRadius, setProxRadius] = useState('50')
  const [proxDomain, setProxDomain] = useState('')

  const toggleDomain = (d: string) => {
    setSelectedDomains(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  const handleSave = () => {
    if (!name.trim()) return

    const rule: Omit<AlertRule, 'id'> = {
      name: name.trim(),
      enabled: true,
      trigger,
      alertSeverity,
    }

    switch (trigger) {
      case 'domain':
        rule.domains = selectedDomains
        break
      case 'severity':
        rule.severityThreshold = severityThreshold
        break
      case 'keyword':
        rule.keywords = keywordInput.split(',').map(k => k.trim()).filter(Boolean)
        break
      case 'geofence':
        rule.geofenceId = geofenceId
        rule.geofenceDomain = geofenceDomain || undefined
        break
      case 'proximity':
        rule.proximityLat = parseFloat(proxLat)
        rule.proximityLon = parseFloat(proxLon)
        rule.proximityRadiusKm = parseFloat(proxRadius)
        rule.proximityDomain = proxDomain || undefined
        break
    }

    addRule(rule)
    onClose()
  }

  return (
    <div className="space-y-3 border border-line bg-panel p-3">
      <div className="flex items-center justify-between">
        <span className="neo-kicker text-foreground">New Alert Rule</span>
        <button type="button" onClick={onClose} aria-label="Close rule editor" className="grid size-9 place-items-center border border-line-muted bg-background font-mono text-xs text-muted-foreground hover:bg-signal hover:text-signal-foreground">X</button>
      </div>

      {/* Rule name */}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Rule name..."
        aria-label="Rule name"
        className={inputClass}
      />

      {/* Trigger type */}
      <div>
        <div className={labelClass}>Trigger</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {(Object.keys(TRIGGER_LABELS) as RuleTrigger[]).map(t => (
            <button
              key={t}
              onClick={() => setTrigger(t)}
              className={cn(
                'min-h-9 border px-2 font-mono text-[10px] uppercase transition-colors',
                trigger === t
                  ? 'border-signal bg-signal text-signal-foreground'
                  : 'border-line-muted bg-background text-muted-foreground hover:border-line hover:text-foreground',
              )}
            >
              {TRIGGER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Trigger-specific config */}
      <div className="space-y-2">
        {trigger === 'domain' && (
          <div>
            <div className={labelClass}>Match domains</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {DOMAINS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleDomain(d)}
                  className={cn(
                    'min-h-9 border px-2 font-mono text-[10px] uppercase transition-colors',
                    selectedDomains.includes(d)
                      ? 'border-signal bg-signal text-signal-foreground'
                      : 'border-line-muted bg-background text-muted-foreground',
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {trigger === 'severity' && (
          <div>
            <label className={labelClass}>
              Min severity: {severityThreshold}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={severityThreshold}
              onChange={e => setSeverityThreshold(parseInt(e.target.value))}
              className="mt-2 min-h-9 w-full accent-signal"
            />
          </div>
        )}

        {trigger === 'keyword' && (
          <div>
            <label className={labelClass}>Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              placeholder="nuclear, missile, explosion"
              className={inputClass}
            />
          </div>
        )}

        {trigger === 'geofence' && (
          <div className="space-y-2">
            <div>
              <label className={labelClass}>Geofence</label>
              <select
                value={geofenceId}
                onChange={e => setGeofenceId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select zone...</option>
                {geofences.map(gf => (
                  <option key={gf.id} value={gf.id}>{gf.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Domain filter (optional)</label>
              <select
                value={geofenceDomain}
                onChange={e => setGeofenceDomain(e.target.value)}
                className={inputClass}
              >
                <option value="">All domains</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        {trigger === 'proximity' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelClass}>Lat</label>
                <input
                  type="number"
                  step="0.01"
                  value={proxLat}
                  onChange={e => setProxLat(e.target.value)}
                  placeholder="33.5"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Lon</label>
                <input
                  type="number"
                  step="0.01"
                  value={proxLon}
                  onChange={e => setProxLon(e.target.value)}
                  placeholder="44.0"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Radius (km)</label>
                <input
                  type="number"
                  value={proxRadius}
                  onChange={e => setProxRadius(e.target.value)}
                  placeholder="50"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Domain filter (optional)</label>
              <select
                value={proxDomain}
                onChange={e => setProxDomain(e.target.value)}
                className={inputClass}
              >
                <option value="">All domains</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Alert severity */}
      <div>
        <div className={labelClass}>Alert severity</div>
        <div className="flex gap-1 mt-1">
          {SEVERITIES.map(s => (
            <button
              key={s}
              onClick={() => setAlertSeverity(s)}
              className={cn(
                'min-h-9 border px-2 font-mono text-[10px] uppercase transition-colors',
                alertSeverity === s
                  ? s === 'critical' ? 'border-danger bg-danger text-background'
                    : s === 'warning' ? 'border-warning bg-warning text-background'
                    : 'border-info bg-info text-background'
                  : 'border-line-muted bg-background text-muted-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className={cn(
            'min-h-9 flex-1 border px-2 font-mono text-[10px] uppercase tracking-wider transition-colors',
            name.trim()
              ? 'border-signal bg-signal text-signal-foreground hover:bg-signal-soft'
              : 'cursor-not-allowed border-line-muted bg-muted text-muted-foreground',
          )}
        >
          Save Rule
        </button>
        <button
          onClick={onClose}
          className="min-h-9 flex-1 border border-line-muted bg-background px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:border-line hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/** Compact list of existing rules with toggle/delete controls */
export function AlertRuleList() {
  const { rules, toggleRule, removeRule } = useAlertRuleStore()

  if (rules.length === 0) return null

  return (
    <div className="space-y-1 px-3 py-2">
      {rules.map(rule => (
        <div
          key={rule.id}
          className={cn(
            'flex items-center gap-2 border px-2 py-1.5 transition-colors',
            rule.enabled
              ? 'border-line-muted bg-panel-subtle'
              : 'border-line-muted bg-background opacity-50',
          )}
        >
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={cn(
                    'grid size-9 flex-shrink-0 place-items-center border transition-colors',
                    rule.enabled ? 'border-success text-success' : 'border-line-muted text-muted-foreground',
                  )}
                  aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}
                  aria-pressed={rule.enabled}
                ><span className="size-3 border border-current bg-current" aria-hidden="true" /></button>
              </TooltipTrigger>
              <TooltipContent side="right">{rule.enabled ? 'Disable' : 'Enable'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex-1 min-w-0">
            <div className="truncate font-mono text-[11px] text-foreground">{rule.name}</div>
            <div className="font-mono text-[9px] uppercase text-muted-foreground">{rule.trigger} — {rule.alertSeverity}</div>
          </div>
          <button
            onClick={() => removeRule(rule.id)}
            aria-label={`Delete ${rule.name}`}
            className="grid size-9 flex-shrink-0 place-items-center border border-transparent font-mono text-[10px] text-muted-foreground transition-colors hover:border-danger hover:text-danger"
          >
            X
          </button>
        </div>
      ))}
    </div>
  )
}
