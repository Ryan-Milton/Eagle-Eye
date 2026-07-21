import { useEffect, useState } from 'react'
import type mapboxgl from 'mapbox-gl'

interface CoordinateHUDProps {
  map: mapboxgl.Map | null
}

export function CoordinateHUD({ map }: CoordinateHUDProps) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [zoom, setZoom] = useState<number>(1.8)

  useEffect(() => {
    if (!map) return

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      setCoords({ lat: e.lngLat.lat, lon: e.lngLat.lng })
    }
    const onMouseLeave = () => setCoords(null)
    const onZoom = () => setZoom(map.getZoom())

    map.on('mousemove', onMouseMove)
    map.getCanvas().addEventListener('mouseleave', onMouseLeave)
    map.on('zoom', onZoom)

    return () => {
      map.off('mousemove', onMouseMove)
      try { map.getCanvas().removeEventListener('mouseleave', onMouseLeave) } catch { /* map already destroyed */ }
      map.off('zoom', onZoom)
    }
  }, [map])

  return (
    <div
      className="pointer-events-none absolute bottom-3 left-3 flex min-h-9 select-none items-center gap-3 border border-line bg-panel px-3 font-mono text-[11px] text-muted-foreground"
      aria-label={coords ? `Latitude ${coords.lat.toFixed(4)}, longitude ${coords.lon.toFixed(4)}, zoom ${zoom.toFixed(1)}` : `Map coordinates unavailable, zoom ${zoom.toFixed(1)}`}
    >
      {coords ? (
        <>
          <span>
            <span className="text-muted-foreground">LAT </span>
            <span className="text-foreground">{coords.lat.toFixed(4)}°</span>
          </span>
          <span>
            <span className="text-muted-foreground">LON </span>
            <span className="text-foreground">{coords.lon.toFixed(4)}°</span>
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">— —</span>
      )}
      <span className="border-l border-line-muted pl-3">
        <span className="text-muted-foreground">Z </span>
        <span className="text-foreground">{zoom.toFixed(1)}</span>
      </span>
    </div>
  )
}
