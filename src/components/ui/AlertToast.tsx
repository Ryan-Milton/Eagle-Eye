import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useAlertStore, type AlertItem } from '@/stores/alert-store'
import { sendBrowserNotification, playAlertTone } from '@/lib/notifications'

const TOAST_DURATION = 5000
const MAX_TOASTS = 3

interface Toast {
  alert: AlertItem
  exiting: boolean
}

export function AlertToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const lastAlertIdRef = useRef<string | null>(null)
  const alerts = useAlertStore(s => s.alerts)
  const audioEnabledRef = useRef(true)

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.alert.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.alert.id !== id))
    }, 300)
  }, [])

  // Watch for new alerts
  useEffect(() => {
    if (alerts.length === 0) return
    const latest = alerts[0]
    if (latest.id === lastAlertIdRef.current) return
    lastAlertIdRef.current = latest.id

    // Add toast
    queueMicrotask(() => {
      setToasts(prev => [{ alert: latest, exiting: false }, ...prev].slice(0, MAX_TOASTS))
    })

    // Auto-dismiss
    setTimeout(() => removeToast(latest.id), TOAST_DURATION)

    // Browser notification for critical/warning
    if (latest.severity === 'critical' || latest.severity === 'warning') {
      sendBrowserNotification(latest.title, latest.description)
    }

    // Audio tone
    if (audioEnabledRef.current) {
      playAlertTone(latest.severity)
    }
  }, [alerts, removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed left-3 right-3 top-[4.75rem] z-[60] flex flex-col items-end gap-2 sm:left-auto xl:right-[18.75rem]" aria-live="polite">
      {toasts.map(toast => (
        <div
          key={toast.alert.id}
          className={cn(
            'pointer-events-auto w-full max-w-72 border-l-4 border-y border-r bg-panel px-3 py-2.5 text-foreground shadow-hard transition-[opacity,transform] duration-300 motion-reduce:transition-none',
            toast.exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
            toast.alert.severity === 'critical' ? 'border-danger'
              : toast.alert.severity === 'warning' ? 'border-warning'
              : 'border-info',
          )}
          role="status"
        >
          <div className="flex items-start gap-2">
            <span className={cn(
              'mt-0.5 border px-1 py-0.5 font-mono text-[8px] font-bold uppercase',
              toast.alert.severity === 'critical' ? 'border-danger text-danger'
                : toast.alert.severity === 'warning' ? 'border-warning text-warning'
                : 'border-info text-info',
            )}>{toast.alert.severity.slice(0, 4)}</span>
            <div className="flex-1 min-w-0">
              <div className="truncate font-mono text-[11px] font-bold text-foreground">
                {toast.alert.title}
              </div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                {toast.alert.description}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.alert.id)}
              aria-label={`Dismiss ${toast.alert.title}`}
              className="grid size-9 flex-shrink-0 place-items-center border border-transparent font-mono text-[10px] text-muted-foreground hover:border-line hover:bg-background hover:text-foreground"
            >
              X
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
