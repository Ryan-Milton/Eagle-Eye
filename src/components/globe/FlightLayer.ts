import * as THREE from 'three'
import type { FlightRecord } from '@/types'
import { createFlightTexture } from './silhouetteTextures'
import { entityVertexShader, entityFragmentShader } from './entityShaders'

const FADE_SPEED = 0.06
const FLIGHT_RADIUS = 1.005  // slightly above surface (above vessels at 1.003)
const MAX_FLIGHTS = 20_000

const SHAPE_START_ZOOM = 2.5
const SHAPE_FULL_ZOOM = 1.8

export class FlightLayer {
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private positionAttr: THREE.BufferAttribute
  private headingAttr: THREE.BufferAttribute
  private silhouetteTexture: THREE.CanvasTexture

  private currentOpacity: number
  private targetOpacity: number
  private icaoList: string[]

  constructor() {
    this.currentOpacity = 0
    this.targetOpacity = 0
    this.icaoList = []

    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(MAX_FLIGHTS * 3)
    this.positionAttr = new THREE.BufferAttribute(positions, 3)
    this.positionAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('position', this.positionAttr)

    const headings = new Float32Array(MAX_FLIGHTS)
    this.headingAttr = new THREE.BufferAttribute(headings, 1)
    this.headingAttr.setUsage(THREE.DynamicDrawUsage)
    this.geometry.setAttribute('heading', this.headingAttr)

    this.geometry.setDrawRange(0, 0)

    this.silhouetteTexture = createFlightTexture()

    const color = new THREE.Color(0xeab308)
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
    this.points.renderOrder = 11
    this.points.visible = false
  }

  update(flights: Map<string, FlightRecord>) {
    const posArr = this.positionAttr.array as Float32Array
    const hdgArr = this.headingAttr.array as Float32Array
    let i = 0

    this.icaoList.length = 0
    for (const [icao, f] of flights) {
      if (i >= MAX_FLIGHTS) break
      this.icaoList.push(icao)

      const phi = (90 - f.lat) * (Math.PI / 180)
      const theta = (f.lon + 180) * (Math.PI / 180)
      posArr[i * 3]     = -FLIGHT_RADIUS * Math.sin(phi) * Math.cos(theta)
      posArr[i * 3 + 1] =  FLIGHT_RADIUS * Math.cos(phi)
      posArr[i * 3 + 2] =  FLIGHT_RADIUS * Math.sin(phi) * Math.sin(theta)

      hdgArr[i] = f.heading * (Math.PI / 180)

      i++
    }

    this.positionAttr.needsUpdate = true
    this.headingAttr.needsUpdate = true
    this.geometry.setDrawRange(0, i)
    this.geometry.computeBoundingSphere()
  }

  getIcaoAtIndex(index: number): string | null {
    return this.icaoList[index] ?? null
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
