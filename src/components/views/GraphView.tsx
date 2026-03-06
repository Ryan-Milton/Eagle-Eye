import { useEffect, useRef, useMemo } from 'react'
import { useSatelliteStore } from '@/stores/satellite-store'
import { useVesselStore } from '@/stores/vessel-store'
import { useFlightStore } from '@/stores/flight-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useNewsStore } from '@/stores/news-store'
import { useConflictStore } from '@/stores/conflict-store'
import { useCyberStore } from '@/stores/cyber-store'
import { useOsintStore } from '@/stores/osint-store'
import { usePortStore } from '@/stores/port-store'
import { useRFStore } from '@/stores/rf-store'
import { useEconomicStore } from '@/stores/economic-store'
import { useSelectionStore } from '@/stores/selection-store'
import { useAppStore } from '@/stores/app-store'
import { haversineDistance } from '@/lib/utils'

interface GraphNode {
  id: string
  domain: string
  name: string
  lat: number
  lon: number
  x: number
  y: number
  vx: number
  vy: number
}

interface GraphEdge {
  source: string
  target: string
  distance: number
}

const DOMAIN_COLORS: Record<string, string> = {
  vessel: '#22d3ee',
  flight: '#eab308',
  weather: '#4ade80',
  news: '#fb7185',
  conflict: '#f87171',
  cyber: '#c084fc',
  osint: '#2dd4bf',
  port: '#60a5fa',
  rf: '#a78bfa',
  economic: '#34d399',
}

const PROXIMITY_KM = 100
const MAX_NODES = 200

