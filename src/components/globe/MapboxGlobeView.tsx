import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { cn } from '@/lib/utils'
import { CONSTELLATIONS } from '@/data/constellations'
import { displayRadius } from '@/lib/propagation-kernel'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useSelectionStore } from '@/stores/selection-store'
import { WEATHER_TYPE_DOT_COLORS } from '@/lib/colors'
import type { ConstellationId, SatellitePosition, VesselRecord, FlightRecord, VesselType, FlightType, WeatherEvent, WeatherEventType } from '@/types'
import type { PositionHistory } from '@/lib/position-history'

type MapStyle = 'dark' | 'light'

const STYLES: Record<MapStyle, string> = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
}

const FOG_CONFIGS: Record<MapStyle, mapboxgl.FogSpecification> = {
  dark: {
    'color': '#0a0a0a',
    'high-color': '#1a1a2e',
    'horizon-blend': 0.08,
    'space-color': '#09090b',
    'star-intensity': 0.4,
  },
  light: {
    'color': '#e0e8f0',
    'high-color': '#a8c4e0',
    'horizon-blend': 0.01,
    'space-color': '#09090b',
    'star-intensity': 0.4,
  },
}

const VESSEL_COLOR = '#22d3ee'
const FLIGHT_COLOR = '#eab308'
const EARTH_RADIUS_M = 6_371_000

function hexToString(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0')
}

const CONSTELLATION_COLORS = new Map<ConstellationId, string>(
  CONSTELLATIONS.map(c => [c.id, hexToString(c.color)])
)

type GeoJSONFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point>

function buildSatelliteGeoJSON(
  toggles: Map<ConstellationId, boolean>,
  getPositions: (id: ConstellationId) => SatellitePosition[],
  selectedSatId: number | null,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [id, enabled] of toggles) {
    if (!enabled) continue
    const color = CONSTELLATION_COLORS.get(id) ?? '#ffffff'
    for (const pos of getPositions(id)) {
      const zOffset = (displayRadius(pos.alt) - 1.0) * EARTH_RADIUS_M
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pos.lon, pos.lat] },
        properties: {
          noradId: pos.noradId,
          color,
          selected: pos.noradId === selectedSatId,
          zOffset,
        },
      })
    }
  }
  return { type: 'FeatureCollection', features }
}

