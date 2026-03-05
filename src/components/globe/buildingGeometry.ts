import * as THREE from 'three'
import { latLonToVec3 } from '@/lib/utils'

const DEG2RAD = Math.PI / 180

/**
 * Projects lat/lon polygon vertices onto a local 2D tangent plane
 * at the given center point. Returns array of [x, y] in globe units.
 */
export function projectToTangentPlane(
  nodes: Array<{ lat: number; lon: number }>,
  centerLat: number,
  centerLon: number,
  radius: number,
): Array<[number, number]> {
  const [cx, cy, cz] = latLonToVec3(centerLat, centerLon, radius)
  const normal = new THREE.Vector3(cx, cy, cz).normalize()

  // Compute east/north tangent vectors
  const ref = Math.abs(normal.y) > 0.999
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0)
  const east = new THREE.Vector3().crossVectors(ref, normal).normalize()
  const north = new THREE.Vector3().crossVectors(normal, east).normalize()

  return nodes.map(({ lat, lon }) => {
    const [px, py, pz] = latLonToVec3(lat, lon, radius)
    const dx = px - cx
    const dy = py - cy
    const dz = pz - cz
    return [
      east.x * dx + east.y * dy + east.z * dz,
      north.x * dx + north.y * dy + north.z * dz,
    ] as [number, number]
  })
}

/**
 * Returns a Matrix4 that transforms XY-plane geometry onto the globe
 * surface at the given lat/lon. Columns = east, normal, north; position = surface point.
 */
export function buildPlacementMatrix(
  centerLat: number,
  centerLon: number,
  radius: number,
): THREE.Matrix4 {
  const [cx, cy, cz] = latLonToVec3(centerLat, centerLon, radius)
  const normal = new THREE.Vector3(cx, cy, cz).normalize()

  const ref = Math.abs(normal.y) > 0.999
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0)
  const east = new THREE.Vector3().crossVectors(ref, normal).normalize()
  const north = new THREE.Vector3().crossVectors(normal, east).normalize()

  // Matrix columns: east (x), normal (y = extrusion direction), north (z)
  // ExtrudeGeometry extrudes along +Z, so we map: local X → east, local Y → north, local Z (depth) → normal
  const mat = new THREE.Matrix4()
  mat.set(
    east.x,  normal.x, north.x,  cx,
    east.y,  normal.y, north.y,  cy,
    east.z,  normal.z, north.z,  cz,
    0,       0,        0,        1,
  )
  return mat
}

/**
 * Creates an extruded geometry from a 2D footprint projected onto the globe.
 * Returns null if the polygon is degenerate or self-intersecting.
 */
export function createBuildingGeometry(
  footprint2d: Array<[number, number]>,
  height: number,
  placementMatrix: THREE.Matrix4,
): THREE.BufferGeometry | null {
  if (footprint2d.length < 3) return null

  try {
    const shape = new THREE.Shape()
    shape.moveTo(footprint2d[0][0], footprint2d[0][1])
    for (let i = 1; i < footprint2d.length; i++) {
      shape.lineTo(footprint2d[i][0], footprint2d[i][1])
    }
    shape.closePath()

    // Check shape has area (skip degenerate)
    const area = Math.abs(THREE.ShapeUtils.area(shape.getPoints(1)))
    if (area < 1e-16) return null

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    })

    geo.applyMatrix4(placementMatrix)
    return geo
  } catch {
    return null
  }
}

/**
 * Douglas-Peucker polygon simplification.
 * Reduces vertex count for buildings with complex footprints.
 */
export function simplifyPolygon(
  points: Array<{ lat: number; lon: number }>,
  tolerance: number,
): Array<{ lat: number; lon: number }> {
  if (points.length <= 4) return points

  function perpendicularDistance(
    p: { lat: number; lon: number },
    a: { lat: number; lon: number },
    b: { lat: number; lon: number },
  ): number {
    const dx = b.lon - a.lon
    const dy = b.lat - a.lat
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.sqrt((p.lon - a.lon) ** 2 + (p.lat - a.lat) ** 2)
    const t = Math.max(0, Math.min(1, ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / len2))
    const projLon = a.lon + t * dx
    const projLat = a.lat + t * dy
    return Math.sqrt((p.lon - projLon) ** 2 + (p.lat - projLat) ** 2)
  }

  function dpSimplify(
    pts: Array<{ lat: number; lon: number }>,
    start: number,
    end: number,
    tol: number,
    result: Array<{ lat: number; lon: number }>,
  ): void {
    let maxDist = 0
    let maxIdx = start
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(pts[i], pts[start], pts[end])
      if (d > maxDist) {
        maxDist = d
        maxIdx = i
      }
    }
    if (maxDist > tol) {
      dpSimplify(pts, start, maxIdx, tol, result)
      dpSimplify(pts, maxIdx, end, tol, result)
    } else {
      result.push(pts[start])
    }
  }

  const result: Array<{ lat: number; lon: number }> = []
  dpSimplify(points, 0, points.length - 1, tolerance, result)
  result.push(points[points.length - 1])
  return result.length >= 3 ? result : points
}
