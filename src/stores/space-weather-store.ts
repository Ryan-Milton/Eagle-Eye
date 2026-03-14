import { create } from 'zustand'
import type { KpIndexEntry, SpaceWeatherAlert } from '@/lib/space-weather-client'

interface SpaceWeatherState {
  kpIndex: KpIndexEntry[]
  currentKp: number
  alerts: SpaceWeatherAlert[]
  lastFetch: number | null
  errors: string[]

  setData: (kp: KpIndexEntry[], alerts: SpaceWeatherAlert[]) => void
  setErrors: (errors: string[]) => void
}

export const useSpaceWeatherStore = create<SpaceWeatherState>()((set) => ({
  kpIndex: [],
  currentKp: 0,
  alerts: [],
  lastFetch: null,
  errors: [],

  setData: (kpIndex, alerts) => {
    const currentKp = kpIndex.length > 0 ? kpIndex[kpIndex.length - 1].kp : 0
    set({ kpIndex, currentKp, alerts, lastFetch: Date.now(), errors: [] })
  },

  setErrors: (errors) => set({ errors }),
}))
