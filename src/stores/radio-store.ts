import { create } from 'zustand'
import type { RadioFeed } from '@/lib/radio-client'

interface RadioState {
  feeds: Map<string, RadioFeed>
  version: number
  count: number
  lastFetch: number | null
  errors: string[]

  setFeeds: (feeds: RadioFeed[]) => void
  setErrors: (errors: string[]) => void
}

export const useRadioStore = create<RadioState>()((set) => ({
  feeds: new Map(),
  version: 0,
  count: 0,
  lastFetch: null,
  errors: [],

  setFeeds: (feeds) => {
    const map = new Map<string, RadioFeed>()
    for (const f of feeds) map.set(f.id, f)
    set(prev => ({ feeds: map, count: map.size, version: prev.version + 1, lastFetch: Date.now(), errors: [] }))
  },

  setErrors: (errors) => set({ errors }),
}))
