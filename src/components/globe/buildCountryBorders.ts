import * as THREE from 'three'
import countriesData from 'world-atlas/countries-50m.json'
import { mesh } from 'topojson-client'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

export function buildCountryBorders(width: number, height: number): LineSegments2 {
  const borders = mesh(countriesData as any, (countriesData as any).objects.countries)
  const R = 1.002
  const positions: number[] = []

  for (const line of borders.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon0, lat0] = line[i]
      const [lon1, lat1] = line[i + 1]

      // Skip anti-meridian wrapping artifacts
      if (Math.abs(lon1 - lon0) > 300) continue

      const phi0 = (90 - lat0) * (Math.PI / 180)
      const theta0 = (lon0 + 180) * (Math.PI / 180)
      positions.push(
        -R * Math.sin(phi0) * Math.cos(theta0),
         R * Math.cos(phi0),
         R * Math.sin(phi0) * Math.sin(theta0),
      )

      const phi1 = (90 - lat1) * (Math.PI / 180)
      const theta1 = (lon1 + 180) * (Math.PI / 180)
      positions.push(
        -R * Math.sin(phi1) * Math.cos(theta1),
         R * Math.cos(phi1),
         R * Math.sin(phi1) * Math.sin(theta1),
      )
    }
  }

  const geom = new LineSegmentsGeometry()
  geom.setPositions(positions)

  const mat = new LineMaterial({
    color: 0x3a3a44,
    transparent: true,
    opacity: 0.6,
    linewidth: 1.5,
    resolution: new THREE.Vector2(width, height),
  })

  return new LineSegments2(geom, mat)
}
