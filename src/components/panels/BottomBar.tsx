import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClock } from '@/hooks/useClock'
import { useNow } from '@/hooks/useNow'
import { useAppStore } from '@/stores/app-store'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'

const SIX_HOURS = 6 * 60 * 60 * 1000
const KEYBOARD_STEP = 60 * 1000
const SPEED_OPTIONS = [1, 2, 5, 10]

export function BottomBar() {
  const sessionStart = useAppStore(s => s.sessionStart)
  const timelineStart = useAppStore(s => s.timelineStart)
  const timelineCursor = useAppStore(s => s.timelineCursor)
  const timelineLive = useAppStore(s => s.timelineLive)
  const timelinePlaying = useAppStore(s => s.timelinePlaying)
  const timelineSpeed = useAppStore(s => s.timelineSpeed)
  const setTimelineCursor = useAppStore(s => s.setTimelineCursor)
  const setTimelineLive = useAppStore(s => s.setTimelineLive)
  const setTimelinePlaying = useAppStore(s => s.setTimelinePlaying)
  const setTimelineSpeed = useAppStore(s => s.setTimelineSpeed)
  const { elapsed, nextUpdate } = useClock(sessionStart)
  const now = useNow()
  const trackRef = useRef<HTMLDivElement>(null)
  const removePointerListenersRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!timelineLive) return
    const id = setInterval(() => {
      useAppStore.setState({ timelineCursor: Date.now(), timelineStart: Date.now() - SIX_HOURS })
    }, 1000)
    return () => clearInterval(id)
  }, [timelineLive])

  useEffect(() => {
    if (!timelinePlaying || timelineLive) return
    const intervalMs = 100
    const id = setInterval(() => {
      const state = useAppStore.getState()
      const newCursor = state.timelineCursor + intervalMs * state.timelineSpeed * 60
      if (newCursor >= Date.now()) {
        setTimelineLive(true)
      } else {
        useAppStore.setState({ timelineCursor: newCursor })
      }
    }, intervalMs)
    return () => clearInterval(id)
  }, [timelinePlaying, timelineLive, setTimelineLive])

  useEffect(() => () => removePointerListenersRef.current?.(), [])

  const range = Math.max(1, now - timelineStart)
  const progress = Math.min(1, Math.max(0, (timelineCursor - timelineStart) / range))

  const setCursorWithinWindow = useCallback((cursor: number) => {
    const currentTime = Date.now()
    const start = currentTime - SIX_HOURS
    const clampedCursor = Math.min(currentTime, Math.max(start, cursor))
    if (currentTime - clampedCursor < 10_000) {
      setTimelineLive(true)
    } else {
      setTimelineCursor(clampedCursor)
    }
  }, [setTimelineCursor, setTimelineLive])

  const handleScrub = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const percent = Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)))
    const currentTime = Date.now()
    setCursorWithinWindow(currentTime - SIX_HOURS + percent * SIX_HOURS)
  }, [setCursorWithinWindow])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    removePointerListenersRef.current?.()
    handleScrub(event.clientX)

    const track = event.currentTarget
    const pointerId = event.pointerId
    try {
      track.setPointerCapture(pointerId)
    } catch {
      // Document listeners still keep the drag active when capture is unavailable.
    }

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId === pointerId) handleScrub(moveEvent.clientX)
    }
    const removeListeners = () => {
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerEnd, true)
      document.removeEventListener('pointercancel', onPointerEnd, true)
      try {
        if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId)
      } catch {
        // Capture may already be released when the pointer leaves the document.
      }
      removePointerListenersRef.current = null
    }
    const onPointerEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return
      if (endEvent.type === 'pointerup') handleScrub(endEvent.clientX)
      removeListeners()
    }

    removePointerListenersRef.current = removeListeners
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerEnd, true)
    document.addEventListener('pointercancel', onPointerEnd, true)
  }, [handleScrub])

  const handleSliderKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    let cursor: number | null = null
    const currentTime = Date.now()
    const currentCursor = timelineLive ? currentTime : timelineCursor

    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') cursor = currentCursor - KEYBOARD_STEP
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') cursor = currentCursor + KEYBOARD_STEP
    if (event.key === 'Home') cursor = currentTime - SIX_HOURS
    if (event.key === 'End') cursor = currentTime
    if (cursor === null) return

    event.preventDefault()
    setCursorWithinWindow(cursor)
  }, [setCursorWithinWindow, timelineCursor, timelineLive])

  const cursorOffset = now - timelineCursor
  const cursorLabel = timelineLive
    ? 'LIVE'
    : cursorOffset < 60_000
      ? `T-${Math.floor(cursorOffset / 1000)}s`
      : cursorOffset < 3_600_000
        ? `T-${Math.floor(cursorOffset / 60_000)}m`
        : `T-${(cursorOffset / 3_600_000).toFixed(1)}h`

  const togglePlayPause = useCallback(() => {
    if (timelineLive) {
      setTimelineCursor(Date.now() - SIX_HOURS)
      setTimelinePlaying(true)
    } else {
      setTimelinePlaying(!timelinePlaying)
    }
  }, [timelineLive, timelinePlaying, setTimelineCursor, setTimelinePlaying])

  const cycleSpeed = useCallback(() => {
    const index = SPEED_OPTIONS.indexOf(timelineSpeed)
    setTimelineSpeed(SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length])
  }, [timelineSpeed, setTimelineSpeed])

  const sliderValueText = timelineLive
    ? 'Live, current time'
    : `${cursorLabel}, ${new Date(timelineCursor).toISOString()}`
  const ariaTimelineCursor = Math.min(now, Math.max(timelineStart, timelineCursor))

  return (
    <footer className="relative z-40 col-span-full row-start-3 flex min-w-0 items-stretch border-t border-line bg-panel text-foreground">
      <div className="hidden items-center gap-1.5 border-r border-line-muted px-3 font-mono text-[10px] text-muted-foreground sm:flex">
        MODE <strong className="text-foreground">{timelineLive ? 'REALTIME' : timelinePlaying ? 'REPLAY' : 'PAUSED'}</strong>
      </div>

      <div className="flex items-stretch border-r border-line-muted">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={togglePlayPause}
                className="grid min-w-11 place-items-center text-muted-foreground transition-colors hover:bg-signal hover:text-signal-foreground focus-visible:outline-focus"
                aria-label={timelinePlaying && !timelineLive ? 'Pause replay' : 'Start replay'}
              >
                {timelinePlaying && !timelineLive ? <Pause aria-hidden="true" className="size-3.5" /> : <Play aria-hidden="true" className="size-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{timelinePlaying && !timelineLive ? 'Pause replay' : 'Start replay'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={cycleSpeed}
                className={cn(
                  'min-w-11 border-l border-line-muted px-1 font-mono text-[10px] font-bold transition-colors hover:bg-panel-raised focus-visible:outline-focus',
                  timelineSpeed > 1 ? 'text-signal' : 'text-muted-foreground',
                )}
                aria-label={`Playback speed ${timelineSpeed} times`}
              >
                {timelineSpeed}x
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Playback speed</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="hidden items-center gap-1.5 border-r border-line-muted px-3 font-mono text-[10px] text-muted-foreground md:flex">
        SESSION <span className="text-foreground">T+{elapsed}</span>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 sm:px-3">
        <span className="hidden whitespace-nowrap font-mono text-[9px] text-muted-foreground sm:block">T-6H</span>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Six-hour operational timeline"
          aria-valuemin={timelineStart}
          aria-valuemax={now}
          aria-valuenow={ariaTimelineCursor}
          aria-valuetext={sliderValueText}
          onPointerDown={handlePointerDown}
          onKeyDown={handleSliderKeyDown}
          className="relative h-3 flex-1 touch-none cursor-pointer border border-line-muted bg-panel-subtle outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <div className="h-full bg-signal transition-[width] duration-100" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
          <div className="absolute top-[-4px] h-[18px] w-1 -translate-x-1/2 border border-foreground bg-signal shadow-hard" style={{ left: `${(progress * 100).toFixed(1)}%` }} />
        </div>
        <span className="hidden whitespace-nowrap font-mono text-[9px] text-muted-foreground sm:block">NOW</span>
      </div>

      <div className={cn('items-center border-l border-line-muted px-2 font-mono text-[10px] text-muted-foreground lg:px-3', timelineLive ? 'hidden lg:flex' : 'flex')}>
        {timelineLive ? (
          <>UPDATE <span className="ml-1 text-foreground">T-{nextUpdate}s</span></>
        ) : (
          <button type="button" onClick={() => setTimelineLive(true)} className="font-bold uppercase tracking-wider text-signal hover:text-signal-soft">
            {cursorLabel} / Live
          </button>
        )}
      </div>
      <div className="hidden items-center border-l border-line-muted px-3 font-mono text-[10px] font-bold uppercase tracking-wider xl:flex">
        OP Nightfall
      </div>
      <div className="hidden items-center border-l border-danger bg-danger px-3 font-mono text-[9px] font-black uppercase tracking-widest text-white md:flex">
        Unclassified
      </div>
    </footer>
  )
}
