import { useEffect, useState, useCallback, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { useGeofenceStore } from '@/stores/geofence-store'
import { useAppStore } from '@/stores/app-store'
import { getVisualTheme } from '@/lib/visual-theme'
import type { Geofence } from '@/lib/persistence'

interface GeofenceToolProps {
  map: mapboxgl.Map | null
}

const SOURCE_ID = 'geofence-zones'
const FILL_LAYER_ID = 'geofence-fill'
const OUTLINE_LAYER_ID = 'geofence-outline'
const LABEL_LAYER_ID = 'geofence-label'

function buildGeofenceGeoJSON(geofences: Geofence[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geofences.map(gf => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[
          [gf.west, gf.north],
          [gf.east, gf.north],
          [gf.east, gf.south],
          [gf.west, gf.south],
          [gf.west, gf.north],
        ]],
      },
      properties: { id: gf.id, name: gf.name },
    })),
  }
}

export function GeofenceTool({ map }: GeofenceToolProps) {
  const [drawing, setDrawing] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const startRef = useRef<{ lon: number; lat: number } | null>(null)
  const { geofences, addGeofence, removeGeofence, loadFromDB } = useGeofenceStore()
  const geofencesRef = useRef(geofences)
  const theme = useAppStore(state => state.theme)
  const visualTheme = getVisualTheme(theme)

  useEffect(() => { geofencesRef.current = geofences }, [geofences])

  // Load geofences from IndexedDB on mount
  useEffect(() => { loadFromDB() }, [loadFromDB])

  // Register map sources/layers for geofence visualization
  useEffect(() => {
    if (!map) return

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: buildGeofenceGeoJSON(geofencesRef.current),
      })
      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': visualTheme.signal,
          'fill-opacity': 0.08,
        },
      })
      map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': visualTheme.signal,
          'line-width': 2,
          'line-dasharray': [4, 2],
          'line-opacity': 0.6,
        },
      })
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 0.5],
        },
        paint: {
          'text-color': visualTheme.signal,
          'text-halo-color': visualTheme.background,
          'text-halo-width': 1,
        },
      })
    }

    if (map.isStyleLoaded()) addLayers()
    map.on('style.load', addLayers)

    return () => {
      map.off('style.load', addLayers)
      try {
        if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID)
        if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID)
        if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch { /* map already destroyed */ }
    }
  }, [map, theme, visualTheme.background, visualTheme.signal])

  // Sync geofences to map
  useEffect(() => {
    if (!map) return
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildGeofenceGeoJSON(geofences))
  }, [map, geofences])

  // Drawing handlers
  useEffect(() => {
    if (!map || !drawing) return

    const onMouseDown = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault()
      startRef.current = { lon: e.lngLat.lng, lat: e.lngLat.lat }
      map.dragPan.disable()
    }

    const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!startRef.current) return
      const s = startRef.current
      const preview: Geofence = {
        id: 'preview',
        name: 'New Zone',
        north: Math.max(s.lat, e.lngLat.lat),
        south: Math.min(s.lat, e.lngLat.lat),
        east: Math.max(s.lon, e.lngLat.lng),
        west: Math.min(s.lon, e.lngLat.lng),
        alertOnEnter: true,
        alertOnExit: false,
      }
      const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
      if (src) src.setData(buildGeofenceGeoJSON([...geofences, preview]))
    }

    const onMouseUp = (e: mapboxgl.MapMouseEvent) => {
      map.dragPan.enable()
      if (!startRef.current) return
      const s = startRef.current
      startRef.current = null

      const north = Math.max(s.lat, e.lngLat.lat)
      const south = Math.min(s.lat, e.lngLat.lat)
      const east = Math.max(s.lon, e.lngLat.lng)
      const west = Math.min(s.lon, e.lngLat.lng)

      // Only create if area is meaningful (at least ~0.1 degree)
      if (Math.abs(north - south) < 0.05 || Math.abs(east - west) < 0.05) {
        const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
        if (src) src.setData(buildGeofenceGeoJSON(geofences))
        return
      }

      addGeofence({
        name: `Zone ${geofences.length + 1}`,
        north, south, east, west,
        alertOnEnter: true,
        alertOnExit: false,
      })
      setDrawing(false)
    }

    map.on('mousedown', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)
    map.getCanvas().style.cursor = 'crosshair'

    return () => {
      map.off('mousedown', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      map.getCanvas().style.cursor = ''
      map.dragPan.enable()
    }
  }, [map, drawing, geofences, addGeofence])

  const handleToggleDraw = useCallback(() => {
    setDrawing(!drawing)
    if (!drawing) setShowPanel(true)
  }, [drawing])

  return (
    <div className="absolute right-3 top-14 flex flex-col items-end gap-2 text-foreground sm:right-48 sm:top-3">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={handleToggleDraw}
          aria-label={drawing ? 'Cancel geofence drawing' : 'Draw a geofence'}
          aria-pressed={drawing}
          className={`min-h-9 border px-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
            drawing
              ? 'border-signal bg-signal text-signal-foreground'
              : 'border-line bg-panel text-muted-foreground hover:bg-panel-raised hover:text-foreground'
          }`}
        >
          {drawing ? 'Drawing...' : 'Geofence'}
        </button>
        {geofences.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPanel(!showPanel)}
            aria-label={`${showPanel ? 'Hide' : 'Show'} ${geofences.length} saved geofences`}
            aria-expanded={showPanel}
            className="min-h-9 min-w-9 border border-line bg-panel px-2 font-mono text-xs text-muted-foreground hover:bg-panel-raised hover:text-foreground"
          >
            {geofences.length}
          </button>
        )}
      </div>

      {showPanel && geofences.length > 0 && (
        <div className="max-h-[200px] min-w-[200px] overflow-y-auto border border-line bg-panel px-3 py-2 font-mono text-[11px]">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Geofences</div>
          {geofences.map(gf => (
            <div key={gf.id} className="flex min-h-9 items-center justify-between border-b border-line-muted py-1">
              <span className="flex-1 truncate text-foreground">{gf.name}</span>
              <div className="flex gap-1.5 ml-2 flex-shrink-0">
                <span className="self-center text-[9px] text-signal">
                  {gf.alertOnEnter ? 'ENT' : ''} {gf.alertOnExit ? 'EXT' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => removeGeofence(gf.id)}
                  aria-label={`Remove ${gf.name} geofence`}
                  className="grid size-9 place-items-center border border-line-muted text-[10px] text-muted-foreground hover:border-danger hover:bg-danger hover:text-background"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