function buildVesselGeoJSON(
  vessels: Map<number, VesselRecord>,
  selectedMmsi: number | null,
  vesselTypeToggles: Map<VesselType, boolean>,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [mmsi, v] of vessels) {
    if (vesselTypeToggles.get(v.type) === false) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
      properties: {
        mmsi,
        heading: v.heading,
        selected: mmsi === selectedMmsi,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildFlightGeoJSON(
  flights: Map<string, FlightRecord>,
  selectedIcao: string | null,
  flightTypeToggles: Map<FlightType, boolean>,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [icao24, f] of flights) {
    if (flightTypeToggles.get(f.type) === false) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      properties: {
        icao24,
        callsign: f.callsign,
        heading: f.heading,
        selected: icao24 === selectedIcao,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildWeatherGeoJSON(
  events: Map<string, WeatherEvent>,
  selectedEventId: string | null,
  typeToggles: Map<WeatherEventType, boolean>,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [id, e] of events) {
    if (typeToggles.get(e.type) === false) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        eventId: id,
        color: WEATHER_TYPE_DOT_COLORS[e.type] ?? '#a1a1aa',
        selected: id === selectedEventId,
        magnitude: e.magnitude,
        type: e.type,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildWeatherAlertGeoJSON(
  events: Map<string, WeatherEvent>,
  typeToggles: Map<WeatherEventType, boolean>,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const [id, e] of events) {
    if (typeToggles.get(e.type) === false) continue
    if (!e.geometry) continue
    if (e.geometry.type !== 'Polygon' && e.geometry.type !== 'MultiPolygon') continue
    features.push({
      type: 'Feature',
      geometry: e.geometry,
      properties: { eventId: id, type: e.type },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildTrailGeoJSON(
  flightHistory: PositionHistory<string>,
  vesselHistory: PositionHistory<number>,
  selectedIcao: string | null,
  selectedMmsi: number | null,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []

  let trail: { lon: number; lat: number }[] = []
  let color = '#ffffff'

  if (selectedIcao) {
    trail = flightHistory.getTrail(selectedIcao)
    color = FLIGHT_COLOR
  } else if (selectedMmsi) {
    trail = vesselHistory.getTrail(selectedMmsi)
    color = VESSEL_COLOR
  }

  for (let i = 0; i < trail.length; i++) {
    const pt = trail[i]
    const opacity = trail.length > 1 ? 0.3 + 0.7 * (i / (trail.length - 1)) : 1
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] },
      properties: { color, opacity },
    })
  }

  return { type: 'FeatureCollection', features }
}

function createDotImage(size = 16): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  return ctx.getImageData(0, 0, size, size)
}

function addEntityLayers(map: mapboxgl.Map) {
  if (map.getSource('entity-trail')) return

  if (!map.hasImage('sat-dot')) {
    map.addImage('sat-dot', createDotImage(16), { sdf: true })
  }

  map.addSource('entity-trail', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'entity-trail-layer',
    type: 'circle',
    source: 'entity-trail',
    paint: {
      'circle-radius': 2.5,
      'circle-color': ['get', 'color'],
      'circle-opacity': ['get', 'opacity'],
    },
  })

  map.addSource('satellites', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'satellites-layer',
    type: 'symbol',
    source: 'satellites',
    layout: {
      'icon-image': 'sat-dot',
      'icon-size': ['case', ['get', 'selected'], 1.0, 0.4],
      'icon-allow-overlap': true,
      'symbol-elevation-reference': 'sea',
    } as mapboxgl.SymbolLayerSpecification['layout'],
    paint: {
      'icon-color': ['get', 'color'],
      'icon-opacity': ['case', ['get', 'selected'], 1, 0.7],
      'symbol-z-offset': ['get', 'zOffset'],
    } as mapboxgl.SymbolLayerSpecification['paint'],
  })

  map.addSource('vessels', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'vessels-layer',
    type: 'circle',
    source: 'vessels',
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 6, 3],
      'circle-color': VESSEL_COLOR,
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.7],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': VESSEL_COLOR,
    },
  })

  map.addSource('flights', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'flights-layer',
    type: 'circle',
    source: 'flights',
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 6, 3],
      'circle-color': FLIGHT_COLOR,
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.7],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': FLIGHT_COLOR,
    },
  })

  // Weather alert polygons
  map.addSource('weather-alerts', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'weather-alerts-fill',
    type: 'fill',
    source: 'weather-alerts',
    paint: {
      'fill-color': '#fb7185',
      'fill-opacity': 0.15,
    },
  })
  map.addLayer({
    id: 'weather-alerts-outline',
    type: 'line',
    source: 'weather-alerts',
    paint: {
      'line-color': '#fb7185',
      'line-width': 1.5,
      'line-opacity': 0.6,
    },
  })

  // Weather event points
  map.addSource('weather-events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'weather-events-layer',
    type: 'circle',
    source: 'weather-events',
    paint: {
      'circle-radius': [
        'case',
        ['get', 'selected'], 8,
        ['==', ['get', 'type'], 'earthquake'],
        ['interpolate', ['linear'], ['coalesce', ['get', 'magnitude'], 2], 0, 3, 5, 8, 9, 12],
        5,
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.7],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': ['get', 'color'],
    },
  })
}

const ENTITY_LAYERS = ['satellites-layer', 'vessels-layer', 'flights-layer', 'weather-events-layer'] as const

