import { useEffect } from 'react'
import { useWeatherStore } from '@/stores/weather-store'

const RADAR_METADATA_URL = 'https://api.rainviewer.com/public/weather-maps.json'
const POLL_INTERVAL = 300_000 // 5 minutes

export function useRadarInit() {
  const setRadarTilePath = useWeatherStore(s => s.setRadarTilePath)

  useEffect(() => {
    async function fetchRadarMeta() {
      try {
        const res = await fetch(RADAR_METADATA_URL)
        if (!res.ok) return
        const data = await res.json() as {
          radar?: { past?: Array<{ path: string; time: number }> }
        }
        const past = data?.radar?.past
        if (past && past.length > 0) {
          // Use the most recent radar scan
          const latest = past[past.length - 1]
          setRadarTilePath(latest.path)
        }
      } catch (err) {
        console.warn('[Radar] Failed to fetch metadata:', (err as Error).message)
      }
    }

    fetchRadarMeta()
    const interval = setInterval(fetchRadarMeta, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [setRadarTilePath])
}
