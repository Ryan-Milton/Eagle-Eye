import * as THREE from 'three'
import type { VesselRecord } from '@/types'
import { createVesselTexture } from './silhouetteTextures'
import { entityVertexShader, entityFragmentShader } from './entityShaders'

const FADE_SPEED = 0.06
const VESSEL_RADIUS = 1.003  // ocean surface (just above globe r=1.0)
const MAX_VESSELS = 20_000

const SHAPE_START_ZOOM = 2.5
const SHAPE_FULL_ZOOM = 1.8

export class VesselLayer {
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private positionAttr: THREE.BufferAttribute
  private headingAttr: THREE.BufferAttribute
  private silhouetteTexture: THREE.CanvasTexture

  private currentOpacity: number
  private targetOpacity: number
  private mmsiList: number[]

  constructor() {
    this.currentOpacity = 0
    this.targetOpacity = 0
    this.mmsiList = []

    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_VESSELS * 3)
    this.positionAttr = new THREE.BufferAttribute(positions, 3)
    this.positionAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('position', this.positionAttr)

    const headings = new Float32Array(MAX_VESSELS)
    this.headingAttr = new THREE.BufferAttribute(headings, 1)
    this.headingAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('heading', this.headingAttr)

    this.geometry.setDrawRange(0, 0)

    this.silhouetteTexture = createVesselTexture()

    const color = new THREE.Color(0x22d3ee)
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uZoom: { value: 4.65 },
        uShapeStartZoom: { value: SHAPE_START_ZOOM },
        uShapeFullZoom: { value: SHAPE_FULL_ZOOM },
        uBaseSize: { value: 2.0 },
        uShapeSize: { value: 16.0 },
        uOpacity: { value: 0 },
        uSilhouette: { value: this.silhouetteTexture },
        uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
      },
      vertexShader: entityVertexShader,
      fragmentShader: entityFragmentShader,
      transparent: true,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.renderOrder = 10
    this.points.visible = false
  }

  update(vessels: Map<number, VesselRecord>) {
    const posArr = this.positionAttr.array as Float32Array
    const hdgArr = this.headingAttr.array as Float32Array
    let i = 0

    this.mmsiList.length = 0
    for (const [mmsi, v] of vessels) {
      if (i >= MAX_VESSELS) break
      this.mmsiList.push(mmsi)

      const phi = (90 - v.lat) * (Math.PI / 180)
      const theta = (v.lon + 180) * (Math.PI / 180)
      posArr[i * 3]     = -VESSEL_RADIUS * Math.sin(phi) * Math.cos(theta)
      posArr[i * 3 + 1] =  VESSEL_RADIUS * Math.cos(phi)
      posArr[i * 3 + 2] =  VESSEL_RADIUS * Math.sin(phi) * Math.sin(theta)

      // AIS heading 511 = unknown, fall back to course
      const deg = v.heading === 511 ? v.course : v.heading
      hdgArr[i] = deg * (Math.PI / 180)

      i++
    }

    this.positionAttr.needsUpdate = true
    this.headingAttr.needsUpdate = true
    this.geometry.setDrawRange(0, i)
    this.geometry.computeBoundingSphere()
  }

  getMmsiAtIndex(index: number): number | null {
    return this.mmsiList[index] ?? null
  }

  show() {
    this.targetOpacity = 1
    this.points.visible = true
  }

  hide() {
    this.targetOpacity = 0
  }

  animateFrame(zoom: number) {
    this.material.uniforms.uZoom.value = zoom

    if (this.currentOpacity !== this.targetOpacity) {
      const diff = this.targetOpacity - this.currentOpacity
      if (Math.abs(diff) < 0.01) {
        this.currentOpacity = this.targetOpacity
      } else {
        this.currentOpacity += diff * FADE_SPEED
      }
    }

    this.material.uniforms.uOpacity.value = 0.85 * this.currentOpacity

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
    this.silhouetteTexture.dispose()
  }
}
