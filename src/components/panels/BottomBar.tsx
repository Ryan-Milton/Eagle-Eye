import { useCallback, useRef, useEffect } from 'react'
import { useClock } from '@/hooks/useClock'
import { useAppStore } from '@/stores/app-store'

const SIX_HOURS = 6 * 60 * 60 * 1000

export function BottomBar() {
  const sessionStart = useAppStore(s => s.sessionStart)
  const timelineStart = useAppStore(s => s.timelineStart)
  const timelineCursor = useAppStore(s => s.timelineCursor)
  const timelineLive = useAppStore(s => s.timelineLive)
  const setTimelineCursor = useAppStore(s => s.setTimelineCursor)
  const setTimelineLive = useAppStore(s => s.setTimelineLive)
  const { elapsed, nextUpdate } = useClock(sessionStart)
  const trackRef = useRef<HTMLDivElement>(null)

  // Keep cursor at "now" when live
  useEffect(() => {
    if (!timelineLive) return
    const id = setInterval(() => {
      useAppStore.setState({ timelineCursor: Date.now(), timelineStart: Date.now() - SIX_HOURS })
    }, 1000)
    return () => clearInterval(id)
  }, [timelineLive])

  const now = Date.now()
  const range = now - timelineStart
  const progress = Math.min(1, Math.max(0, (timelineCursor - timelineStart) / range))

  const handleScrub = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const now = Date.now()
    const start = now - SIX_HOURS
    const cursor = start + pct * SIX_HOURS
    // If scrubbing to within 10s of now, snap to live
    if (now - cursor < 10_000) {
      setTimelineLive(true)
    } else {
      setTimelineCursor(cursor)
    }
  }, [setTimelineCursor, setTimelineLive])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleScrub(e.clientX)
    const onMove = (me: MouseEvent) => handleScrub(me.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [handleScrub])

  // Format cursor offset from now
  const cursorOffset = now - timelineCursor
  const cursorLabel = timelineLive
    ? 'LIVE'
    : cursorOffset < 60_000
      ? `T-${Math.floor(cursorOffset / 1000)}s`
      : cursorOffset < 3_600_000
        ? `T-${Math.floor(cursorOffset / 60_000)}m`
        : `T-${(cursorOffset / 3_600_000).toFixed(1)}h`

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

      {/* Timeline scrubber */}
      <div className="flex-1 flex items-center gap-2.5 px-4 h-full">
        <span className="font-mono text-[13px] text-zinc-600 whitespace-nowrap">T-6H</span>
        <div
          ref={trackRef}
          className="flex-1 h-[3px] bg-zinc-800 rounded-sm relative cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          <div
            className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-sm relative transition-[width] duration-100"
            style={{ width: `${(progress * 100).toFixed(1)}%` }}
          >
            <div className="absolute right-[-1px] top-[-3px] w-[2px] h-[9px] bg-orange-400 rounded-sm shadow-[0_0_6px_rgba(249,115,22,0.6)]" />
          </div>
        </div>
        <span className="font-mono text-[13px] text-zinc-600 whitespace-nowrap">NOW</span>
      </div>

      <div className="flex items-center gap-1.5 px-3.5 border-l border-zinc-800 font-mono text-[12px] text-zinc-600 whitespace-nowrap h-full">
        {timelineLive ? (
          <>UPDATE <span className="text-zinc-400">T-{nextUpdate}s</span></>
        ) : (
          <button
            onClick={() => setTimelineLive(true)}
            className="text-orange-400 hover:text-orange-300 uppercase tracking-wider"
          >
            {cursorLabel} → LIVE
          </button>
        )}
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
