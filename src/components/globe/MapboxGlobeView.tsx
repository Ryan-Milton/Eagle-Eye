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
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useAppStore } from '@/stores/app-store'
import { WEATHER_TYPE_DOT_COLORS, NEWS_CATEGORY_DOT_COLORS, CONFLICT_TYPE_DOT_COLORS, CYBER_TYPE_DOT_COLORS } from '@/lib/colors'
import { CoordinateHUD } from './CoordinateHUD'
import { MeasurementTool } from './MeasurementTool'
import type { ConstellationId, SatellitePosition, VesselRecord, FlightRecord, VesselType, FlightType, WeatherEvent, WeatherEventType, NewsEvent, NewsCategory, ConflictEvent, ConflictEventType, CyberEvent, CyberEventType } from '@/types'
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
  timelineCursor?: number,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [mmsi, v] of vessels) {
    if (vesselTypeToggles.get(v.type) === false) continue
    if (timelineCursor && v.lastUpdate > timelineCursor) continue
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
  timelineCursor?: number,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [icao24, f] of flights) {
    if (flightTypeToggles.get(f.type) === false) continue
    if (timelineCursor && f.lastUpdate > timelineCursor) continue
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
  timelineCursor?: number,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [id, e] of events) {
    if (typeToggles.get(e.type) === false) continue
    if (timelineCursor && e.lastUpdate > timelineCursor) continue
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

function buildNewsGeoJSON(
  events: Map<string, NewsEvent>,
  selectedNewsId: string | null,
  categoryToggles: Map<NewsCategory, boolean>,
  timelineCursor?: number,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [id, e] of events) {
    if (categoryToggles.get(e.category) === false) continue
    if (timelineCursor && e.lastUpdate > timelineCursor) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        newsId: id,
        color: NEWS_CATEGORY_DOT_COLORS[e.category] ?? '#a1a1aa',
        selected: id === selectedNewsId,
        tone: e.tone,
        category: e.category,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildConflictGeoJSON(
  events: Map<string, ConflictEvent>,
  selectedConflictId: string | null,
  typeToggles: Map<ConflictEventType, boolean>,
  timelineCursor?: number,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [id, e] of events) {
    if (typeToggles.get(e.type) === false) continue
    if (timelineCursor && e.lastUpdate > timelineCursor) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        conflictId: id,
        color: CONFLICT_TYPE_DOT_COLORS[e.type] ?? '#f87171',
        selected: id === selectedConflictId,
        fatalities: e.fatalities,
        type: e.type,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

function buildCyberGeoJSON(
  events: Map<string, CyberEvent>,
  selectedCyberId: string | null,
  typeToggles: Map<CyberEventType, boolean>,
  timelineCursor?: number,
): GeoJSONFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (const [id, e] of events) {
    if (typeToggles.get(e.type) === false) continue
    if (timelineCursor && e.lastUpdate > timelineCursor) continue
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: {
        cyberId: id,
        color: CYBER_TYPE_DOT_COLORS[e.type] ?? '#c084fc',
        selected: id === selectedCyberId,
        severity: e.severity,
        type: e.type,
      },
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

  // --- Vessels with clustering ---
  map.addSource('vessels', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
  // Cluster circles
  map.addLayer({
    id: 'vessels-cluster',
    type: 'circle',
    source: 'vessels',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': VESSEL_COLOR,
      'circle-opacity': 0.6,
      'circle-radius': ['step', ['get', 'point_count'], 14, 50, 18, 200, 22],
    },
  })
  map.addLayer({
    id: 'vessels-cluster-count',
    type: 'symbol',
    source: 'vessels',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  })
  // Individual vessel points
  map.addLayer({
    id: 'vessels-layer',
    type: 'circle',
    source: 'vessels',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 6, 3],
      'circle-color': VESSEL_COLOR,
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.7],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': VESSEL_COLOR,
    },
  })

  // --- Flights with clustering ---
  map.addSource('flights', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
  map.addLayer({
    id: 'flights-cluster',
    type: 'circle',
    source: 'flights',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': FLIGHT_COLOR,
      'circle-opacity': 0.6,
      'circle-radius': ['step', ['get', 'point_count'], 14, 50, 18, 200, 22],
    },
  })
  map.addLayer({
    id: 'flights-cluster-count',
    type: 'symbol',
    source: 'flights',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'flights-layer',
    type: 'circle',
    source: 'flights',
    filter: ['!', ['has', 'point_count']],
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

  // --- Weather events with clustering ---
  map.addSource('weather-events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
  map.addLayer({
    id: 'weather-events-cluster',
    type: 'circle',
    source: 'weather-events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#fb7185',
      'circle-opacity': 0.6,
      'circle-radius': ['step', ['get', 'point_count'], 14, 50, 18, 200, 22],
    },
  })
  map.addLayer({
    id: 'weather-events-cluster-count',
    type: 'symbol',
    source: 'weather-events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'weather-events-layer',
    type: 'circle',
    source: 'weather-events',
    filter: ['!', ['has', 'point_count']],
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

  // --- News events with clustering ---
  map.addSource('news-events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
  map.addLayer({
    id: 'news-events-cluster',
    type: 'circle',
    source: 'news-events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#fb7185',
      'circle-opacity': 0.5,
      'circle-radius': ['step', ['get', 'point_count'], 12, 50, 16, 200, 20],
    },
  })
  map.addLayer({
    id: 'news-events-cluster-count',
    type: 'symbol',
    source: 'news-events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 10,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'news-events-layer',
    type: 'circle',
    source: 'news-events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 7, 4],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.6],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': ['get', 'color'],
    },
  })

  // --- Conflict events with clustering ---
  map.addSource('conflict-events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
  map.addLayer({
    id: 'conflict-events-cluster',
    type: 'circle',
    source: 'conflict-events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#f87171',
      'circle-opacity': 0.6,
      'circle-radius': ['step', ['get', 'point_count'], 14, 50, 18, 200, 22],
    },
  })
  map.addLayer({
    id: 'conflict-events-cluster-count',
    type: 'symbol',
    source: 'conflict-events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 11,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'conflict-events-layer',
    type: 'circle',
    source: 'conflict-events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': [
        'case',
        ['get', 'selected'], 8,
        ['interpolate', ['linear'], ['coalesce', ['get', 'fatalities'], 0], 0, 4, 10, 7, 100, 12],
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.7],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': ['get', 'color'],
    },
  })

  // --- Cyber events with clustering ---
  map.addSource('cyber-events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  })
  map.addLayer({
    id: 'cyber-events-cluster',
    type: 'circle',
    source: 'cyber-events',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#c084fc',
      'circle-opacity': 0.5,
      'circle-radius': ['step', ['get', 'point_count'], 12, 50, 16, 200, 20],
    },
  })
  map.addLayer({
    id: 'cyber-events-cluster-count',
    type: 'symbol',
    source: 'cyber-events',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 10,
      'text-allow-overlap': true,
    },
    paint: { 'text-color': '#ffffff' },
  })
  map.addLayer({
    id: 'cyber-events-layer',
    type: 'circle',
    source: 'cyber-events',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': [
        'case',
        ['get', 'selected'], 7,
        ['interpolate', ['linear'], ['coalesce', ['get', 'severity'], 1], 1, 3, 5, 6, 10, 10],
      ],
      'circle-color': ['get', 'color'],
      'circle-opacity': ['case', ['get', 'selected'], 1, 0.6],
      'circle-stroke-width': ['case', ['get', 'selected'], 2, 0],
      'circle-stroke-color': ['get', 'color'],
    },
  })
}

