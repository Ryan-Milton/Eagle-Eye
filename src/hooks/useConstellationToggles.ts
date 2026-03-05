import { useState, useCallback } from 'react'
import { CONSTELLATIONS } from '@/data/constellations'
import type { ConstellationId } from '@/types'

const STORAGE_KEY = 'eagle-eye-toggles'

function loadToggles(): Map<ConstellationId, boolean> {
  const map = new Map<ConstellationId, boolean>()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const obj = JSON.parse(stored) as Record<string, boolean>
      for (const c of CONSTELLATIONS) {
        map.set(c.id, obj[c.id] ?? c.defaultOn)
      }
      return map
    }
  } catch { /* ignore */ }
  for (const c of CONSTELLATIONS) {
    map.set(c.id, c.defaultOn)
  }
  return map
}

function saveToggles(toggles: Map<ConstellationId, boolean>) {
  const obj: Record<string, boolean> = {}
  for (const [id, on] of toggles) obj[id] = on
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function useConstellationToggles() {
  const [toggles, setToggles] = useState<Map<ConstellationId, boolean>>(loadToggles)

  const toggle = useCallback((id: ConstellationId) => {
    setToggles(prev => {
      const next = new Map(prev)
      next.set(id, !prev.get(id))
      saveToggles(next)
      return next
    })
  }, [])

  const enableAll = useCallback(() => {
    setToggles(() => {
      const next = new Map<ConstellationId, boolean>()
      for (const c of CONSTELLATIONS) next.set(c.id, true)
      saveToggles(next)
      return next
    })
  }, [])

  const disableAll = useCallback(() => {
    setToggles(() => {
      const next = new Map<ConstellationId, boolean>()
      for (const c of CONSTELLATIONS) next.set(c.id, false)
      saveToggles(next)
      return next
    })
  }, [])

  return { toggles, toggle, enableAll, disableAll }
}
