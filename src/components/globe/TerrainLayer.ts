import * as THREE from 'three'
import { latLonToVec3 } from '@/lib/utils'

const FADE_SPEED = 0.04
const TILE_SEGMENTS = 32
const ELEVATION_EXAGGERATION = 30  // exaggerate so terrain is visible at globe scale
const TERRAIN_R = 1.001  // just above globe surface

interface TerrainTile {
  key: string
  mesh: THREE.Mesh
}

/**
 * Decodes Terrarium-format elevation from an RGB image.
 * height = (R * 256 + G + B / 256) - 32768
 */
function decodeTerrarium(imageData: ImageData): Float32Array {
  const { width, height, data } = imageData
  const elevation = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    elevation[i] = (r * 256 + g + b / 256) - 32768
  }
  return elevation
}

/**
 * Converts a slippy map tile coordinate to lat/lon bounds.
 */
function tileBounds(z: number, x: number, y: number) {
  const n = Math.PI - (2 * Math.PI * y) / (1 << z)
  const s = Math.PI - (2 * Math.PI * (y + 1)) / (1 << z)
  return {
    north: (Math.atan(Math.sinh(n)) * 180) / Math.PI,
    south: (Math.atan(Math.sinh(s)) * 180) / Math.PI,
    west: (x / (1 << z)) * 360 - 180,
    east: ((x + 1) / (1 << z)) * 360 - 180,
  }
}

/**
 * Converts lat/lon to slippy map tile coordinates.
 */
function latLonToTile(lat: number, lon: number, zoom: number): [number, number] {
  const x = Math.floor(((lon + 180) / 360) * (1 << zoom))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * (1 << zoom),
  )
  return [x, y]
}

/**
 * Builds a curved terrain mesh for a tile, positioned on the globe surface.
 */
function buildTerrainMesh(
  elevation: Float32Array,
  imgSize: number,
  bounds: ReturnType<typeof tileBounds>,
): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  const segs = TILE_SEGMENTS
  const verts = (segs + 1) * (segs + 1)
  const positions = new Float32Array(verts * 3)
  const normals = new Float32Array(verts * 3)
  const indices: number[] = []

  for (let iy = 0; iy <= segs; iy++) {
    for (let ix = 0; ix <= segs; ix++) {
      const u = ix / segs
      const v = iy / segs
      const lat = bounds.north + (bounds.south - bounds.north) * v
      const lon = bounds.west + (bounds.east - bounds.west) * u

      // Sample elevation (nearest neighbor from the decoded image)
      const px = Math.min(Math.floor(u * imgSize), imgSize - 1)
      const py = Math.min(Math.floor(v * imgSize), imgSize - 1)
      const h = elevation[py * imgSize + px]
      const r = TERRAIN_R + Math.max(0, h) * ELEVATION_EXAGGERATION / 6371000 // meters → globe units

      const [x, y, z] = latLonToVec3(lat, lon, r)
      const idx = (iy * (segs + 1) + ix)
      positions[idx * 3] = x
      positions[idx * 3 + 1] = y
      positions[idx * 3 + 2] = z

      // Normal points outward from globe center
      const len = Math.sqrt(x * x + y * y + z * z)
      normals[idx * 3] = x / len
      normals[idx * 3 + 1] = y / len
      normals[idx * 3 + 2] = z / len
    }
  }

  for (let iy = 0; iy < segs; iy++) {
    for (let ix = 0; ix < segs; ix++) {
      const a = iy * (segs + 1) + ix
      const b = a + 1
      const c = a + segs + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setIndex(indices)

  const material = new THREE.MeshPhongMaterial({
    color: 0x4a7c59,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
    flatShading: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 3
  return mesh
}

export class TerrainLayer {
  private group: THREE.Group
  private currentOpacity = 0
  private targetOpacity = 0
  private tiles = new Map<string, TerrainTile>()
  private loading = new Set<string>()

  constructor() {
    this.group = new THREE.Group()
    this.group.visible = false
  }

  get mesh(): THREE.Group { return this.group }
  get visible(): boolean { return this.currentOpacity > 0 }

  /**
   * Load terrain tiles for the visible area around a lat/lon center.
   */
  update(centerLat: number, centerLon: number, cameraZoom: number) {
    // Only show terrain when zoomed in close
    if (cameraZoom > 2.5) return

    const tileZoom = 7 // moderate detail level
    const [cx, cy] = latLonToTile(centerLat, centerLon, tileZoom)
    const radius = 2 // load a 5x5 grid of tiles around center

    const needed = new Set<string>()
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = cx + dx
        const ty = cy + dy
        if (ty < 0 || ty >= (1 << tileZoom)) continue
        const wrappedX = ((tx % (1 << tileZoom)) + (1 << tileZoom)) % (1 << tileZoom)
        const key = `${tileZoom}/${wrappedX}/${ty}`
        needed.add(key)
        if (!this.tiles.has(key) && !this.loading.has(key)) {
          this.loadTile(tileZoom, wrappedX, ty, key)
        }
      }
    }

    // Remove tiles that are no longer needed
    for (const [key, tile] of this.tiles) {
      if (!needed.has(key)) {
        this.group.remove(tile.mesh)
        tile.mesh.geometry.dispose()
        ;(tile.mesh.material as THREE.Material).dispose()
        this.tiles.delete(key)
      }
    }
  }

  private async loadTile(z: number, x: number, y: number, key: string) {
    this.loading.add(key)
    try {
      const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error(`Failed to load terrain tile ${key}`))
        img.src = url
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const elevation = decodeTerrarium(imageData)
      const bounds = tileBounds(z, x, y)
      const mesh = buildTerrainMesh(elevation, img.width, bounds)

      const tile: TerrainTile = { key, mesh }
      this.tiles.set(key, tile)
      this.group.add(mesh)
    } catch {
      // Silently skip failed tiles
    } finally {
      this.loading.delete(key)
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
    // Update all tile mesh opacities
    for (const tile of this.tiles.values()) {
      ;(tile.mesh.material as THREE.MeshPhongMaterial).opacity = 0.6 * this.currentOpacity
    }
  }

  dispose() {
    for (const tile of this.tiles.values()) {
      tile.mesh.geometry.dispose()
      ;(tile.mesh.material as THREE.Material).dispose()
    }
    this.tiles.clear()
    this.loading.clear()
  }
}
