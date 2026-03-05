import { useState, useCallback } from 'react'
import { FLIGHT_TYPES } from '@/types'
import type { FlightType } from '@/types'

const STORAGE_KEY = 'eagle-eye-flight-type-toggles'

function loadToggles(): Map<FlightType, boolean> {
  const map = new Map<FlightType, boolean>()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const obj = JSON.parse(stored) as Record<string, boolean>
      for (const t of FLIGHT_TYPES) map.set(t, obj[t] ?? true)
      return map
    }
  } catch { /* ignore */ }
  for (const t of FLIGHT_TYPES) map.set(t, true)
  return map
}

function saveToggles(toggles: Map<FlightType, boolean>) {
  const obj: Record<string, boolean> = {}
  for (const [id, on] of toggles) obj[id] = on
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function useFlightTypeToggles() {
  const [toggles, setToggles] = useState<Map<FlightType, boolean>>(loadToggles)

  const toggle = useCallback((type: FlightType) => {
    setToggles(prev => {
      const next = new Map(prev)
      next.set(type, !prev.get(type))
      saveToggles(next)
      return next
    })
  }, [])

  const enableAll = useCallback(() => {
    setToggles(() => {
      const next = new Map<FlightType, boolean>()
      for (const t of FLIGHT_TYPES) next.set(t, true)
      saveToggles(next)
      return next
    })
  }, [])

  const disableAll = useCallback(() => {
    setToggles(() => {
      const next = new Map<FlightType, boolean>()
      for (const t of FLIGHT_TYPES) next.set(t, false)
      saveToggles(next)
      return next
    })
  }, [])

  return { toggles, toggle, enableAll, disableAll }
}
