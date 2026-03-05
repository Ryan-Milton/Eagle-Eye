import * as THREE from 'three'
import countriesData from 'world-atlas/countries-50m.json'
import { feature } from 'topojson-client'

const TX = 4096
const TY = 2048

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

  // Countries from TopoJSON
  const countries = feature(countriesData, countriesData.objects.countries as any)

  ctx.fillStyle = '#1a1a22'

  for (const country of (countries as any).features) {
    ctx.beginPath()
    const geom = country.geometry
    const polys = geom.type === 'MultiPolygon'
      ? geom.coordinates
      : [geom.coordinates]
    for (const polygon of polys) {
      for (const ring of polygon) {
        drawRing(ctx, ring)
      }
    }
    ctx.fill()
  }

  return new THREE.CanvasTexture(canvas)
}
