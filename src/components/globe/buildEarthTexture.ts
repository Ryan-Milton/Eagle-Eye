import * as THREE from 'three'
import landData from '@/data/ne_110m_land.json'

interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

interface GeoJSONFeature {
  geometry: GeoJSONPolygon
}

const TX = 2048
const TY = 1024

function project(lon: number, lat: number): [number, number] {
  return [
    (lon + 180) / 360 * TX,
    (90 - lat) / 180 * TY,
  ]
}

function drawRing(ctx: CanvasRenderingContext2D, coords: number[][]) {
  if (coords.length === 0) return
  const [sx, sy] = project(coords[0][0], coords[0][1])
  ctx.moveTo(sx, sy)
  for (let i = 1; i < coords.length; i++) {
    const [x, y] = project(coords[i][0], coords[i][1])
    // Skip anti-meridian wrapping artifacts
    if (Math.abs(coords[i][0] - coords[i - 1][0]) > 300) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.closePath()
}

export function buildEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = TX
  canvas.height = TY
  const ctx = canvas.getContext('2d')!

  // Ocean
  ctx.fillStyle = '#080810'
  ctx.fillRect(0, 0, TX, TY)

  // Land masses from GeoJSON
  ctx.fillStyle = '#1c1c20'
  ctx.strokeStyle = '#2a2a30'
  ctx.lineWidth = 1.2

  for (const feature of landData.features as GeoJSONFeature[]) {
    const coords = feature.geometry.coordinates
    ctx.beginPath()
    for (const ring of coords) {
      drawRing(ctx, ring)
    }
    ctx.fill()
    ctx.stroke()
  }

  // Lat/lon grid
  ctx.strokeStyle = 'rgba(63,63,70,0.35)'
  ctx.lineWidth = 0.7
  for (let lat = -90; lat <= 90; lat += 15) {
    const y = (90 - lat) / 180 * TY
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TX, y); ctx.stroke()
  }
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = (lon + 180) / 360 * TX
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TY); ctx.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}
