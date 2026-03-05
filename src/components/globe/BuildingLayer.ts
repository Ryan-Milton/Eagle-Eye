import * as THREE from 'three'
import { latLonToVec3 } from '@/lib/utils'
// @ts-expect-error three v0.128 exports a class, not standalone functions
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  projectToTangentPlane,
  buildPlacementMatrix,
  createBuildingGeometry,
  simplifyPolygon,
} from './buildingGeometry'

const FADE_SPEED = 0.04
const BUILDING_R = 1.002
const HEIGHT_SCALE = 0.00003  // meters → globe units (exaggerated for visibility)
const DEFAULT_HEIGHT = 12     // default building height in meters
const MAX_BUILDINGS = 2000
const MAX_VERTICES = 500_000
const QUERY_COOLDOWN = 10_000 // ms between Overpass queries
const SIMPLIFY_THRESHOLD = 20 // vertices before simplification kicks in
const SIMPLIFY_TOLERANCE = 0.00001 // degrees

interface BuildingFootprint {
  nodes: Array<{ lat: number; lon: number }>
  height: number
  center: { lat: number; lon: number }
}

interface CachedRegion {
  key: string
  mesh: THREE.Mesh
  bounds: { north: number; south: number; east: number; west: number }
}

/**
 * Fetches building footprints with full geometry from Overpass API.
 */
