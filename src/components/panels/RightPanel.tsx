import { useFeed } from '@/hooks/useFeed'
import { cn } from '@/lib/utils'
import type { AlertSeverity } from '@/types'

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'text-red-400',
  warning:  'text-yellow-400',
  info:     'text-blue-400',
}
const SEVERITY_BAR: Record<AlertSeverity, string> = {
  critical: 'bg-red-500',
  warning:  'bg-yellow-500',
  info:     'bg-blue-500',
}

export function RightPanel() {
  const items = useFeed(5)

  return (
    <aside className="fixed top-[46px] right-0 bottom-[34px] w-[272px] bg-zinc-900 border-l border-zinc-800 z-40 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3.5 h-9 border-b border-zinc-800 flex-shrink-0">
        <span className="font-display text-[10px] font-semibold tracking-[2.5px] text-zinc-600 uppercase">
          Activity Feed
        </span>
        <span className="font-mono text-[10px] text-green-400 bg-green-950/50 border border-green-800/30 px-1.5 py-0.5 rounded-sm">
          ● Live
        </span>
      </div>

      {/* Threat summary */}
      <div className="flex border-b border-zinc-800 flex-shrink-0">
        <div className="flex-1 p-2.5 border-r border-zinc-800">
          <div className="font-display text-[11px] font-bold tracking-wide uppercase text-yellow-400 mb-0.5">
            Elevated
          </div>
          <div className="font-mono text-[9px] text-zinc-600 tracking-wide">Threat Level</div>
        </div>
        <div className="flex-1 p-2.5">
          <div className="font-display text-[11px] font-bold tracking-wide uppercase text-red-400 mb-0.5">
            3 Critical
          </div>
          <div className="font-mono text-[9px] text-zinc-600 tracking-wide">Active Alerts</div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={cn(
              'relative px-3.5 py-2.5 border-b border-zinc-800/60 cursor-pointer hover:bg-zinc-800/40 transition-colors',
              idx === 0 && 'animate-[fadeSlideIn_0.3s_ease-out]',
            )}
          >
            {/* Severity bar */}
            <div className={cn('absolute left-0 top-0 bottom-0 w-[2px]', SEVERITY_BAR[item.severity])} />

            <div className="flex justify-between items-center mb-1">
              <span className={cn('font-display text-[10px] font-bold tracking-[1.5px] uppercase', SEVERITY_LABEL[item.severity])}>
                {item.severity}
              </span>
              <span className="font-mono text-[9px] text-zinc-600">{item.timestamp}</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{item.msg}</p>
            <p className="font-mono text-[9px] text-zinc-600 mt-1">{item.coord}</p>
          </div>
        ))}
      </div>
    </aside>
  )
}
