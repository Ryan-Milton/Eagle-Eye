import { useRef, useEffect, useState, useCallback } from 'react'
import { CONSTELLATIONS } from '@/data/constellations'
import { fetchConstellation, getLastFetchTime } from '@/lib/celestrak'
import { Propagator } from '@/lib/propagator'
import type { ConstellationId, SatellitePosition, SatelliteRecord } from '@/types'

const PROPAGATION_INTERVAL = 2000 // ms

export interface SatelliteStats {
  totalTracked: number
  enabledCount: number
  constellationCount: number
  lastFetchTime: number | null
}

export function useSatellites(toggles: Map<ConstellationId, boolean>) {
  const propagatorRef = useRef<Propagator | null>(null)
  const positionsRef = useRef(new Map<ConstellationId, SatellitePosition[]>())
  const satellitesRef = useRef(new Map<ConstellationId, SatelliteRecord[]>())
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(new Set<ConstellationId>())
  const [errors, setErrors] = useState(new Map<ConstellationId, string>())
  const prevToggles = useRef(new Map<ConstellationId, boolean>())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize propagator
  if (!propagatorRef.current) {
    propagatorRef.current = new Propagator()
  }

  // Handle toggle changes — fetch/load/unload constellations
  useEffect(() => {
    const propagator = propagatorRef.current!
    const prev = prevToggles.current

    for (const c of CONSTELLATIONS) {
      const wasOn = prev.get(c.id) ?? false
      const isOn = toggles.get(c.id) ?? false

      if (isOn && !wasOn) {
        // Newly enabled — fetch and load
        setLoading(s => { const n = new Set(s); n.add(c.id); return n })
        fetchConstellation(c.celestrakGroup)
          .then(records => {
            const sats = propagator.loadConstellation(c.id, records)
            satellitesRef.current = new Map(satellitesRef.current).set(c.id, sats)
            setLoading(s => { const n = new Set(s); n.delete(c.id); return n })
            setErrors(s => { const n = new Map(s); n.delete(c.id); return n })
            // Trigger immediate propagation
            propagator.propagate().then(positions => {
              positionsRef.current = positions
              setVersion(v => v + 1)
            })
          })
          .catch(err => {
            setLoading(s => { const n = new Set(s); n.delete(c.id); return n })
            setErrors(s => new Map(s).set(c.id, String(err)))
          })
      } else if (!isOn && wasOn) {
        // Disabled — unload
        propagator.unloadConstellation(c.id)
        satellitesRef.current = new Map(satellitesRef.current)
        satellitesRef.current.delete(c.id)
        positionsRef.current = new Map(positionsRef.current)
        positionsRef.current.delete(c.id)
        setVersion(v => v + 1)
      }
    }

    prevToggles.current = new Map(toggles)
  }, [toggles])

  // Propagation loop
  useEffect(() => {
    const propagator = propagatorRef.current!

    timerRef.current = setInterval(async () => {
      try {
        const positions = await propagator.propagate()
        positionsRef.current = positions
        setVersion(v => v + 1)
      } catch (err) {
        console.warn('[Propagation]', err)
      }
    }, PROPAGATION_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      propagatorRef.current?.dispose()
    }
  }, [])

  const getPositions = useCallback((id: ConstellationId): SatellitePosition[] => {
    return positionsRef.current.get(id) ?? []
  }, [])

  const getSatellites = useCallback((id: ConstellationId): SatelliteRecord[] => {
    return satellitesRef.current.get(id) ?? []
  }, [])

  const getStats = useCallback((): SatelliteStats => {
    let totalTracked = 0
    let enabledCount = 0
    let constellationCount = 0
    let lastFetchTime: number | null = null

    for (const c of CONSTELLATIONS) {
      const isOn = toggles.get(c.id) ?? false
      if (isOn) {
        constellationCount++
        const sats = satellitesRef.current.get(c.id)
        if (sats) {
          enabledCount += sats.length
          const ft = getLastFetchTime(c.celestrakGroup)
          if (ft && (!lastFetchTime || ft > lastFetchTime)) lastFetchTime = ft
        }
      }
      const sats = satellitesRef.current.get(c.id)
      if (sats) totalTracked += sats.length
    }

    return { totalTracked, enabledCount, constellationCount, lastFetchTime }
  }, [toggles])

  return {
    version,
    loading,
    errors,
    getPositions,
    getSatellites,
    getStats,
    satellites: satellitesRef.current,
  }
}
