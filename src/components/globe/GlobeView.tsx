import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { cn, latLonToVec3 } from '@/lib/utils'
import { buildEarthTexture } from './buildEarthTexture'
import { buildCountryBorders } from './buildCountryBorders'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { SatelliteLayer } from './SatelliteLayer'
import { VesselLayer } from './VesselLayer'
import { FlightLayer } from './FlightLayer'
import { CONSTELLATIONS, CATEGORY_LABELS } from '@/data/constellations'
import { displayRadius } from '@/lib/propagation-kernel'
import { createTileGlobe, type TileStyle } from './TileGlobe'
import { TerrainLayer } from './TerrainLayer'
import { BuildingLayer } from './BuildingLayer'
import type { MapView } from 'geo-three'
import type { ConstellationId, SatCategory, SatellitePosition, VesselRecord, FlightRecord } from '@/types'

const HOME_ZOOM = 4.65
const HOME_RX = 0.25
const HOME_RY = 0
const MIN_ZOOM = 1.0003
const MAX_ZOOM = 5.5
const PAUSE_MS = 10_000
const MAX_SATS_PER_LAYER = 10_000

interface VesselLayerProps {
  enabled: boolean
  vessels: Map<number, VesselRecord>
  version: number
  selectedMmsi: number | null
  onVesselClick: (mmsi: number | null) => void
}

interface FlightLayerProps {
  enabled: boolean
  flights: Map<string, FlightRecord>
  version: number
  selectedIcao: string | null
  onFlightClick: (icao: string | null) => void
}

interface GlobeViewProps {
  toggles: Map<ConstellationId, boolean>
  getPositions: (id: ConstellationId) => SatellitePosition[]
  version: number
  selectedSatId: number | null
  onSatelliteClick?: (noradId: number | null) => void
  onToggle: (id: ConstellationId) => void
  loading: Set<ConstellationId>
  getSatelliteCount: (id: ConstellationId) => number
  vesselLayer?: VesselLayerProps
  flightLayer?: FlightLayerProps
}

