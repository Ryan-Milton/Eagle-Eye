import { useEffect, useRef } from 'react'
import { useWeatherStore } from '@/stores/weather-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useAlertStore } from '@/stores/alert-store'

/**
 * Watches data stores and auto-generates alerts for significant events:
 * - Earthquakes M5.0+
 * - High-fatality conflicts (fatalities > 10)
 * - Critical cyber threats (severity >= 8)
 * - Military vessels/aircraft appearing
 */
export function useAlertEngine() {
  const weatherVersion = useWeatherStore(s => s.version)
  const conflictVersion = useConflictStore(s => s.version)
  const cyberVersion = useCyberStore(s => s.version)
  const vesselVersion = useVesselStore(s => s.version)
  const flightVersion = useFlightStore(s => s.version)

  const seenRef = useRef(new Set<string>())

  // Earthquake alerts
  useEffect(() => {
    const events = useWeatherStore.getState().events
    const addAlert = useAlertStore.getState().addAlert
    const seen = seenRef.current

    for (const [, e] of events) {
      const key = `wx-${e.id}`
      if (seen.has(key)) continue
      seen.add(key)

      if (e.type === 'earthquake' && e.magnitude !== null && e.magnitude >= 5.0) {
        addAlert({
          title: `M${e.magnitude.toFixed(1)} Earthquake`,
          description: e.title,
          severity: e.magnitude >= 7.0 ? 'critical' : e.magnitude >= 6.0 ? 'warning' : 'info',
          domain: 'weather',
          entityId: e.id,
        })
      }
      if (e.type === 'volcano') {
        addAlert({
          title: 'Volcanic Activity',
          description: e.title,
          severity: 'warning',
          domain: 'weather',
          entityId: e.id,
        })
      }
    }
  }, [weatherVersion])

  // Conflict alerts
  useEffect(() => {
    const events = useConflictStore.getState().events
    const addAlert = useAlertStore.getState().addAlert
    const seen = seenRef.current

    for (const [, e] of events) {
      const key = `con-${e.id}`
      if (seen.has(key)) continue
      seen.add(key)

      if (e.fatalities >= 10) {
        addAlert({
          title: `${e.type.charAt(0).toUpperCase() + e.type.slice(1)} — ${e.fatalities} fatalities`,
          description: e.title,
          severity: e.fatalities >= 50 ? 'critical' : 'warning',
          domain: 'conflict',
          entityId: e.id,
        })
      }
    }
  }, [conflictVersion])

  // Cyber alerts
  useEffect(() => {
    const events = useCyberStore.getState().events
    const addAlert = useAlertStore.getState().addAlert
    const seen = seenRef.current

    for (const [, e] of events) {
      const key = `cyb-${e.id}`
      if (seen.has(key)) continue
      seen.add(key)

      if (e.severity >= 8) {
        addAlert({
          title: `Critical ${e.type.toUpperCase()} Threat`,
          description: e.title,
          severity: 'critical',
          domain: 'cyber',
          entityId: e.id,
        })
      }
    }
  }, [cyberVersion])

  // Military vessel alerts
  useEffect(() => {
    const vessels = useVesselStore.getState().vessels
    const addAlert = useAlertStore.getState().addAlert
    const seen = seenRef.current

    for (const [, v] of vessels) {
      if (v.type !== 'military') continue
      const key = `mil-v-${v.mmsi}`
      if (seen.has(key)) continue
      seen.add(key)

      addAlert({
        title: 'Military Vessel Detected',
        description: `${v.name || `MMSI ${v.mmsi}`} at ${v.lat.toFixed(2)}, ${v.lon.toFixed(2)}`,
        severity: 'info',
        domain: 'vessel',
        entityId: String(v.mmsi),
      })
    }
  }, [vesselVersion])

  // Military aircraft alerts
  useEffect(() => {
    const flights = useFlightStore.getState().flights
    const addAlert = useAlertStore.getState().addAlert
    const seen = seenRef.current

    for (const [, f] of flights) {
      if (f.type !== 'military') continue
      const key = `mil-f-${f.icao24}`
      if (seen.has(key)) continue
      seen.add(key)

      addAlert({
        title: 'Military Aircraft Detected',
        description: `${f.callsign} (${f.originCountry}) at FL${Math.round(f.altitude * 3.28084 / 100)}`,
        severity: 'info',
        domain: 'flight',
        entityId: f.icao24,
      })
    }
  }, [flightVersion])
}
