import * as THREE from 'three'
import { displayRadius } from '@/lib/propagation-kernel'
import type { SatellitePosition } from '@/types'

const FADE_SPEED = 0.06  // opacity lerp per frame (~300ms to full)

export class SatelliteLayer {
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private maxCount: number
  private positionAttr: THREE.BufferAttribute

  private currentOpacity: number
  private targetOpacity: number
  private noradIds: number[]

  constructor(color: number, maxCount: number) {
    this.maxCount = maxCount
    this.currentOpacity = 0
    this.targetOpacity = 0
    this.noradIds = []

    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(maxCount * 3)
    this.positionAttr = new THREE.BufferAttribute(positions, 3)
    this.positionAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('position', this.positionAttr)
    this.geometry.setDrawRange(0, 0)

    this.material = new THREE.PointsMaterial({
      color,
      size: 3,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.renderOrder = 10
    this.points.visible = false
  }

  update(positions: SatellitePosition[]) {
    const count = Math.min(positions.length, this.maxCount)
    const arr = this.positionAttr.array as Float32Array

    this.noradIds.length = count
    for (let i = 0; i < count; i++) {
      const p = positions[i]
      this.noradIds[i] = p.noradId
      const r = displayRadius(p.alt)
      const phi = (90 - p.lat) * (Math.PI / 180)
      const theta = (p.lon + 180) * (Math.PI / 180)
      arr[i * 3]     = -r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] =  r * Math.cos(phi)
      arr[i * 3 + 2] =  r * Math.sin(phi) * Math.sin(theta)
    }

    this.positionAttr.needsUpdate = true
    this.geometry.setDrawRange(0, count)
    this.geometry.computeBoundingSphere()
  }

  getNoradIdAtIndex(index: number): number | null {
    return this.noradIds[index] ?? null
  }

  show() {
    this.targetOpacity = 1
    this.points.visible = true
  }

  hide() {
    this.targetOpacity = 0
  }

  animateFrame() {
    if (this.currentOpacity === this.targetOpacity) return

    const diff = this.targetOpacity - this.currentOpacity
    if (Math.abs(diff) < 0.01) {
      this.currentOpacity = this.targetOpacity
    } else {
      this.currentOpacity += diff * FADE_SPEED
    }

    this.material.opacity = 0.85 * this.currentOpacity

    if (this.currentOpacity === 0 && this.targetOpacity === 0) {
      this.points.visible = false
      this.geometry.setDrawRange(0, 0)
    }
  }

  get visible() {
    return this.points.visible || this.targetOpacity > 0
  }

  get mesh(): THREE.Points {
    return this.points
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