export function MapboxGlobeView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark')
  const layersReadyRef = useRef(false)

  // Read from stores
  const toggles = useSatelliteStore(s => s.toggles)
  const getPositions = useSatelliteStore(s => s.getPositions)
  const satVersion = useSatelliteStore(s => s.version)
  const vessels = useVesselStore(s => s.vessels)
  const vesselVersion = useVesselStore(s => s.version)
  const vesselTypeToggles = useVesselStore(s => s.typeToggles)
  const vesselHistory = useVesselStore(s => s.history)
  const flights = useFlightStore(s => s.flights)
  const flightVersion = useFlightStore(s => s.version)
  const flightTypeToggles = useFlightStore(s => s.typeToggles)
  const flightHistory = useFlightStore(s => s.history)
  const selectedSatId = useSelectionStore(s => s.selectedSatId)
  const weatherEvents = useWeatherStore(s => s.events)
  const weatherVersion = useWeatherStore(s => s.version)
  const weatherTypeToggles = useWeatherStore(s => s.typeToggles)
  const selectedMmsi = useSelectionStore(s => s.selectedMmsi)
  const selectedIcao = useSelectionStore(s => s.selectedIcao)
  const selectedEventId = useSelectionStore(s => s.selectedEventId)

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: STYLES[mapStyle],
      projection: 'globe',
      center: [0, 20],
      zoom: 1.8,
    })

    map.on('style.load', () => {
      map.setFog(FOG_CONFIGS[map.getStyle().name?.includes('Light') ? 'light' : 'dark'])
      addEntityLayers(map)
      layersReadyRef.current = true
    })

    // Click handlers use store actions directly (stable references)
    map.on('click', 'flights-layer', (e) => {
      if (e.features?.[0]?.properties?.icao24) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectFlight(e.features[0].properties.icao24)
      }
    })
    map.on('click', 'vessels-layer', (e) => {
      if (e.features?.[0]?.properties?.mmsi) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectVessel(e.features[0].properties.mmsi)
      }
    })
    map.on('click', 'satellites-layer', (e) => {
      if (e.features?.[0]?.properties?.noradId) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectSatellite(e.features[0].properties.noradId)
      }
    })
    map.on('click', 'weather-events-layer', (e) => {
      if (e.features?.[0]?.properties?.eventId) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectEvent(e.features[0].properties.eventId)
      }
    })

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [...ENTITY_LAYERS] })
      if (features.length === 0) {
        useSelectionStore.getState().clearAll()
      }
    })

    for (const layer of ENTITY_LAYERS) {
      map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
    }

    mapRef.current = map

    return () => {
      layersReadyRef.current = false
      map.remove()
      mapRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style)
    const map = mapRef.current
    if (!map) return
    layersReadyRef.current = false
    map.setStyle(STYLES[style])
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onStyleLoad = () => {
      map.setFog(FOG_CONFIGS[mapStyle])
      addEntityLayers(map)
      layersReadyRef.current = true
    }
    map.on('style.load', onStyleLoad)
    return () => { map.off('style.load', onStyleLoad) }
  }, [mapStyle])

  // Sync satellite data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('satellites') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildSatelliteGeoJSON(toggles, getPositions, selectedSatId))
  }, [satVersion, toggles, getPositions, selectedSatId])

  // Sync vessel data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('vessels') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildVesselGeoJSON(vessels, selectedMmsi, vesselTypeToggles))
  }, [vesselVersion, vessels, selectedMmsi, vesselTypeToggles])

  // Sync flight data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('flights') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildFlightGeoJSON(flights, selectedIcao, flightTypeToggles))
  }, [flightVersion, flights, selectedIcao, flightTypeToggles])

  // Sync weather data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('weather-events') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildWeatherGeoJSON(weatherEvents, selectedEventId, weatherTypeToggles))
    const alertSrc = map.getSource('weather-alerts') as mapboxgl.GeoJSONSource | undefined
    if (alertSrc) alertSrc.setData(buildWeatherAlertGeoJSON(weatherEvents, weatherTypeToggles))
  }, [weatherVersion, weatherEvents, selectedEventId, weatherTypeToggles])

  // Sync trail data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('entity-trail') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildTrailGeoJSON(flightHistory, vesselHistory, selectedIcao, selectedMmsi))
  }, [selectedIcao, selectedMmsi, flightVersion, vesselVersion, flightHistory, vesselHistory])

  // Sync all data after style change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const syncAll = () => {
      const satSrc = map.getSource('satellites') as mapboxgl.GeoJSONSource | undefined
      if (satSrc) satSrc.setData(buildSatelliteGeoJSON(toggles, getPositions, selectedSatId))
      const vesselSrc = map.getSource('vessels') as mapboxgl.GeoJSONSource | undefined
      if (vesselSrc) vesselSrc.setData(buildVesselGeoJSON(vessels, selectedMmsi, vesselTypeToggles))
      const flightSrc = map.getSource('flights') as mapboxgl.GeoJSONSource | undefined
      if (flightSrc) flightSrc.setData(buildFlightGeoJSON(flights, selectedIcao, flightTypeToggles))
      const trailSrc = map.getSource('entity-trail') as mapboxgl.GeoJSONSource | undefined
      if (trailSrc) trailSrc.setData(buildTrailGeoJSON(flightHistory, vesselHistory, selectedIcao, selectedMmsi))
      const weatherSrc = map.getSource('weather-events') as mapboxgl.GeoJSONSource | undefined
      if (weatherSrc) weatherSrc.setData(buildWeatherGeoJSON(weatherEvents, selectedEventId, weatherTypeToggles))
      const alertSrc = map.getSource('weather-alerts') as mapboxgl.GeoJSONSource | undefined
      if (alertSrc) alertSrc.setData(buildWeatherAlertGeoJSON(weatherEvents, weatherTypeToggles))
    }
    map.on('style.load', syncAll)
    return () => { map.off('style.load', syncAll) }
  }, [toggles, getPositions, selectedSatId, satVersion, vessels, selectedMmsi, vesselVersion, vesselTypeToggles, flights, selectedIcao, flightVersion, flightTypeToggles, flightHistory, vesselHistory, weatherEvents, selectedEventId, weatherVersion, weatherTypeToggles])

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Style toggle */}
      <div className="absolute top-3 left-3 flex rounded-md overflow-hidden border border-zinc-700 bg-zinc-900/90 backdrop-blur-sm">
        {(['dark', 'light'] as const).map(style => (
          <button
            key={style}
            onClick={() => handleStyleChange(style)}
            className={cn(
              'px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors',
              mapStyle === style
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : 'text-zinc-500 hover:text-zinc-300',
              style === 'dark' && 'border-r border-zinc-700',
            )}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  )
}
