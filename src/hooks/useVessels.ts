import { useRef, useEffect, useState, useCallback } from 'react'
import { AisClient } from '@/lib/ais-client'
import { PositionHistory } from '@/lib/position-history'
import type { VesselRecord } from '@/types'

export function useVessels(enabled: boolean) {
  const vesselsRef = useRef(new Map<number, VesselRecord>())
  const historyRef = useRef(new PositionHistory<number>())
  const [version, setVersion] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const client = new AisClient()

    client.onUpdate = () => {
      vesselsRef.current = client.vessels
      for (const [mmsi, v] of client.vessels) {
        historyRef.current.record(mmsi, v.lon, v.lat)
      }
      setConnected(client.connected)
      setVersion(v => v + 1)
    }

    client.connect()

    return () => {
      client.onUpdate = null
      client.disconnect()
    }
  }, [enabled])

  const getVessels = useCallback((): Map<number, VesselRecord> => {
    return vesselsRef.current
  }, [])

  return {
    version,
    vessels: vesselsRef.current,
    connected,
    vesselCount: vesselsRef.current.size,
    getVessels,
    vesselHistory: historyRef.current,
  }
}
