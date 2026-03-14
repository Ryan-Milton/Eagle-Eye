import { useEffect } from 'react'
import { useSpaceWeatherStore } from '@/stores/space-weather-store'
import { parseKpIndex, parseSpaceWeatherAlerts } from '@/lib/space-weather-client'

const POLL_INTERVAL = 900_000 // 15 minutes

export function useSpaceWeatherInit() {
  const setData = useSpaceWeatherStore(s => s.setData)
  const setErrors = useSpaceWeatherStore(s => s.setErrors)

  useEffect(() => {
    async function fetchSpaceWeather() {
      try {
        const res = await fetch('/api/space-weather')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const kpIndex = parseKpIndex(data.kpIndex)
        const alerts = parseSpaceWeatherAlerts(data.alerts)
        setData(kpIndex, alerts)
      } catch (err) {
        setErrors([(err as Error).message])
        console.warn('[SpaceWeather] Fetch failed:', (err as Error).message)
      }
    }

    fetchSpaceWeather()
    const interval = setInterval(fetchSpaceWeather, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [setData, setErrors])
}
