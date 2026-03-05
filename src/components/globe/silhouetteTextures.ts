import * as THREE from 'three'

const SIZE = 64
const HALF = SIZE / 2

/** Top-down boat silhouette: pointed bow, flat stern */
export function createVesselTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, SIZE, SIZE)

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  // Bow (top, pointed)
  ctx.moveTo(HALF, 6)
  // Starboard side
  ctx.lineTo(HALF + 12, 22)
  ctx.lineTo(HALF + 14, 40)
  // Stern (bottom, flat)
  ctx.lineTo(HALF + 10, 54)
  ctx.lineTo(HALF - 10, 54)
  // Port side
  ctx.lineTo(HALF - 14, 40)
  ctx.lineTo(HALF - 12, 22)
  ctx.closePath()
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/** Top-down airplane silhouette: fuselage, swept wings, tail fins */
export function createFlightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, SIZE, SIZE)

  ctx.fillStyle = '#ffffff'

  // Fuselage
  ctx.beginPath()
  ctx.moveTo(HALF, 4)           // nose
  ctx.lineTo(HALF + 4, 14)
  ctx.lineTo(HALF + 4, 50)
  ctx.lineTo(HALF + 2, 58)      // tail
  ctx.lineTo(HALF - 2, 58)
  ctx.lineTo(HALF - 4, 50)
  ctx.lineTo(HALF - 4, 14)
  ctx.closePath()
  ctx.fill()

  // Wings (swept back)
  ctx.beginPath()
  ctx.moveTo(HALF - 3, 24)
  ctx.lineTo(2, 36)
  ctx.lineTo(4, 38)
  ctx.lineTo(HALF - 3, 32)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(HALF + 3, 24)
  ctx.lineTo(SIZE - 2, 36)
  ctx.lineTo(SIZE - 4, 38)
  ctx.lineTo(HALF + 3, 32)
  ctx.closePath()
  ctx.fill()

  // Tail fins
  ctx.beginPath()
  ctx.moveTo(HALF - 3, 48)
  ctx.lineTo(10, 56)
  ctx.lineTo(12, 57)
  ctx.lineTo(HALF - 3, 52)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(HALF + 3, 48)
  ctx.lineTo(SIZE - 10, 56)
  ctx.lineTo(SIZE - 12, 57)
  ctx.lineTo(HALF + 3, 52)
  ctx.closePath()
  ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}
