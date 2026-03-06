import { create } from 'zustand'
import type { NavView } from '@/types'

interface AppState {
  activeView: NavView
  sessionStart: number
  /** Start of the timeline window (ms timestamp). Default: 6 hours ago */
  timelineStart: number
  /** Current cursor position on the timeline (ms timestamp). Default: now */
  timelineCursor: number
  /** Whether the timeline is playing (cursor == live) */
  timelineLive: boolean
  setActiveView: (view: NavView) => void
  setTimelineCursor: (ms: number) => void
  setTimelineLive: (live: boolean) => void
}

const SIX_HOURS = 6 * 60 * 60 * 1000

export const useAppStore = create<AppState>()((set) => ({
  activeView: 'Globe',
  sessionStart: Date.now(),
  timelineStart: Date.now() - SIX_HOURS,
  timelineCursor: Date.now(),
  timelineLive: true,
  setActiveView: (view) => set({ activeView: view }),
  setTimelineCursor: (ms) => set({ timelineCursor: ms, timelineLive: false }),
  setTimelineLive: (live) => set(live ? { timelineLive: true, timelineCursor: Date.now() } : { timelineLive: live }),
}))
