import { useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useCameraStore } from '@/stores/camera-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useAppStore } from '@/stores/app-store'
import { TypeToggle } from './shared'

export function CameraSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { cameras, version, count, visible, setVisible } = useCameraStore()
  const selectedCameraId = useSelectionStore(s => s.selectedCameraId)

  const cameraList = useMemo(() => {
    void version
    return [...cameras.values()].sort((a, b) => a.title.localeCompare(b.title))
  }, [cameras, version])

  const handleSelect = useCallback((id: string) => {
    useSelectionStore.getState().selectCamera(id)
    useAppStore.getState().setActiveView('Globe')
  }, [])

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
        <span className="neo-kicker flex-1 text-left text-domain-camera">Cameras</span>
        <span className={cn('neo-data text-[9px] uppercase', hasData ? 'text-success' : 'text-muted-foreground')}>{hasData ? 'Ready' : 'Idle'}</span>
        <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        <TypeToggle on={visible} color="var(--domain-camera)" label="cameras" onClick={() => setVisible(!visible)} />
      </div>

      {expanded && (
        <div className="neo-scrollbar max-h-[300px] overflow-y-auto border-b border-line-muted bg-background">
          {cameraList.slice(0, 200).map(cam => (
            <button
              key={cam.id}
              onClick={() => handleSelect(cam.id)}
              className={cn(
                'flex min-h-10 w-full items-center gap-2 border-b border-line-muted py-1.5 pl-4 pr-3 text-left transition-colors hover:bg-panel-raised',
                selectedCameraId === cam.id && 'border-l-2 border-l-signal bg-signal text-signal-foreground',
              )}
            >
              {cam.thumbnail && (
                <img src={cam.thumbnail} alt="" className="h-6 w-8 flex-shrink-0 border border-line-muted bg-panel-subtle object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="truncate font-mono text-[11px]">{cam.title}</div>
                <div className={cn('font-mono text-[10px]', selectedCameraId === cam.id ? 'text-signal-foreground/70' : 'text-muted-foreground')}>{cam.city}{cam.country ? `, ${cam.country}` : ''}</div>
              </div>
            </button>
          ))}
          {count === 0 && (
            <div className="px-4 py-4 font-mono text-[11px] text-muted-foreground">No cameras loaded.</div>
          )}
        </div>
      )}
    </div>
  )
}