const ENTITY_LAYERS = ['satellites-layer', 'vessels-layer', 'flights-layer', 'weather-events-layer', 'news-events-layer', 'conflict-events-layer', 'cyber-events-layer'] as const
const CLUSTER_LAYERS = ['vessels-cluster', 'flights-cluster', 'weather-events-cluster', 'news-events-cluster', 'conflict-events-cluster', 'cyber-events-cluster'] as const

export function MapboxGlobeView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)
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
  const newsEvents = useNewsStore(s => s.events)
  const newsVersion = useNewsStore(s => s.version)
  const newsCategoryToggles = useNewsStore(s => s.categoryToggles)
  const conflictEvents = useConflictStore(s => s.events)
  const conflictVersion = useConflictStore(s => s.version)
  const conflictTypeToggles = useConflictStore(s => s.typeToggles)
  const cyberEvents = useCyberStore(s => s.events)
  const cyberVersion = useCyberStore(s => s.version)
  const cyberTypeToggles = useCyberStore(s => s.typeToggles)
  const selectedMmsi = useSelectionStore(s => s.selectedMmsi)
  const selectedIcao = useSelectionStore(s => s.selectedIcao)
  const selectedEventId = useSelectionStore(s => s.selectedEventId)
  const selectedNewsId = useSelectionStore(s => s.selectedNewsId)
  const selectedConflictId = useSelectionStore(s => s.selectedConflictId)
  const selectedCyberId = useSelectionStore(s => s.selectedCyberId)
  const timelineCursor = useAppStore(s => s.timelineCursor)
  const timelineLive = useAppStore(s => s.timelineLive)

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
    map.on('click', 'news-events-layer', (e) => {
      if (e.features?.[0]?.properties?.newsId) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectNews(e.features[0].properties.newsId)
      }
    })
    map.on('click', 'conflict-events-layer', (e) => {
      if (e.features?.[0]?.properties?.conflictId) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectConflict(e.features[0].properties.conflictId)
      }
    })
    map.on('click', 'cyber-events-layer', (e) => {
      if (e.features?.[0]?.properties?.cyberId) {
        e.originalEvent.stopPropagation()
        useSelectionStore.getState().selectCyber(e.features[0].properties.cyberId)
      }
    })

    // Cluster click → expand zoom
    for (const clusterLayer of CLUSTER_LAYERS) {
      const sourceId = clusterLayer.replace('-cluster', '')
      map.on('click', clusterLayer, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [clusterLayer] })
        if (!features.length) return
        const clusterId = features[0].properties?.cluster_id
        if (clusterId == null) return
        const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined
        if (!src) return
        src.getClusterExpansionZoom(clusterId, (_err, zoom) => {
          if (_err || zoom == null) return
          const geom = features[0].geometry
          if (geom.type === 'Point') {
            map.easeTo({ center: geom.coordinates as [number, number], zoom })
          }
        })
      })
      map.on('mouseenter', clusterLayer, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', clusterLayer, () => { map.getCanvas().style.cursor = '' })
    }

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
    setMapReady(true)

    return () => {
      layersReadyRef.current = false
      map.remove()
      mapRef.current = null
      setMapReady(false)
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

  // --- Fly-to on entity selection ---
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Satellite selected
    if (selectedSatId !== null) {
      // Find position from all enabled constellations
      for (const [id, enabled] of toggles) {
        if (!enabled) continue
        const pos = getPositions(id).find(p => p.noradId === selectedSatId)
        if (pos) {
          map.flyTo({ center: [pos.lon, pos.lat], zoom: 3, duration: 1500 })
          return
        }
      }
    }

    // Vessel selected
    if (selectedMmsi !== null) {
      const v = vessels.get(selectedMmsi)
      if (v) {
        map.flyTo({ center: [v.lon, v.lat], zoom: 6, duration: 1500 })
        return
      }
    }

    // Flight selected
    if (selectedIcao !== null) {
      const f = flights.get(selectedIcao)
      if (f) {
        map.flyTo({ center: [f.lon, f.lat], zoom: 6, duration: 1500 })
        return
      }
    }

    // Weather event selected
    if (selectedEventId !== null) {
      const e = weatherEvents.get(selectedEventId)
      if (e) {
        map.flyTo({ center: [e.lon, e.lat], zoom: 5, duration: 1500 })
        return
      }
    }

    // News selected
    if (selectedNewsId !== null) {
      const e = newsEvents.get(selectedNewsId)
      if (e) {
        map.flyTo({ center: [e.lon, e.lat], zoom: 5, duration: 1500 })
        return
      }
    }

    // Conflict selected
    if (selectedConflictId !== null) {
      const e = conflictEvents.get(selectedConflictId)
      if (e) {
        map.flyTo({ center: [e.lon, e.lat], zoom: 6, duration: 1500 })
        return
      }
    }

    // Cyber selected
    if (selectedCyberId !== null) {
      const e = cyberEvents.get(selectedCyberId)
      if (e) {
        map.flyTo({ center: [e.lon, e.lat], zoom: 5, duration: 1500 })
        return
      }
    }
  }, [selectedSatId, selectedMmsi, selectedIcao, selectedEventId, selectedNewsId, selectedConflictId, selectedCyberId, toggles, getPositions, vessels, flights, weatherEvents, newsEvents, conflictEvents, cyberEvents])

  // Use timeline cursor only when not live
  const cursorForFilter = timelineLive ? undefined : timelineCursor

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
    if (src) src.setData(buildVesselGeoJSON(vessels, selectedMmsi, vesselTypeToggles, cursorForFilter))
  }, [vesselVersion, vessels, selectedMmsi, vesselTypeToggles, cursorForFilter])

  // Sync flight data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('flights') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildFlightGeoJSON(flights, selectedIcao, flightTypeToggles, cursorForFilter))
  }, [flightVersion, flights, selectedIcao, flightTypeToggles, cursorForFilter])

  // Sync weather data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('weather-events') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildWeatherGeoJSON(weatherEvents, selectedEventId, weatherTypeToggles, cursorForFilter))
    const alertSrc = map.getSource('weather-alerts') as mapboxgl.GeoJSONSource | undefined
    if (alertSrc) alertSrc.setData(buildWeatherAlertGeoJSON(weatherEvents, weatherTypeToggles))
  }, [weatherVersion, weatherEvents, selectedEventId, weatherTypeToggles, cursorForFilter])

  // Sync trail data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('entity-trail') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildTrailGeoJSON(flightHistory, vesselHistory, selectedIcao, selectedMmsi))
  }, [selectedIcao, selectedMmsi, flightVersion, vesselVersion, flightHistory, vesselHistory])

  // Sync news data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('news-events') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildNewsGeoJSON(newsEvents, selectedNewsId, newsCategoryToggles, cursorForFilter))
  }, [newsVersion, newsEvents, selectedNewsId, newsCategoryToggles, cursorForFilter])

  // Sync conflict data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('conflict-events') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildConflictGeoJSON(conflictEvents, selectedConflictId, conflictTypeToggles, cursorForFilter))
  }, [conflictVersion, conflictEvents, selectedConflictId, conflictTypeToggles, cursorForFilter])

  // Sync cyber data
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersReadyRef.current) return
    const src = map.getSource('cyber-events') as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildCyberGeoJSON(cyberEvents, selectedCyberId, cyberTypeToggles, cursorForFilter))
  }, [cyberVersion, cyberEvents, selectedCyberId, cyberTypeToggles, cursorForFilter])

  // Sync all data after style change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const syncAll = () => {
      const satSrc = map.getSource('satellites') as mapboxgl.GeoJSONSource | undefined
      if (satSrc) satSrc.setData(buildSatelliteGeoJSON(toggles, getPositions, selectedSatId))
      const vesselSrc = map.getSource('vessels') as mapboxgl.GeoJSONSource | undefined
      if (vesselSrc) vesselSrc.setData(buildVesselGeoJSON(vessels, selectedMmsi, vesselTypeToggles, cursorForFilter))
      const flightSrc = map.getSource('flights') as mapboxgl.GeoJSONSource | undefined
      if (flightSrc) flightSrc.setData(buildFlightGeoJSON(flights, selectedIcao, flightTypeToggles, cursorForFilter))
      const trailSrc = map.getSource('entity-trail') as mapboxgl.GeoJSONSource | undefined
      if (trailSrc) trailSrc.setData(buildTrailGeoJSON(flightHistory, vesselHistory, selectedIcao, selectedMmsi))
      const weatherSrc = map.getSource('weather-events') as mapboxgl.GeoJSONSource | undefined
      if (weatherSrc) weatherSrc.setData(buildWeatherGeoJSON(weatherEvents, selectedEventId, weatherTypeToggles, cursorForFilter))
      const alertSrc = map.getSource('weather-alerts') as mapboxgl.GeoJSONSource | undefined
      if (alertSrc) alertSrc.setData(buildWeatherAlertGeoJSON(weatherEvents, weatherTypeToggles))
      const newsSrc = map.getSource('news-events') as mapboxgl.GeoJSONSource | undefined
      if (newsSrc) newsSrc.setData(buildNewsGeoJSON(newsEvents, selectedNewsId, newsCategoryToggles, cursorForFilter))
      const conflictSrc = map.getSource('conflict-events') as mapboxgl.GeoJSONSource | undefined
      if (conflictSrc) conflictSrc.setData(buildConflictGeoJSON(conflictEvents, selectedConflictId, conflictTypeToggles, cursorForFilter))
      const cyberSrc = map.getSource('cyber-events') as mapboxgl.GeoJSONSource | undefined
      if (cyberSrc) cyberSrc.setData(buildCyberGeoJSON(cyberEvents, selectedCyberId, cyberTypeToggles, cursorForFilter))
    }
    map.on('style.load', syncAll)
    return () => { map.off('style.load', syncAll) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggles, getPositions, selectedSatId, satVersion, vessels, selectedMmsi, vesselVersion, vesselTypeToggles, flights, selectedIcao, flightVersion, flightTypeToggles, flightHistory, vesselHistory, weatherEvents, selectedEventId, weatherVersion, weatherTypeToggles, newsEvents, selectedNewsId, newsVersion, newsCategoryToggles, conflictEvents, selectedConflictId, conflictVersion, conflictTypeToggles, cyberEvents, selectedCyberId, cyberVersion, cyberTypeToggles, cursorForFilter])

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

      {/* Map overlays */}
      <CoordinateHUD map={mapReady ? mapRef.current : null} />
      <MeasurementTool map={mapReady ? mapRef.current : null} />
    </div>
  )
}
