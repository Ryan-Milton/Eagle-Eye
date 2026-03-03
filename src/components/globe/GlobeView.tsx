import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { ENTITIES, ARC_PAIRS } from '@/data'
import { latLonToVec3 } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Entity, LayerId } from '@/types'

const NODE_COLORS: Record<Entity['type'], number> = {
  person:   0x3b82f6,
  vehicle:  0xeab308,
  location: 0x22c55e,
  signal:   0xe8640a,
}

function buildEarthTexture(): THREE.CanvasTexture {
  const TX = 2048, TY = 1024
  const canvas = document.createElement('canvas')
  canvas.width = TX; canvas.height = TY
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#080810'
  ctx.fillRect(0, 0, TX, TY)

  function ll(lat: number, lon: number): [number, number] {
    return [(lon + 180) / 360 * TX, (90 - lat) / 180 * TY]
  }
  function land(pts: [number, number][]) {
    ctx.beginPath()
    ctx.moveTo(...ll(pts[0][0], pts[0][1]))
    pts.slice(1).forEach(p => ctx.lineTo(...ll(p[0], p[1])))
    ctx.closePath()
    ctx.fillStyle = '#1c1c20'; ctx.fill()
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 1.2; ctx.stroke()
  }

  land([[70,-140],[72,-90],[68,-70],[60,-65],[50,-55],[45,-60],[40,-70],[35,-75],[30,-80],[25,-90],[20,-87],[15,-85],[20,-105],[25,-110],[22,-110],[32,-117],[38,-122],[49,-124],[60,-137],[65,-145]])
  land([[12,-70],[12,-62],[8,-60],[5,-52],[0,-50],[-10,-35],[-20,-40],[-30,-50],[-40,-62],[-50,-68],[-55,-64],[-55,-67],[-45,-75],[-35,-72],[-20,-70],[-10,-75],[0,-78],[10,-75]])
  land([[71,28],[71,15],[63,5],[58,5],[55,8],[55,15],[50,14],[47,16],[45,13],[43,18],[40,18],[36,14],[36,-5],[43,-8],[48,-2],[50,-5],[51,2],[58,-5],[63,-20],[65,-18],[68,20]])
  land([[37,10],[37,36],[30,32],[20,38],[12,42],[10,44],[0,42],[-10,40],[-20,35],[-30,30],[-34,26],[-34,18],[-25,14],[-15,12],[-5,8],[5,2],[4,-5],[10,-15],[15,-17],[20,-17],[28,10]])
  land([[71,28],[75,80],[73,130],[65,140],[60,140],[55,135],[50,140],[45,135],[38,140],[35,136],[22,114],[18,110],[10,100],[1,104],[5,100],[15,73],[8,77],[20,60],[30,48],[37,36],[37,29],[40,26],[50,28],[55,37],[65,55],[71,60]])
  land([[-14,126],[-14,136],[-17,140],[-22,150],[-28,154],[-34,151],[-38,147],[-38,140],[-32,133],[-32,125],[-26,114],[-20,114]])

  ctx.strokeStyle = 'rgba(63,63,70,0.35)'; ctx.lineWidth = 0.7
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

const LAYERS: { id: LayerId; label: string }[] = [
  { id: 'grid',  label: 'Grid' },
  { id: 'arcs',  label: 'Signals' },
  { id: 'nodes', label: 'Nodes' },
  { id: 'heat',  label: 'Density' },
]

interface GlobeViewProps {
  onEntityFocus?: Entity | null
}

export function GlobeView({ onEntityFocus }: GlobeViewProps) {
  const mountRef  = useRef<HTMLDivElement>(null)
  const stateRef  = useRef({
    rx: 0.25, ry: 0, trx: 0.25, try_: 0,
    zoom: 2.9, tzoom: 2.9,
    drag: false, px: 0, py: 0,
    frame: 0,
    rafId: 0,
  })
  const layerRefs = useRef<Record<LayerId, THREE.Object3D | null>>({
    grid: null, arcs: null, nodes: null, heat: null,
  })
  const [coords, setCoords] = useState('LAT — LON — ALT')
  const [activeLayers, setActiveLayers] = useState<Set<LayerId>>(
    new Set(['grid', 'arcs', 'nodes'])
  )

  // Sync entity focus → rotation target
  useEffect(() => {
    if (!onEntityFocus) return
    stateRef.current.trx = -onEntityFocus.lat * 0.014
    stateRef.current.try_ = -onEntityFocus.lon * 0.014
  }, [onEntityFocus])

  const toggleLayer = useCallback((id: LayerId) => {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      const obj = layerRefs.current[id]
      if (obj) obj.visible = next.has(id)
      return next
    })
  }, [])

  const zoom = useCallback((delta: number) => {
    stateRef.current.tzoom = Math.max(1.3, Math.min(5.5, stateRef.current.tzoom + delta))
  }, [])

  const resetView = useCallback(() => {
    stateRef.current.tzoom = 2.9
    stateRef.current.trx   = 0.25
    stateRef.current.try_  = 0
  }, [])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const s = stateRef.current

    // ── Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.setClearColor(0, 0)
    el.appendChild(renderer.domElement)

    // ── Scene / Camera ────────────────────────────────────
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, el.clientWidth / el.clientHeight, 0.1, 1000)
    camera.position.z = 2.9

    // ── Globe group ───────────────────────────────────────
    const gGroup = new THREE.Group()
    scene.add(gGroup)

    const globeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 72, 72),
      new THREE.MeshPhongMaterial({ map: buildEarthTexture(), specular: new THREE.Color(0x0e0e12), shininess: 4 })
    )
    const atmMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.018, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x18181b, transparent: true, opacity: 0.10, side: THREE.FrontSide })
    )
    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: { c: { value: 0.09 }, p: { value: 6.5 }, gc: { value: new THREE.Color(0x18181b) } },
        vertexShader:  `varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader:`uniform float c,p; uniform vec3 gc; varying vec3 vN; void main(){ float i=pow(c-dot(vN,vec3(0,0,1)),p); gl_FragColor=vec4(gc,i); }`,
        side: THREE.FrontSide, blending: THREE.AdditiveBlending, transparent: true,
      })
    )
    const gridMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.003, 36, 18),
      new THREE.MeshBasicMaterial({ color: 0x3f3f46, wireframe: true, transparent: true, opacity: 0.07 })
    )
    layerRefs.current.grid = gridMesh
    gGroup.add(globeMesh, atmMesh, glowMesh, gridMesh)

    // ── Lighting ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x18181b, 1.1))
    const sun = new THREE.DirectionalLight(0xf4f4f5, 1.3)
    sun.position.set(5, 3, 5); scene.add(sun)

    // ── Entity nodes ──────────────────────────────────────
    const nodeGroup = new THREE.Group()
    layerRefs.current.nodes = nodeGroup
    gGroup.add(nodeGroup)

    const pulseArr: { pulse: THREE.Mesh; phase: number }[] = []
    ENTITIES.forEach(e => {
      const [x, y, z] = latLonToVec3(e.lat, e.lon, 1.016)
      const pos = new THREE.Vector3(x, y, z)
      const col = NODE_COLORS[e.type]

      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.007, 12), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, side: THREE.DoubleSide }))
      dot.position.copy(pos); dot.lookAt(0, 0, 0); nodeGroup.add(dot)

      const ring = new THREE.Mesh(new THREE.RingGeometry(0.010, 0.015, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, side: THREE.DoubleSide }))
      ring.position.copy(pos); ring.lookAt(0, 0, 0); nodeGroup.add(ring)

      const pulse = new THREE.Mesh(new THREE.RingGeometry(0.016, 0.022, 16), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: THREE.DoubleSide }))
      pulse.position.copy(pos); pulse.lookAt(0, 0, 0); nodeGroup.add(pulse)
      pulseArr.push({ pulse, phase: Math.random() * Math.PI * 2 })
    })

    // ── Arcs ──────────────────────────────────────────────
    const arcGroup  = new THREE.Group()
    const partGroup = new THREE.Group()
    layerRefs.current.arcs = new THREE.Group()
    ;(layerRefs.current.arcs as THREE.Group).add(arcGroup, partGroup)
    gGroup.add(layerRefs.current.arcs)

    const arcParticles: { curve: THREE.QuadraticBezierCurve3; particle: THREE.Mesh; t: number; speed: number }[] = []
    ARC_PAIRS.forEach(([ai, bi], i) => {
      const a = ENTITIES[ai], b = ENTITIES[bi]
      const [ax, ay, az] = latLonToVec3(a.lat, a.lon, 1.02)
      const [bx, by, bz] = latLonToVec3(b.lat, b.lon, 1.02)
      const pA = new THREE.Vector3(ax, ay, az)
      const pB = new THREE.Vector3(bx, by, bz)
      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5)
      mid.normalize().multiplyScalar(1.02 + pA.distanceTo(pB) * 0.35)

      const curve = new THREE.QuadraticBezierCurve3(pA, mid, pB)
      const pts   = curve.getPoints(60)
      const geom  = new THREE.BufferGeometry().setFromPoints(pts)
      const cols  = new Float32Array(pts.length * 3)
      for (let j = 0; j < pts.length; j++) {
        const al = Math.sin(j / (pts.length - 1) * Math.PI) * 0.5
        cols[j*3] = al * 0.91; cols[j*3+1] = al * 0.39; cols[j*3+2] = al * 0.04
      }
      geom.setAttribute('color', new THREE.BufferAttribute(cols, 3))
      arcGroup.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 })))

      const pm = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 6), new THREE.MeshBasicMaterial({ color: 0xe8640a, transparent: true, opacity: 0.9 }))
      partGroup.add(pm)
      arcParticles.push({ curve, particle: pm, t: i * 0.125, speed: 0.003 + Math.random() * 0.002 })
    })

    // ── Pointer events ────────────────────────────────────
    const canvas = renderer.domElement

    const onMouseDown = (e: MouseEvent) => { s.drag = true; s.px = e.clientX; s.py = e.clientY }
    const onMouseMove = (e: MouseEvent) => {
      if (s.drag) {
        s.try_ += (e.clientX - s.px) * 0.007
        s.trx  += (e.clientY - s.py) * 0.004
        s.trx   = Math.max(-1.3, Math.min(1.3, s.trx))
        s.px = e.clientX; s.py = e.clientY
      }
      // coords HUD
      const rect = canvas.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const lat = (ny * 90 + s.rx * 57.3).toFixed(2)
      const lon = (nx * 180 - s.ry * 57.3).toFixed(2)
      setCoords(`${Math.abs(+lat)}°${+lat >= 0 ? 'N' : 'S'}  ·  ${Math.abs(+lon % 360)}°${+lon >= 0 ? 'E' : 'W'}  ·  ${(s.zoom * 12000).toFixed(0)} km`)
    }
    const onMouseUp  = () => { s.drag = false }
    const onWheel    = (e: WheelEvent) => { s.tzoom = Math.max(1.3, Math.min(5.5, s.tzoom + e.deltaY * 0.002)) }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    canvas.addEventListener('wheel',     onWheel, { passive: true })

    // ── Render loop ───────────────────────────────────────
    function animate() {
      s.rafId = requestAnimationFrame(animate)
      s.frame++
      s.rx   += (s.trx  - s.rx)   * 0.08
      s.ry   += (s.try_ - s.ry)   * 0.08
      s.zoom += (s.tzoom - s.zoom) * 0.08

      gGroup.rotation.x = s.rx
      gGroup.rotation.y = s.ry + s.frame * 0.0006
      camera.position.z = s.zoom

      pulseArr.forEach(({ pulse, phase }) => {
        const t = s.frame * 0.025 + phase
        pulse.scale.setScalar(1 + Math.sin(t) * 0.5)
        ;(pulse.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.18 + Math.sin(t) * 0.18)
      })
      arcParticles.forEach(p => {
        p.t = (p.t + p.speed) % 1
        p.particle.position.copy(p.curve.getPoint(p.t))
        ;(p.particle.material as THREE.MeshBasicMaterial).opacity = Math.sin(p.t * Math.PI) * 0.85
      })

      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(s.rafId)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      canvas.removeEventListener('wheel',     onWheel)
      ro.disconnect()
      renderer.dispose()
      el.removeChild(canvas)
    }
  }, [])

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px] bg-zinc-950 overflow-hidden" ref={mountRef}>

      {/* Corner brackets */}
      {(['tl','tr','bl','br'] as const).map(pos => (
        <div key={pos} className={cn(
          'absolute w-5 h-5 pointer-events-none',
          pos === 'tl' && 'top-3.5 left-3.5',
          pos === 'tr' && 'top-3.5 right-3.5',
          pos === 'bl' && 'bottom-3.5 left-3.5',
          pos === 'br' && 'bottom-3.5 right-3.5',
        )}>
          <div className={cn(
            'absolute bg-zinc-700',
            (pos === 'tl' || pos === 'tr') ? 'top-0 h-px w-full' : 'bottom-0 h-px w-full',
          )} />
          <div className={cn(
            'absolute bg-zinc-700 w-px h-full',
            (pos === 'tl' || pos === 'bl') ? 'left-0' : 'right-0',
          )} />
        </div>
      ))}

      {/* HUD labels */}
      <div className="absolute top-[18px] left-1/2 -translate-x-1/2 font-display text-[9px] font-semibold tracking-[3px] text-zinc-700 uppercase pointer-events-none">
        Global Surveillance Network
      </div>
      <div className="absolute bottom-[18px] left-1/2 -translate-x-1/2 font-mono text-[10px] text-zinc-600 tracking-widest pointer-events-none">
        {coords}
      </div>

      {/* Zoom controls */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        {[
          { label: '+', delta: -0.35, onClick: () => zoom(-0.35) },
          { label: '−', delta:  0.35, onClick: () => zoom(0.35) },
          { label: '●', delta: 0,     onClick: resetView },
        ].map(({ label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="w-[30px] h-[30px] bg-zinc-900/90 border border-zinc-700 text-zinc-400 text-sm flex items-center justify-center rounded-sm hover:border-orange-800 hover:text-orange-400 hover:bg-orange-950/30 transition-all"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Layer controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
        {LAYERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => toggleLayer(id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 font-display text-[10px] font-medium tracking-wide uppercase',
              'bg-zinc-900/90 border rounded-sm min-w-[86px] text-left transition-all',
              activeLayers.has(id)
                ? 'border-zinc-700 text-zinc-400'
                : 'border-zinc-800 text-zinc-600',
            )}
          >
            <span className={cn(
              'inline-block w-[5px] h-[5px] rounded-full border flex-shrink-0 transition-all',
              activeLayers.has(id)
                ? 'bg-orange-500 border-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]'
                : 'border-zinc-600',
            )} />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
