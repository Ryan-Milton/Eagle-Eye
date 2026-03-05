import { useRef, useEffect, useState, useCallback } from 'react'
import { FlightClient } from '@/lib/flight-client'
import type { FlightRecord } from '@/types'

export function useFlights(enabled: boolean) {
  const flightsRef = useRef(new Map<string, FlightRecord>())
  const [version, setVersion] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const client = new FlightClient()

    client.onUpdate = () => {
      flightsRef.current = client.flights
      setConnected(client.connected)
      setVersion(v => v + 1)
    }

    client.connect()

    return () => {
      client.onUpdate = null
      client.disconnect()
    }
  }, [enabled])

  const getFlights = useCallback((): Map<string, FlightRecord> => {
    return flightsRef.current
  }, [])

  return {
    version,
    flights: flightsRef.current,
    connected,
    flightCount: flightsRef.current.size,
    getFlights,
  }
}