export function GlobeView({
  toggles,
  getPositions,
  version,
  selectedSatId,
  onSatelliteClick,
  onToggle,
  loading,
  getSatelliteCount,
  vesselLayer: vesselLayerProps,
  flightLayer: flightLayerProps,
}: GlobeViewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({
    rx: HOME_RX, ry: 0, trx: HOME_RX, try_: 0,
    zoom: HOME_ZOOM, tzoom: HOME_ZOOM,
    pitch: 0, tpitch: 0,
    drag: false, rightDrag: false, px: 0, py: 0,
    frame: 0,
    rafId: 0,
    autoRotOffset: 0,
    autoRotating: true,
    pauseUntil: 0,
    pausedPermanently: false,
    // Street-level camera state
    cameraMode: 'orbit' as 'orbit' | 'street',
    streetLat: 0,
    streetLon: 0,
    streetHeading: 0,
    streetLookPitch: 0,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    pendingStreetMode: false,
  })
  const layersRef = useRef<Map<ConstellationId, SatelliteLayer>>(new Map())
  const vesselLayerRef = useRef<VesselLayer | null>(null)
  const flightLayerRef = useRef<FlightLayer | null>(null)
  const onSatClickRef = useRef(onSatelliteClick)
  onSatClickRef.current = onSatelliteClick
  const onVesselClickRef = useRef(vesselLayerProps?.onVesselClick)
  onVesselClickRef.current = vesselLayerProps?.onVesselClick
  const onFlightClickRef = useRef(flightLayerProps?.onFlightClick)
  onFlightClickRef.current = flightLayerProps?.onFlightClick
  const gridRef = useRef<THREE.Object3D | null>(null)
  const selectedMarkerRef = useRef<THREE.Group | null>(null)
  const selectedVesselMarkerRef = useRef<THREE.Group | null>(null)
  const selectedFlightMarkerRef = useRef<THREE.Group | null>(null)
  const gGroupRef = useRef<THREE.Group | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const tileGlobeRef = useRef<MapView | null>(null)
  const terrainLayerRef = useRef<TerrainLayer | null>(null)
  const buildingLayerRef = useRef<BuildingLayer | null>(null)
  const proceduralMeshesRef = useRef<THREE.Object3D[]>([])
  const [coords, setCoords] = useState('LAT — LON — ALT')
  const [gridVisible, setGridVisible] = useState(true)
  const [tileGlobeVisible, setTileGlobeVisible] = useState(false)
  const [tileStyle, setTileStyle] = useState<TileStyle>('dark')
  const [terrainVisible, setTerrainVisible] = useState(false)
  const [buildingsVisible, setBuildingsVisible] = useState(false)
  const [rotationLocked, setRotationLocked] = useState(false)
  const [cameraMode, setCameraMode] = useState<'orbit' | 'street'>('orbit')
  const [overlayExpanded, setOverlayExpanded] = useState<Set<SatCategory>>(new Set())

  const zoom = useCallback((delta: number) => {
    const altitude = stateRef.current.tzoom - 1.0
    stateRef.current.tzoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, 1.0 + altitude * (delta > 0 ? 1.5 : 0.667)))
  }, [])

  const toggleRotationLock = useCallback(() => {
    const s = stateRef.current
    setRotationLocked(prev => {
      if (prev) {
        // Unlock: resume auto-rotation
        s.autoRotating = true
        s.pauseUntil = 0
        s.pausedPermanently = false
      } else {
        // Lock: stop auto-rotation
        s.autoRotating = false
        s.pauseUntil = 0
        s.pausedPermanently = true
      }
      return !prev
    })
  }, [])

  const resetView = useCallback(() => {
    const s = stateRef.current
    if (s.cameraMode === 'street') {
      // Exit street mode first, then reset
      const cam = cameraRef.current
      const gGroup = gGroupRef.current
      if (cam && gGroup) {
        gGroup.remove(cam)
        sceneRef.current?.add(cam)
      }
      s.cameraMode = 'orbit'
      s.pendingStreetMode = false
      setCameraMode('orbit')
    }
    s.tzoom = HOME_ZOOM
    s.trx = HOME_RX
    s.try_ = HOME_RY - s.autoRotOffset
    s.tpitch = 0
    s.autoRotating = true
    s.pauseUntil = 0
    s.pausedPermanently = false
    setRotationLocked(false)
  }, [])

  const enterStreetView = useCallback(() => {
    const s = stateRef.current
    if (s.cameraMode === 'street') return
    // Calculate lat/lon from current view center
    const lat = -s.rx * 57.3
    const lon = -(s.ry + s.autoRotOffset) * 57.3
    s.streetLat = lat
    s.streetLon = lon
    s.streetHeading = 0
    s.streetLookPitch = 0
    s.moveForward = s.moveBackward = s.moveLeft = s.moveRight = false
    s.autoRotating = false
    s.pauseUntil = 0
    s.pausedPermanently = true
    s.tzoom = MIN_ZOOM
    s.tpitch = 0
    s.pendingStreetMode = true
  }, [])

  const exitStreetView = useCallback(() => {
    const s = stateRef.current
    if (s.cameraMode !== 'street') return
    const cam = cameraRef.current
    const gGroup = gGroupRef.current
    if (cam && gGroup) {
      gGroup.remove(cam)
      sceneRef.current?.add(cam)
    }
    s.cameraMode = 'orbit'
    s.pendingStreetMode = false
    s.tzoom = 1.2
    // Set orbit view to match street location
    s.trx = -s.streetLat / 57.3
    s.try_ = -s.streetLon / 57.3 - s.autoRotOffset
    s.tpitch = 0
    setCameraMode('orbit')
  }, [])

  // Three.js setup
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const s = stateRef.current

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setClearColor(0, 0)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.z = HOME_ZOOM
    cameraRef.current = camera

    const gGroup = new THREE.Group()
    gGroupRef.current = gGroup
    scene.add(gGroup)

    const globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 72, 72),
      new THREE.MeshPhongMaterial({ map: buildEarthTexture(), specular: new THREE.Color(0x0e0e12), shininess: 4 }),
    )
    const atmMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.018, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x18181b, transparent: true, opacity: 0.10, side: THREE.FrontSide, depthWrite: false }),
    )
    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: { c: { value: 0.09 }, p: { value: 6.5 }, gc: { value: new THREE.Color(0x18181b) } },
        vertexShader: `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform float c,p; uniform vec3 gc; varying vec3 vN; void main(){ float i=pow(c-dot(vN,vec3(0,0,1)),p); gl_FragColor=vec4(gc,i); }`,
        side: THREE.FrontSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
      }),
    )
    const gridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.003, 36, 18),
      new THREE.MeshBasicMaterial({ color: 0x3f3f46, wireframe: true, transparent: true, opacity: 0.07 }),
    )
    gridRef.current = gridMesh
    const borderLines = buildCountryBorders(el.clientWidth, el.clientHeight)
    gGroup.add(globeMesh, atmMesh, glowMesh, gridMesh, borderLines)
    proceduralMeshesRef.current = [globeMesh, atmMesh, glowMesh, borderLines]

    scene.add(new THREE.AmbientLight(0x18181b, 1.1))
    const sun = new THREE.DirectionalLight(0xf4f4f5, 1.3)
    sun.position.set(5, 3, 5)
    scene.add(sun)

    // Create satellite layers for each constellation
    for (const c of CONSTELLATIONS) {
      const layer = new SatelliteLayer(c.color, MAX_SATS_PER_LAYER)
      gGroup.add(layer.mesh)
      layersRef.current.set(c.id, layer)
    }

    // Selected satellite marker (dot + ring + pulse)
    const selectedGroup = new THREE.Group()
    selectedGroup.visible = false
    const selDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    )
    const selRing = new THREE.Mesh(
      new THREE.RingGeometry(0.016, 0.022, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    )
    const selPulse = new THREE.Mesh(
      new THREE.RingGeometry(0.024, 0.032, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
    )
    selectedGroup.add(selDot, selRing, selPulse)
    gGroup.add(selectedGroup)
    selectedMarkerRef.current = selectedGroup

    // Create vessel layer
    const vLayer = new VesselLayer()
    gGroup.add(vLayer.mesh)
    vesselLayerRef.current = vLayer

    // Selected vessel marker (cyan-colored, at globe surface)
    const vesselSelectedGroup = new THREE.Group()
    vesselSelectedGroup.visible = false
    const vSelDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    )
    const vSelRing = new THREE.Mesh(
      new THREE.RingGeometry(0.016, 0.022, 16),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    )
    const vSelPulse = new THREE.Mesh(
      new THREE.RingGeometry(0.024, 0.032, 16),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
    )
    vesselSelectedGroup.add(vSelDot, vSelRing, vSelPulse)
    gGroup.add(vesselSelectedGroup)
    selectedVesselMarkerRef.current = vesselSelectedGroup

    // Create flight layer
    const fLayer = new FlightLayer()
    gGroup.add(fLayer.mesh)
    flightLayerRef.current = fLayer

    // Selected flight marker (yellow-colored, at flight altitude)
    const flightSelectedGroup = new THREE.Group()
    flightSelectedGroup.visible = false
    const fSelDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
    )
    const fSelRing = new THREE.Mesh(
      new THREE.RingGeometry(0.016, 0.022, 16),
      new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
    )
    const fSelPulse = new THREE.Mesh(
      new THREE.RingGeometry(0.024, 0.032, 16),
      new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
    )
    flightSelectedGroup.add(fSelDot, fSelRing, fSelPulse)
    gGroup.add(flightSelectedGroup)
    selectedFlightMarkerRef.current = flightSelectedGroup

    // Create terrain layer
    const terrainLayer = new TerrainLayer()
    gGroup.add(terrainLayer.mesh)
    terrainLayerRef.current = terrainLayer

    // Create building layer
    const buildingLayer = new BuildingLayer()
    gGroup.add(buildingLayer.mesh)
    buildingLayerRef.current = buildingLayer

    // Pointer events
    const canvas = renderer.domElement

    let clickOriginX = 0, clickOriginY = 0
    const onMouseDown = (e: MouseEvent) => {
      s.px = e.clientX; s.py = e.clientY
      if (e.button === 2) {
        s.rightDrag = true
      } else {
        s.drag = true
        clickOriginX = e.clientX; clickOriginY = e.clientY
      }
      if (s.cameraMode !== 'street') {
        s.autoRotating = false
        s.pausedPermanently = false
        s.pauseUntil = Date.now() + PAUSE_MS
      }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (s.cameraMode === 'street' && s.drag) {
        // Street mode: mouse-look
        const dx = (e.clientX - s.px) * 0.003
        const dy = (e.clientY - s.py) * 0.003
        s.streetHeading -= dx
        s.streetLookPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, s.streetLookPitch - dy))
        s.px = e.clientX; s.py = e.clientY
        // Update HUD for street mode
        const headingDeg = ((s.streetHeading * 180 / Math.PI) % 360 + 360) % 360
        setCoords(`${Math.abs(s.streetLat).toFixed(4)}°${s.streetLat >= 0 ? 'N' : 'S'}  ·  ${Math.abs(s.streetLon).toFixed(4)}°${s.streetLon >= 0 ? 'E' : 'W'}  ·  STREET  ·  ${headingDeg.toFixed(0)}°`)
        return
      }
      if (s.rightDrag) {
        // Right-drag: tilt camera pitch
        const dy = (e.clientY - s.py) * 0.003
        const maxPitch = MIN_ZOOM / s.zoom * 1.2  // more tilt allowed when zoomed in
        s.tpitch = Math.max(0, Math.min(maxPitch, s.tpitch - dy))
        s.px = e.clientX; s.py = e.clientY
      } else if (s.drag) {
        const dragScale = s.zoom / HOME_ZOOM
        s.try_ += (e.clientX - s.px) * 0.007 * dragScale
        s.trx += (e.clientY - s.py) * 0.004 * dragScale
        s.trx = Math.max(-1.3, Math.min(1.3, s.trx))
        s.px = e.clientX; s.py = e.clientY
      }
      const rect = canvas.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const lat = (ny * 90 + s.rx * 57.3).toFixed(2)
      const lon = (nx * 180 - (s.ry + s.autoRotOffset) * 57.3).toFixed(2)
      const altKm = (s.zoom - 1.0) * 6371
      const altStr = altKm < 1 ? `${(altKm * 1000).toFixed(0)} m` : altKm < 100 ? `${altKm.toFixed(1)} km` : `${altKm.toFixed(0)} km`
      setCoords(`${Math.abs(+lat)}°${+lat >= 0 ? 'N' : 'S'}  ·  ${Math.abs(+lon % 360)}°${+lon >= 0 ? 'E' : 'W'}  ·  ${altStr}`)
    }
    const onMouseUp = () => {
      if (!s.drag && !s.rightDrag) return
      s.drag = false
      s.rightDrag = false
      if (s.cameraMode !== 'street' && !s.pausedPermanently) {
        s.pauseUntil = Date.now() + PAUSE_MS
      }
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()
    const onWheel = (e: WheelEvent) => {
      if (s.cameraMode === 'street') return  // Disable scroll in street mode
      const altitude = s.tzoom - 1.0
      const newAltitude = altitude * Math.pow(1.005, e.deltaY)
      s.tzoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, 1.0 + newAltitude))
    }
    const onDblClick = (e: MouseEvent) => {
      s.autoRotating = false
      s.pauseUntil = 0
      s.pausedPermanently = true
      s.tzoom = MIN_ZOOM
      s.tpitch = 0

      const rect = canvas.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)
      const hits = raycaster.intersectObject(globeMesh)
      if (hits.length > 0) {
        const local = gGroup.worldToLocal(hits[0].point.clone())
        const lat = Math.asin(local.y / local.length()) * (180 / Math.PI)
        const lon = Math.atan2(local.z, -local.x) * (180 / Math.PI) - 180
        s.trx = -lat * 0.014
        s.try_ = -lon * 0.014 - s.autoRotOffset
      }
    }

    const onClick = (e: MouseEvent) => {
      // Ignore if mouse moved (was a drag, not a click)
      const dx = e.clientX - clickOriginX, dy = e.clientY - clickOriginY
      if (dx * dx + dy * dy > 25) return

      const rect = canvas.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera)

      // Raycast against all visible satellite layers — pick closest hit
      let bestDist = Infinity
      let bestNoradId: number | null = null
      for (const layer of layersRef.current.values()) {
        if (!layer.visible) continue
        const hits = raycaster.intersectObject(layer.mesh)
        for (const hit of hits) {
          if (hit.index == null) continue
          const d = hit.distanceToRay ?? hit.distance
          if (d < bestDist) {
            const noradId = layer.getNoradIdAtIndex(hit.index)
            if (noradId !== null) {
              bestDist = d
              bestNoradId = noradId
            }
          }
        }
      }

      // Raycast against vessel layer too
      let bestMmsi: number | null = null
      const vl = vesselLayerRef.current
      if (vl && vl.visible) {
        const vHits = raycaster.intersectObject(vl.mesh)
        for (const hit of vHits) {
          if (hit.index == null) continue
          const d = hit.distanceToRay ?? hit.distance
          if (d < bestDist) {
            const mmsi = vl.getMmsiAtIndex(hit.index)
            if (mmsi !== null) {
              bestDist = d
              bestMmsi = mmsi
              bestNoradId = null  // vessel wins over satellite
            }
          }
        }
      }

      // Raycast against flight layer (highest priority)
      let bestIcao: string | null = null
      const fl = flightLayerRef.current
      if (fl && fl.visible) {
        const fHits = raycaster.intersectObject(fl.mesh)
        for (const hit of fHits) {
          if (hit.index == null) continue
          const d = hit.distanceToRay ?? hit.distance
          if (d < bestDist) {
            const icao = fl.getIcaoAtIndex(hit.index)
            if (icao !== null) {
              bestDist = d
              bestIcao = icao
              bestMmsi = null   // flight wins over vessel
              bestNoradId = null // flight wins over satellite
            }
          }
        }
      }

      if (bestIcao !== null) {
        onFlightClickRef.current?.(bestIcao)
      } else if (bestMmsi !== null) {
        onVesselClickRef.current?.(bestMmsi)
      } else if (bestNoradId !== null) {
        onSatClickRef.current?.(bestNoradId)
      }
    }

    // WASD / arrow key handlers for street mode movement
    const onKeyDown = (e: KeyboardEvent) => {
      if (s.cameraMode !== 'street') return
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':    s.moveForward = true; break
        case 's': case 'arrowdown':  s.moveBackward = true; break
        case 'a': case 'arrowleft':  s.moveLeft = true; break
        case 'd': case 'arrowright': s.moveRight = true; break
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':    s.moveForward = false; break
        case 's': case 'arrowdown':  s.moveBackward = false; break
        case 'a': case 'arrowleft':  s.moveLeft = false; break
        case 'd': case 'arrowright': s.moveRight = false; break
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: true })
    canvas.addEventListener('dblclick', onDblClick)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // Render loop
    function animate() {
      s.rafId = requestAnimationFrame(animate)
      s.frame++

      const now = Date.now()
      if (s.pauseUntil > 0 && now >= s.pauseUntil) {
        s.autoRotating = true
        s.pauseUntil = 0
        s.pausedPermanently = false
      }

      if (s.autoRotating) {
        s.autoRotOffset += 0.0006
      }

      s.rx += (s.trx - s.rx) * 0.08
      s.ry += (s.try_ - s.ry) * 0.08
      // Log-space interpolation for smooth zoom across 4 orders of magnitude
      const alt = Math.max(s.zoom - 1.0, 0.0001)
      const talt = Math.max(s.tzoom - 1.0, 0.0001)
      s.zoom = 1.0 + alt * Math.pow(talt / alt, 0.08)
      s.pitch += (s.tpitch - s.pitch) * 0.08

      gGroup.rotation.x = s.rx
      gGroup.rotation.y = s.ry + s.autoRotOffset

      // Check for pending street mode transition
      if (s.pendingStreetMode && Math.abs(s.zoom - MIN_ZOOM) < 0.001) {
        s.cameraMode = 'street'
        s.pendingStreetMode = false
        // Reparent camera into gGroup
        scene.remove(camera)
        gGroup.add(camera)
        setCameraMode('street')
      }

      if (s.cameraMode === 'street') {
        // WASD movement
        const MOVE_SPEED = 0.0001
        const fwd = (s.moveForward ? 1 : 0) - (s.moveBackward ? 1 : 0)
        const strafe = (s.moveRight ? 1 : 0) - (s.moveLeft ? 1 : 0)
        if (fwd !== 0 || strafe !== 0) {
          const cosLat = Math.cos(s.streetLat * Math.PI / 180)
          s.streetLat += Math.cos(s.streetHeading) * MOVE_SPEED * fwd * 57.3
          s.streetLon += Math.sin(s.streetHeading) * MOVE_SPEED / Math.max(cosLat, 0.01) * fwd * 57.3
          // Strafe (perpendicular)
          s.streetLat += Math.cos(s.streetHeading + Math.PI / 2) * MOVE_SPEED * strafe * 57.3
          s.streetLon += Math.sin(s.streetHeading + Math.PI / 2) * MOVE_SPEED / Math.max(cosLat, 0.01) * strafe * 57.3
          s.streetLat = Math.max(-89, Math.min(89, s.streetLat))
        }

        const STREET_R = 1.003
        const [sx, sy, sz] = latLonToVec3(s.streetLat, s.streetLon, STREET_R)
        camera.position.set(sx, sy, sz)

        // Tangent frame at this point
        const normal = new THREE.Vector3(sx, sy, sz).normalize()
        const ref = Math.abs(normal.y) > 0.999
          ? new THREE.Vector3(1, 0, 0)
          : new THREE.Vector3(0, 1, 0)
        const east = new THREE.Vector3().crossVectors(ref, normal).normalize()
        const north = new THREE.Vector3().crossVectors(normal, east).normalize()

        // Look direction from heading + pitch
        const lookDir = new THREE.Vector3()
          .addScaledVector(east, Math.sin(s.streetHeading) * Math.cos(s.streetLookPitch))
          .addScaledVector(north, Math.cos(s.streetHeading) * Math.cos(s.streetLookPitch))
          .addScaledVector(normal, Math.sin(s.streetLookPitch))

        camera.lookAt(sx + lookDir.x, sy + lookDir.y, sz + lookDir.z)
        camera.up.copy(normal)

        camera.near = 0.000001
        camera.far = 0.05
        camera.fov += (75 - camera.fov) * 0.08
        camera.updateProjectionMatrix()

        // Update HUD
        if (s.frame % 10 === 0) {
          const headingDeg = ((s.streetHeading * 180 / Math.PI) % 360 + 360) % 360
          setCoords(`${Math.abs(s.streetLat).toFixed(4)}°${s.streetLat >= 0 ? 'N' : 'S'}  ·  ${Math.abs(s.streetLon).toFixed(4)}°${s.streetLon >= 0 ? 'E' : 'W'}  ·  STREET  ·  ${headingDeg.toFixed(0)}°`)
        }
      } else {
        // Orbit mode camera
        camera.position.set(
          0,
          s.zoom * Math.sin(s.pitch),
          s.zoom * Math.cos(s.pitch),
        )
        camera.lookAt(0, 0, 0)

        // Dynamic near/far plane — prevent clipping at street-level zoom
        const camAltitude = s.zoom - 1.0
        camera.near = Math.max(0.0001, camAltitude * 0.1)
        camera.far = Math.max(10, s.zoom * 3)
        // Smoothly return FOV to 38 when exiting street mode
        camera.fov += (38 - camera.fov) * 0.08
        camera.updateProjectionMatrix()
      }

      // Animate satellite layer fade in/out
      for (const layer of layersRef.current.values()) {
        layer.animateFrame()
      }
      // Animate vessel layer
      if (vesselLayerRef.current) vesselLayerRef.current.animateFrame(s.zoom)
      // Animate flight layer
      if (flightLayerRef.current) flightLayerRef.current.animateFrame(s.zoom)
      // Animate terrain + building layers
      if (terrainLayerRef.current) terrainLayerRef.current.animateFrame()
      if (buildingLayerRef.current) buildingLayerRef.current.animateFrame()
      // Update terrain/building data every ~1s based on view center
      if (s.frame % 60 === 0) {
        const centerLat = s.cameraMode === 'street' ? s.streetLat : -s.rx * 57.3
        const centerLon = s.cameraMode === 'street' ? s.streetLon : -(s.ry + s.autoRotOffset) * 57.3
        const effectiveZoom = s.cameraMode === 'street' ? MIN_ZOOM : s.zoom
        if (terrainLayerRef.current) terrainLayerRef.current.update(centerLat, centerLon, effectiveZoom)
        if (buildingLayerRef.current) buildingLayerRef.current.update(centerLat, centerLon, effectiveZoom)
      }

      // Scale icon sizes with zoom — larger when zoomed in for better visibility
      const iconScale = Math.min(2.0, Math.max(1.0, MAX_ZOOM / Math.max(s.zoom, 1.3)))
      if (vesselLayerRef.current) {
        const vm = vesselLayerRef.current.mesh.material as THREE.ShaderMaterial
        vm.uniforms.uBaseSize.value = 2.0 * iconScale
        vm.uniforms.uShapeSize.value = 16.0 * iconScale
      }
      if (flightLayerRef.current) {
        const fm = flightLayerRef.current.mesh.material as THREE.ShaderMaterial
        fm.uniforms.uBaseSize.value = 2.0 * iconScale
        fm.uniforms.uShapeSize.value = 16.0 * iconScale
      }

      // Scale selection markers with zoom so they stay a consistent apparent size
      const markerScale = s.zoom / HOME_ZOOM
      // Animate selected marker pulse
      if (selectedGroup.visible) {
        const t = s.frame * 0.025
        selectedGroup.scale.setScalar(markerScale)
        selPulse.scale.setScalar(1 + Math.sin(t) * 0.5)
        ;(selPulse.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.18 + Math.sin(t) * 0.18)
      }
      // Animate vessel selection marker pulse
      if (vesselSelectedGroup.visible) {
        const t = s.frame * 0.025
        vesselSelectedGroup.scale.setScalar(markerScale)
        vSelPulse.scale.setScalar(1 + Math.sin(t) * 0.5)
        ;(vSelPulse.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.18 + Math.sin(t) * 0.18)
      }
      // Animate flight selection marker pulse
      if (flightSelectedGroup.visible) {
        const t = s.frame * 0.025
        flightSelectedGroup.scale.setScalar(markerScale)
        fSelPulse.scale.setScalar(1 + Math.sin(t) * 0.5)
        ;(fSelPulse.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.18 + Math.sin(t) * 0.18)
      }

      // Update geo-three tile LOD so tiles actually subdivide and load
      const tg = tileGlobeRef.current
      if (tg && tg.visible && tg.lod) {
        tg.lod.updateLOD(tg, camera, renderer, scene)
      }

      renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
      ;(borderLines.material as LineMaterial).resolution.set(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(s.rafId)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDblClick)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      ro.disconnect()
      for (const layer of layersRef.current.values()) layer.dispose()
      layersRef.current.clear()
      vesselLayerRef.current?.dispose()
      flightLayerRef.current?.dispose()
      if (tileGlobeRef.current) {
        tileGlobeRef.current.clear()
        tileGlobeRef.current = null
      }
      terrainLayerRef.current?.dispose()
      buildingLayerRef.current?.dispose()
      borderLines.geometry.dispose()
      ;(borderLines.material as THREE.Material).dispose()
      renderer.dispose()
      el.removeChild(canvas)
    }
  }, [])

  // Update satellite layer positions + visibility on each version tick
  useEffect(() => {
    for (const c of CONSTELLATIONS) {
      const layer = layersRef.current.get(c.id)
      if (!layer) continue
      const isOn = toggles.get(c.id) ?? false
      if (isOn) {
        layer.show()
        const positions = getPositions(c.id)
        if (positions.length > 0) layer.update(positions)
      } else {
        layer.hide()
      }
    }
  }, [version, toggles, getPositions])

  // Update vessel layer positions + visibility
  useEffect(() => {
    const vl = vesselLayerRef.current
    if (!vl) return
    if (vesselLayerProps?.enabled) {
      vl.show()
      vl.update(vesselLayerProps.vessels)
    } else {
      vl.hide()
    }
  }, [vesselLayerProps?.enabled, vesselLayerProps?.version, vesselLayerProps?.vessels])

  // Update selected vessel marker
  useEffect(() => {
    const marker = selectedVesselMarkerRef.current
    if (!marker) return
    const mmsi = vesselLayerProps?.selectedMmsi
    if (!mmsi) {
      marker.visible = false
      return
    }
    const vessel = vesselLayerProps?.vessels.get(mmsi)
    if (!vessel) {
      marker.visible = false
      return
    }
    const r = 1.003
    const phi = (90 - vessel.lat) * (Math.PI / 180)
    const theta = (vessel.lon + 180) * (Math.PI / 180)
    const v = new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta),
    )
    marker.position.copy(v)
    marker.lookAt(0, 0, 0)
    marker.visible = true
  }, [vesselLayerProps?.version, vesselLayerProps?.selectedMmsi, vesselLayerProps?.vessels])

  // Update flight layer positions + visibility
  useEffect(() => {
    const fl = flightLayerRef.current
    if (!fl) return
    if (flightLayerProps?.enabled) {
      fl.show()
      fl.update(flightLayerProps.flights)
    } else {
      fl.hide()
    }
  }, [flightLayerProps?.enabled, flightLayerProps?.version, flightLayerProps?.flights])

  // Update selected flight marker
  useEffect(() => {
    const marker = selectedFlightMarkerRef.current
    if (!marker) return
    const icao = flightLayerProps?.selectedIcao
    if (!icao) {
      marker.visible = false
      return
    }
    const flight = flightLayerProps?.flights.get(icao)
    if (!flight) {
      marker.visible = false
      return
    }
    const r = 1.005
    const phi = (90 - flight.lat) * (Math.PI / 180)
    const theta = (flight.lon + 180) * (Math.PI / 180)
    const v = new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta),
    )
    marker.position.copy(v)
    marker.lookAt(0, 0, 0)
    marker.visible = true
  }, [flightLayerProps?.version, flightLayerProps?.selectedIcao, flightLayerProps?.flights])

  // Update selected satellite marker
  useEffect(() => {
    const marker = selectedMarkerRef.current
    if (!marker || !selectedSatId) {
      if (marker) marker.visible = false
      return
    }

    // Find the satellite position across all enabled constellations
    for (const c of CONSTELLATIONS) {
      if (!(toggles.get(c.id) ?? false)) continue
      const positions = getPositions(c.id)
      const pos = positions.find(p => p.noradId === selectedSatId)
      if (pos) {
        const r = displayRadius(pos.alt)
        const phi = (90 - pos.lat) * (Math.PI / 180)
        const theta = (pos.lon + 180) * (Math.PI / 180)
        const v = new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
           r * Math.cos(phi),
           r * Math.sin(phi) * Math.sin(theta),
        )
        marker.position.copy(v)
        marker.lookAt(0, 0, 0)
        marker.visible = true

        // Update marker color to match constellation
        const color = new THREE.Color(c.color)
        marker.children.forEach(child => {
          ;(child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            color, transparent: true,
            opacity: child === marker.children[0] ? 0.95 : child === marker.children[1] ? 0.6 : 0.3,
            side: THREE.DoubleSide,
          })
        })
        return
      }
    }
    marker.visible = false
  }, [version, selectedSatId, toggles, getPositions])

  // Update grid visibility
  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = gridVisible
  }, [gridVisible])

  // Toggle between procedural globe and tile globe, swap styles
  useEffect(() => {
    const gGroup = gGroupRef.current
    if (!gGroup) return

    if (tileGlobeVisible) {
      // Dispose old tile globe if style changed
      if (tileGlobeRef.current) {
        gGroup.remove(tileGlobeRef.current)
        tileGlobeRef.current.clear()
        tileGlobeRef.current = null
      }
      const tg = createTileGlobe(tileStyle)
      tileGlobeRef.current = tg
      gGroup.add(tg)
      tileGlobeRef.current.visible = true
      for (const mesh of proceduralMeshesRef.current) mesh.visible = false
    } else {
      if (tileGlobeRef.current) tileGlobeRef.current.visible = false
      for (const mesh of proceduralMeshesRef.current) mesh.visible = true
    }
  }, [tileGlobeVisible, tileStyle])

  // Toggle terrain layer
  useEffect(() => {
    const tl = terrainLayerRef.current
    if (!tl) return
    if (terrainVisible) {
      tl.show()
    } else {
      tl.hide()
    }
  }, [terrainVisible])

  // Toggle building layer
  useEffect(() => {
    const bl = buildingLayerRef.current
    if (!bl) return
    if (buildingsVisible) {
      bl.show()
    } else {
      bl.hide()
    }
  }, [buildingsVisible])

  // Escape key exits street view
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateRef.current.cameraMode === 'street') {
        exitStreetView()
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [exitStreetView])

  // Group constellations by category for overlay
  const categories = CONSTELLATIONS.reduce((acc, c) => {
    if (!acc.has(c.category)) acc.set(c.category, [])
    acc.get(c.category)!.push(c)
    return acc
  }, new Map<SatCategory, typeof CONSTELLATIONS>())

  const toggleCategory = (cat: SatCategory) => {
    setOverlayExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px] bg-zinc-950 overflow-hidden" ref={mountRef}>

      {/* Corner brackets */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
        <div key={pos} className={cn(
          'absolute w-5 h-5 pointer-events-none',
          pos === 'tl' && 'top-3.5 left-3.5',
          pos === 'tr' && 'top-3.5 right-3.5',
          pos === 'bl' && 'bottom-3.5 left-3.5',
          pos === 'br' && 'bottom-3.5 right-3.5',
        )}>
          <div className={cn(
            'absolute bg-zinc-700',
            (pos === 'tl' || pos === 'tr') ? 'top-0 h-px w-full' : 'bottom-0 h-px w-full',
          )} />
          <div className={cn(
            'absolute bg-zinc-700 w-px h-full',
            (pos === 'tl' || pos === 'bl') ? 'left-0' : 'right-0',
          )} />
        </div>
      ))}

      {/* HUD labels */}
      <div className="absolute top-[18px] left-1/2 -translate-x-1/2 font-display text-[11px] font-semibold tracking-[3px] text-zinc-700 uppercase pointer-events-none">
        Satellite Tracking Network
      </div>
      <div className="absolute bottom-[18px] left-1/2 -translate-x-1/2 font-mono text-[12px] text-zinc-600 tracking-widest pointer-events-none">
        {coords}
      </div>
      {cameraMode === 'street' && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 font-mono text-[11px] text-zinc-500 tracking-wide pointer-events-none">
          WASD to move · Drag to look · ESC to exit
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        {[
          { label: '+', onClick: () => zoom(-0.35) },
          { label: '−', onClick: () => zoom(0.35) },
          { label: '●', onClick: resetView },
        ].map(({ label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="w-[30px] h-[30px] bg-zinc-900/90 border border-zinc-700 text-zinc-400 text-sm flex items-center justify-center rounded-sm hover:border-orange-800 hover:text-orange-400 hover:bg-orange-950/30 transition-all"
          >
            {label}
          </button>
        ))}
        <button
          onClick={toggleRotationLock}
          className={cn(
            'w-[30px] h-[30px] bg-zinc-900/90 border text-sm flex items-center justify-center rounded-sm transition-all mt-1',
            rotationLocked
              ? 'border-orange-800 text-orange-400 bg-orange-950/30'
              : 'border-zinc-700 text-zinc-400 hover:border-orange-800 hover:text-orange-400 hover:bg-orange-950/30',
          )}
          title={rotationLocked ? 'Unlock rotation' : 'Lock rotation'}
        >
          {rotationLocked ? '⏸' : '▶'}
        </button>
      </div>

      {/* Constellation overlay — left side */}
      <div className="absolute left-4 top-4 bottom-4 w-[180px] flex flex-col gap-1 overflow-hidden">
        {/* Grid toggle */}
        <button
          onClick={() => setGridVisible(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 font-display text-[12px] font-medium tracking-wide uppercase',
            'bg-zinc-900/90 border rounded-sm text-left transition-all flex-shrink-0',
            gridVisible ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800 text-zinc-600',
          )}
        >
          <span className={cn(
            'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
            gridVisible ? 'bg-orange-500 border-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'border-zinc-600',
          )} />
          Grid
        </button>
        {/* Map tiles toggle */}
        <button
          onClick={() => setTileGlobeVisible(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 font-display text-[12px] font-medium tracking-wide uppercase',
            'bg-zinc-900/90 border rounded-sm text-left transition-all flex-shrink-0',
            tileGlobeVisible ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800 text-zinc-600',
          )}
        >
          <span className={cn(
            'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
            tileGlobeVisible ? 'bg-orange-500 border-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'border-zinc-600',
          )} />
          Map Tiles
        </button>
        {tileGlobeVisible && (
          <div className="flex flex-col gap-1 ml-4">
            {([['dark', 'Dark'], ['light', 'Light'], ['satellite', 'Satellite'], ['streets', 'Streets'], ['terrain', 'Terrain']] as const).map(([style, label]) => (
              <button
                key={style}
                onClick={() => setTileStyle(style)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 font-display text-[12px] font-medium tracking-wide uppercase',
                  'bg-zinc-900/90 border rounded-sm text-left transition-all flex-shrink-0',
                  tileStyle === style ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800 text-zinc-600',
                )}
              >
                <span className={cn(
                  'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
                  tileStyle === style ? 'bg-orange-500 border-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'border-zinc-600',
                )} />
                {label}
              </button>
            ))}
          </div>
        )}
        {/* Terrain toggle */}
        <button
          onClick={() => setTerrainVisible(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 font-display text-[12px] font-medium tracking-wide uppercase',
            'bg-zinc-900/90 border rounded-sm text-left transition-all flex-shrink-0',
            terrainVisible ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800 text-zinc-600',
          )}
        >
          <span className={cn(
            'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
            terrainVisible ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'border-zinc-600',
          )} />
          Terrain
        </button>
        {/* Buildings toggle */}
        <button
          onClick={() => setBuildingsVisible(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 font-display text-[12px] font-medium tracking-wide uppercase',
            'bg-zinc-900/90 border rounded-sm text-left transition-all flex-shrink-0',
            buildingsVisible ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800 text-zinc-600',
          )}
        >
          <span className={cn(
            'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
            buildingsVisible ? 'bg-violet-500 border-violet-500 shadow-[0_0_5px_rgba(139,92,246,0.5)]' : 'border-zinc-600',
          )} />
          Buildings
        </button>
        {/* Street view toggle */}
        <button
          onClick={() => cameraMode === 'street' ? exitStreetView() : enterStreetView()}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 font-display text-[12px] font-medium tracking-wide uppercase',
            'bg-zinc-900/90 border rounded-sm text-left transition-all flex-shrink-0',
            cameraMode === 'street' ? 'border-amber-700 text-amber-400' : 'border-zinc-800 text-zinc-600',
          )}
        >
          <span className={cn(
            'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
            cameraMode === 'street' ? 'bg-amber-500 border-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'border-zinc-600',
          )} />
          Street View
        </button>

        {/* Constellation toggles by category */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 flex flex-col gap-0.5">
          {Array.from(categories.entries()).map(([cat, consts]) => {
            const isExpanded = overlayExpanded.has(cat)
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-sm text-left transition-all hover:border-zinc-700"
                >
                  <span className="font-display text-[11px] font-semibold tracking-[1.5px] text-zinc-500 uppercase flex-1 truncate">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-[11px] text-zinc-600">{isExpanded ? '▾' : '▸'}</span>
                </button>
                {isExpanded && consts.map(c => {
                  const isOn = toggles.get(c.id) ?? false
                  const isLoading = loading.has(c.id)
                  const count = getSatelliteCount(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => onToggle(c.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-1 ml-1 font-display text-[12px] font-medium tracking-wide',
                        'bg-zinc-900/80 border rounded-sm text-left transition-all',
                        isOn ? 'border-zinc-700 text-zinc-400' : 'border-zinc-800/50 text-zinc-600',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
                          isOn ? 'border-current shadow-[0_0_5px_currentColor]' : 'border-zinc-600',
                        )}
                        style={isOn ? { backgroundColor: `#${c.color.toString(16).padStart(6, '0')}`, borderColor: `#${c.color.toString(16).padStart(6, '0')}` } : undefined}
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      {isLoading && <span className="text-[12px] text-zinc-600 animate-pulse">...</span>}
                      {!isLoading && isOn && count > 0 && (
                        <span className="font-mono text-[12px] text-zinc-600">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
