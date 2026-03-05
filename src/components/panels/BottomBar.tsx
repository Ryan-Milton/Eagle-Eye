import { useClock } from '@/hooks/useClock'
import { useAppStore } from '@/stores/app-store'

export function BottomBar() {
  const sessionStart = useAppStore(s => s.sessionStart)
  const { elapsed, nextUpdate } = useClock(sessionStart)

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-[34px] bg-zinc-900 border-t border-zinc-800 flex items-center pl-3.5 z-50">

      <div className="flex items-center gap-1.5 pr-3.5 border-r border-zinc-800 font-mono text-[12px] text-zinc-600 whitespace-nowrap h-full">
        MODE <span className="text-zinc-400">REALTIME</span>
      </div>
      <div className="flex items-center gap-1.5 px-3.5 border-r border-zinc-800 font-mono text-[12px] text-zinc-600 whitespace-nowrap h-full">
        SOURCE <span className="text-orange-400">CELESTRAK</span> / <span className="text-cyan-400">AIS</span>
      </div>
      <div className="flex items-center gap-1.5 px-3.5 border-r border-zinc-800 font-mono text-[12px] text-zinc-600 whitespace-nowrap h-full">
        T+ <span className="text-zinc-400">{elapsed}</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex items-center gap-2.5 px-4 h-full">
        <span className="font-mono text-[13px] text-zinc-600 whitespace-nowrap">T-6H</span>
        <div className="flex-1 h-[3px] bg-zinc-800 rounded-sm relative cursor-pointer">
          <div className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-sm w-[68%] relative">
            <div className="absolute right-[-1px] top-[-3px] w-[2px] h-[9px] bg-orange-400 rounded-sm shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          </div>
        </div>
        <span className="font-mono text-[13px] text-zinc-600 whitespace-nowrap">NOW</span>
      </div>

      <div className="flex items-center gap-1.5 px-3.5 border-l border-zinc-800 font-mono text-[12px] text-zinc-600 whitespace-nowrap h-full">
        UPDATE <span className="text-zinc-400">T-{nextUpdate}s</span>
      </div>
      <div className="px-4 border-l border-zinc-800 font-display text-[13px] font-semibold tracking-[2px] text-zinc-50 h-full flex items-center">
        OP NIGHTFALL
      </div>
      <div className="px-3.5 border-l border-zinc-800 font-display text-[13px] font-bold tracking-[3px] text-red-400 h-full flex items-center">
        UNCLASSIFIED
      </div>
    </footer>
  )
}