async function fetchBuildingFootprints(
  south: number, west: number, north: number, east: number,
): Promise<BuildingFootprint[]> {
  const query = `
    [out:json][timeout:15];
    way["building"](${south},${west},${north},${east});
    out geom ${MAX_BUILDINGS};
  `
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Overpass API error: ${resp.status}`)
  const data = await resp.json()

  return data.elements
    .filter((el: { geometry?: Array<{ lat: number; lon: number }> }) =>
      el.geometry && el.geometry.length >= 3
    )
    .map((el: {
      geometry: Array<{ lat: number; lon: number }>
      tags?: { height?: string; 'building:levels'?: string }
    }) => {
      // Compute centroid
      let latSum = 0, lonSum = 0
      for (const n of el.geometry) {
        latSum += n.lat
        lonSum += n.lon
      }
      const len = el.geometry.length
      return {
        nodes: el.geometry,
        center: { lat: latSum / len, lon: lonSum / len },
        height: parseFloat(el.tags?.height ?? '') ||
                (parseFloat(el.tags?.['building:levels'] ?? '') || 0) * 3 ||
                DEFAULT_HEIGHT,
      }
    })
}

/**
 * Creates a fallback box geometry for a building that failed extrusion.
 */
function createFallbackBox(
  lat: number, lon: number, height: number,
): THREE.BufferGeometry {
  const h = height * HEIGHT_SCALE
  const geo = new THREE.BoxGeometry(0.0008, h, 0.0008)
  // Position the box at the building location on the globe
  const [x, y, z] = latLonToVec3(lat, lon, BUILDING_R)
  const up = new THREE.Vector3(x, y, z).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
  const mat = new THREE.Matrix4()
    .makeRotationFromQuaternion(q)
    .setPosition(x, y + h * 0.5, z)
  // Correct: position along the normal direction
  const offset = up.multiplyScalar(h * 0.5)
  mat.setPosition(x + offset.x, y + offset.y, z + offset.z)
  geo.applyMatrix4(mat)
  return geo
}

/**
 * Builds a single merged mesh from an array of building footprints.
 */
function buildMergedBuildingMesh(buildings: BuildingFootprint[]): THREE.Mesh | null {
  const geometries: THREE.BufferGeometry[] = []
  let totalVertices = 0

  // Sort buildings by height descending so we keep the tallest if we hit vertex cap
  const sorted = [...buildings].sort((a, b) => b.height - a.height)

  for (const b of sorted) {
    if (totalVertices > MAX_VERTICES) break

    const h = b.height * HEIGHT_SCALE
    let nodes = b.nodes

    // Simplify complex footprints
    if (nodes.length > SIMPLIFY_THRESHOLD) {
      nodes = simplifyPolygon(nodes, SIMPLIFY_TOLERANCE)
    }

    // Project to tangent plane and try to extrude
    const footprint2d = projectToTangentPlane(nodes, b.center.lat, b.center.lon, BUILDING_R)
    const placementMatrix = buildPlacementMatrix(b.center.lat, b.center.lon, BUILDING_R)
    const geo = createBuildingGeometry(footprint2d, h, placementMatrix)

    if (geo) {
      totalVertices += geo.getAttribute('position').count
      geometries.push(geo)
    } else {
      // Fallback to box
      const box = createFallbackBox(b.center.lat, b.center.lon, b.height)
      totalVertices += box.getAttribute('position').count
      geometries.push(box)
    }
  }

  if (geometries.length === 0) return null

  const merged = BufferGeometryUtils.mergeBufferGeometries(geometries, false)
  // Dispose individual geometries after merge
  for (const g of geometries) g.dispose()

  if (!merged) return null

  const mat = new THREE.MeshPhongMaterial({
    color: 0x52525b,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })

  const mesh = new THREE.Mesh(merged, mat)
  mesh.renderOrder = 4
  return mesh
}

export class BuildingLayer {
  private group: THREE.Group
  private currentOpacity = 0
  private targetOpacity = 0
  private regions = new Map<string, CachedRegion>()
  private lastQueryTime = 0
  private querying = false

  constructor() {
    this.group = new THREE.Group()
    this.group.visible = false
  }

  get mesh(): THREE.Group { return this.group }
  get visible(): boolean { return this.currentOpacity > 0 }

  /**
   * Fetch buildings for the visible area. Only triggers when very zoomed in.
   */
  update(centerLat: number, centerLon: number, cameraZoom: number) {
    if (cameraZoom > 1.8) return
    if (this.querying) return

    const now = Date.now()
    if (now - this.lastQueryTime < QUERY_COOLDOWN) return

    // Calculate visible bounding box (rough approximation)
    const span = cameraZoom * 3 // degrees visible
    const bounds = {
      south: centerLat - span,
      north: centerLat + span,
      west: centerLon - span,
      east: centerLon + span,
    }

    // Check if we already have data for this region
    const key = `${Math.round(centerLat * 10)}/${Math.round(centerLon * 10)}`
    if (this.regions.has(key)) return

    this.loadRegion(key, bounds)
  }

  private async loadRegion(key: string, bounds: { north: number; south: number; east: number; west: number }) {
    this.querying = true
    this.lastQueryTime = Date.now()

    try {
      const buildings = await fetchBuildingFootprints(bounds.south, bounds.west, bounds.north, bounds.east)
      if (buildings.length === 0) return

      const mesh = buildMergedBuildingMesh(buildings)
      if (!mesh) return

      this.regions.set(key, { key, mesh, bounds })
      this.group.add(mesh)
    } catch {
      // Silently skip failed queries
    } finally {
      this.querying = false
    }
  }

  show() {
    this.targetOpacity = 1
    this.group.visible = true
  }

  hide() {
    this.targetOpacity = 0
  }

  animateFrame() {
    if (this.currentOpacity === this.targetOpacity && this.targetOpacity === 0) return
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * FADE_SPEED
    if (this.currentOpacity < 0.01 && this.targetOpacity === 0) {
      this.currentOpacity = 0
      this.group.visible = false
    }
    for (const region of this.regions.values()) {
      ;(region.mesh.material as THREE.MeshPhongMaterial).opacity = 0.7 * this.currentOpacity
    }
  }

  dispose() {
    for (const region of this.regions.values()) {
      region.mesh.geometry.dispose()
      ;(region.mesh.material as THREE.Material).dispose()
    }
    this.regions.clear()
  }
}
