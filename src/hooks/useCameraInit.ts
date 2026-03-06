import { useEffect } from 'react'
import { useCameraStore } from '@/stores/camera-store'
import type { Camera } from '@/lib/camera-client'

export function useCameraInit() {
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/cameras/nearby?lat=40&lon=-74&radius=5000')
        if (!res.ok) return
        const json = await res.json() as { cameras: Camera[]; errors: string[] }
        if (cancelled) return
        useCameraStore.getState().setCameras(json.cameras ?? [])
      } catch {
        // Cameras are non-critical
      }
    }

    load()
    const interval = setInterval(load, 600_000) // 10 min
    return () => { cancelled = true; clearInterval(interval) }
  }, [])
}
