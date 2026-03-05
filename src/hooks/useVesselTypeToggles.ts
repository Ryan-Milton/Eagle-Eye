import { useState, useCallback } from 'react'
import { VESSEL_TYPES } from '@/types'
import type { VesselType } from '@/types'

const STORAGE_KEY = 'eagle-eye-vessel-type-toggles'

function loadToggles(): Map<VesselType, boolean> {
  const map = new Map<VesselType, boolean>()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const obj = JSON.parse(stored) as Record<string, boolean>
      for (const t of VESSEL_TYPES) map.set(t, obj[t] ?? true)
      return map
    }
  } catch { /* ignore */ }
  for (const t of VESSEL_TYPES) map.set(t, true)
  return map
}

function saveToggles(toggles: Map<VesselType, boolean>) {
  const obj: Record<string, boolean> = {}
  for (const [id, on] of toggles) obj[id] = on
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function useVesselTypeToggles() {
  const [toggles, setToggles] = useState<Map<VesselType, boolean>>(loadToggles)

  const toggle = useCallback((type: VesselType) => {
    setToggles(prev => {
      const next = new Map(prev)
      next.set(type, !prev.get(type))
      saveToggles(next)
      return next
    })
  }, [])

  const enableAll = useCallback(() => {
    setToggles(() => {
      const next = new Map<VesselType, boolean>()
      for (const t of VESSEL_TYPES) next.set(t, true)
      saveToggles(next)
      return next
    })
  }, [])

  const disableAll = useCallback(() => {
    setToggles(() => {
      const next = new Map<VesselType, boolean>()
      for (const t of VESSEL_TYPES) next.set(t, false)
      saveToggles(next)
      return next
    })
  }, [])

  return { toggles, toggle, enableAll, disableAll }
}