export function GraphView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  const { vessels, version: vv } = useVesselStore()
  const { flights, version: fv } = useFlightStore()
  const { events: weatherEvents, version: wv } = useWeatherStore()
  const { events: newsEvents, version: nv } = useNewsStore()
  const { events: conflictEvents, version: cv } = useConflictStore()
  const { events: cyberEvents, version: cyv } = useCyberStore()
  const { posts: osintPosts, version: ov } = useOsintStore()
  const { ports, version: pv } = usePortStore()
  const { spots: rfSpots, version: rv } = useRFStore()
  const { indicators: econIndicators, version: ev } = useEconomicStore()

  const { nodes, edges } = useMemo(() => {
    void vv; void fv; void wv; void nv; void cv; void cyv; void ov; void pv; void rv; void ev
    const allNodes: GraphNode[] = []

    // Sample entities from each domain (limit to MAX_NODES total)
    const perDomain = Math.floor(MAX_NODES / 10)

    for (const [, v] of [...vessels].slice(0, perDomain)) {
      allNodes.push({ id: `v-${v.mmsi}`, domain: 'vessel', name: v.name || String(v.mmsi), lat: v.lat, lon: v.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, f] of [...flights].slice(0, perDomain)) {
      allNodes.push({ id: `f-${f.icao24}`, domain: 'flight', name: f.callsign, lat: f.lat, lon: f.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, e] of [...weatherEvents].slice(0, perDomain)) {
      allNodes.push({ id: `w-${e.id}`, domain: 'weather', name: e.title, lat: e.lat, lon: e.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, e] of [...newsEvents].slice(0, perDomain)) {
      allNodes.push({ id: `n-${e.id}`, domain: 'news', name: e.title, lat: e.lat, lon: e.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, e] of [...conflictEvents].slice(0, perDomain)) {
      allNodes.push({ id: `c-${e.id}`, domain: 'conflict', name: e.title, lat: e.lat, lon: e.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, e] of [...cyberEvents].slice(0, perDomain)) {
      allNodes.push({ id: `cy-${e.id}`, domain: 'cyber', name: e.title, lat: e.lat, lon: e.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, p] of [...osintPosts].slice(0, perDomain)) {
      allNodes.push({ id: `o-${p.id}`, domain: 'osint', name: p.text.slice(0, 40), lat: p.lat, lon: p.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, p] of [...ports].slice(0, perDomain)) {
      allNodes.push({ id: `p-${p.id}`, domain: 'port', name: p.name, lat: p.lat, lon: p.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, s] of [...rfSpots].slice(0, perDomain)) {
      allNodes.push({ id: `r-${s.id}`, domain: 'rf', name: `${s.txCall}→${s.rxCall}`, lat: s.rxLat, lon: s.rxLon, x: 0, y: 0, vx: 0, vy: 0 })
    }
    for (const [, ind] of [...econIndicators].slice(0, perDomain)) {
      allNodes.push({ id: `e-${ind.id}`, domain: 'economic', name: ind.country, lat: ind.lat, lon: ind.lon, x: 0, y: 0, vx: 0, vy: 0 })
    }

    // Initialize positions in a circle
    for (let i = 0; i < allNodes.length; i++) {
      const angle = (i / allNodes.length) * Math.PI * 2
      const r = 200 + Math.random() * 100
      allNodes[i].x = 400 + Math.cos(angle) * r
      allNodes[i].y = 300 + Math.sin(angle) * r
    }

    // Find edges (cross-domain proximity)
    const allEdges: GraphEdge[] = []
    for (let i = 0; i < allNodes.length; i++) {
      for (let j = i + 1; j < allNodes.length; j++) {
        if (allNodes[i].domain === allNodes[j].domain) continue
        const dist = haversineDistance(allNodes[i].lat, allNodes[i].lon, allNodes[j].lat, allNodes[j].lon)
        if (dist <= PROXIMITY_KM) {
          allEdges.push({ source: allNodes[i].id, target: allNodes[j].id, distance: dist })
        }
      }
    }

    return { nodes: allNodes, edges: allEdges }
  }, [vv, fv, wv, nv, cv, cyv, ov, pv, rv, ev, vessels, flights, weatherEvents, newsEvents, conflictEvents, cyberEvents, osintPosts, ports, rfSpots, econIndicators])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    function tick() {
      // Simple force simulation
      for (const edge of edges) {
        const s = nodeMap.get(edge.source)
        const t = nodeMap.get(edge.target)
        if (!s || !t) continue
        const dx = t.x - s.x
        const dy = t.y - s.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 80) * 0.001
        s.vx += (dx / dist) * force
        s.vy += (dy / dist) * force
        t.vx -= (dx / dist) * force
        t.vy -= (dy / dist) * force
      }

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          if (dist < 60) {
            const force = 0.5 / dist
            nodes[i].vx -= (dx / dist) * force
            nodes[i].vy -= (dy / dist) * force
            nodes[j].vx += (dx / dist) * force
            nodes[j].vy += (dy / dist) * force
          }
        }
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (400 - node.x) * 0.0005
        node.vy += (300 - node.y) * 0.0005
        node.vx *= 0.95
        node.vy *= 0.95
        node.x += node.vx
        node.y += node.vy
      }

      // Draw
      const w = canvas!.width
      const h = canvas!.height
      ctx!.clearRect(0, 0, w, h)

      // Edges
      ctx!.strokeStyle = '#27272a'
      ctx!.lineWidth = 0.5
      for (const edge of edges) {
        const s = nodeMap.get(edge.source)
        const t = nodeMap.get(edge.target)
        if (!s || !t) continue
        ctx!.beginPath()
        ctx!.moveTo(s.x, s.y)
        ctx!.lineTo(t.x, t.y)
        ctx!.stroke()
      }

      // Nodes
      for (const node of nodes) {
        ctx!.fillStyle = DOMAIN_COLORS[node.domain] ?? '#a1a1aa'
        ctx!.globalAlpha = 0.8
        ctx!.beginPath()
        ctx!.arc(node.x, node.y, 4, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.globalAlpha = 1
      }

      animRef.current = requestAnimationFrame(tick)
    }

    // Size canvas
    const rect = canvas.parentElement!.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    tick()

    return () => cancelAnimationFrame(animRef.current)
  }, [nodes, edges])

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px] bg-zinc-950">
      <div className="absolute top-3 left-3 font-display text-[12px] font-semibold tracking-[3px] text-zinc-600 uppercase z-10">
        Entity Graph — {nodes.length} nodes, {edges.length} edges
      </div>
      {/* Legend */}
      <div className="absolute top-3 right-3 flex gap-3 z-10">
        {Object.entries(DOMAIN_COLORS).map(([domain, color]) => (
          <div key={domain} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-mono text-[10px] text-zinc-500 uppercase">{domain}</span>
          </div>
        ))}
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
