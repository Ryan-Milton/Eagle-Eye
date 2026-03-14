import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useRadioStore } from '@/stores/radio-store'
import { PipelineError } from '@/components/ui/PipelineError'

export function RadioSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { feeds, version, count, errors } = useRadioStore()

  const sortedFeeds = useMemo(() => {
    void version
    return [...feeds.values()].sort((a, b) => b.listeners - a.listeners)
  }, [feeds, version])

  const hasData = count > 0

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800 hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-[11px] text-zinc-600">{expanded ? '▾' : '▸'}</span>
        <span className="font-display text-[12px] font-semibold tracking-[2px] text-rose-400 uppercase flex-1 text-left">Radio</span>
        <PipelineError errors={errors} />
        <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', hasData ? 'bg-rose-400' : 'bg-zinc-600')} />
        <span className="font-mono text-[11px] text-zinc-500">{count}</span>
      </button>

      {expanded && (
        <div className="border-b border-zinc-800 max-h-48 overflow-y-auto scrollbar-thin">
          {sortedFeeds.length === 0 ? (
            <div className="px-4 py-2 text-zinc-600 font-mono text-[11px]">No feeds available</div>
          ) : (
            sortedFeeds.slice(0, 30).map(feed => (
              <div
                key={feed.id}
                className="flex items-center gap-2 pl-4 pr-3 py-1.5 border-b border-zinc-800/20 hover:bg-zinc-800/20"
              >
                <span className="text-[11px]" style={{ color: '#f87171' }}>📻</span>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px] text-zinc-300 truncate">{feed.name}</div>
                  <div className="font-mono text-[10px] text-zinc-500 truncate">{feed.location}</div>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">{feed.listeners} 🎧</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
