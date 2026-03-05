import { create } from 'zustand'
import type { NavView } from '@/types'

interface AppState {
  activeView: NavView
  sessionStart: number
  setActiveView: (view: NavView) => void
}

export const useAppStore = create<AppState>()((set) => ({
  activeView: 'Globe',
  sessionStart: Date.now(),
  setActiveView: (view) => set({ activeView: view }),
}))
