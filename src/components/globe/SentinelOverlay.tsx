import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { parseSTACResults } from '@/lib/stac-client'
import type { SentinelScene } from '@/lib/stac-client'

interface Props {
  mapRef: React.RefObject<mapboxgl.Map | null>
  getBounds: () => { west: number; south: number; east: number; north: number } | null
}

export function SentinelOverlay({ mapRef, getBounds }: Props) {
  const [scenes, setScenes] = useState<SentinelScene[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)

  const searchScenes = useCallback(async () => {
    const bounds = getBounds()
    if (!bounds) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        west: bounds.west.toFixed(4),
        south: bounds.south.toFixed(4),
        east: bounds.east.toFixed(4),
        north: bounds.north.toFixed(4),
      })
      const res = await fetch(`/api/imagery/search?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const parsed = parseSTACResults(data)
      setScenes(parsed)
    } catch (err) {
      console.warn('[Sentinel] Search failed:', (err as Error).message)
      setScenes([])
    } finally {
      setLoading(false)
    }
  }, [getBounds])

  const loadScene = useCallback((scene: SentinelScene) => {
    const map = mapRef.current
    if (!map || !scene.tileUrl) return

    // Remove previous imagery layer
    if (map.getLayer('sentinel-imagery')) map.removeLayer('sentinel-imagery')
    if (map.getSource('sentinel-imagery')) map.removeSource('sentinel-imagery')

    map.addSource('sentinel-imagery', {
      type: 'raster',
      tiles: [scene.tileUrl],
      tileSize: 256,
      bounds: scene.bbox,
    })
    map.addLayer({
      id: 'sentinel-imagery',
      type: 'raster',
      source: 'sentinel-imagery',
      paint: { 'raster-opacity': 0.85 },
    }, 'radar-layer') // Insert below radar

    setActiveSceneId(scene.id)
  }, [mapRef])

  const clearScene = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    if (map.getLayer('sentinel-imagery')) map.removeLayer('sentinel-imagery')
    if (map.getSource('sentinel-imagery')) map.removeSource('sentinel-imagery')
    setActiveSceneId(null)
  }, [mapRef])

  return (
    <div className="absolute top-2 right-2 z-20">
      <button
        onClick={() => { setOpen(!open); if (!open && scenes.length === 0) searchScenes() }}
        className={cn(
          'px-2 py-1 rounded text-[11px] font-mono border transition-colors',
          open ? 'bg-sky-500/20 border-sky-500 text-sky-400' : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:border-zinc-500'
        )}
      >
        🛰 Imagery
      </button>

      {open && (
        <div className="mt-1 w-64 bg-zinc-900/95 border border-zinc-700 rounded p-2 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] text-zinc-400">Sentinel-2 Scenes</span>
            <button onClick={searchScenes} className="font-mono text-[10px] text-sky-400 hover:text-sky-300">
              {loading ? '...' : 'Search'}
            </button>
          </div>

          {activeSceneId && (
            <button onClick={clearScene} className="w-full mb-1 px-2 py-1 text-[10px] font-mono text-amber-400 border border-amber-800/40 rounded hover:bg-amber-950/30">
              Clear overlay
            </button>
          )}

          {scenes.length === 0 && !loading && (
            <div className="font-mono text-[10px] text-zinc-500 py-2">Search to find scenes in current view</div>
          )}

          {scenes.map(scene => (
            <button
              key={scene.id}
              onClick={() => loadScene(scene)}
              className={cn(
                'w-full text-left px-2 py-1 rounded text-[10px] font-mono border mb-0.5 transition-colors',
                activeSceneId === scene.id
                  ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                  : 'border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/50'
              )}
            >
              <div className="flex justify-between">
                <span>{new Date(scene.datetime).toLocaleDateString()}</span>
                <span className="text-zinc-500">☁ {scene.cloudCover.toFixed(0)}%</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
