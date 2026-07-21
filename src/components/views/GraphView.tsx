import { useEffect, useRef, useMemo, useState, useCallback } from 'react'
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
import { useAppStore } from '@/stores/app-store'
import { haversineDistance } from '@/lib/utils'
import { getDomainColors, getVisualTheme } from '@/lib/visual-theme'
import { DOMAIN_LABELS, CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_BAR_STYLE, activeBarGrow } from '@/lib/chart-theme'
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { AnalysisChartRegion, AnalysisPanel, AnalysisSectionTitle, DomainMark } from './shared/AnalysisPrimitives'

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

const PROXIMITY_KM = 100
const MAX_NODES = 200

export function GraphView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const nodesRef = useRef<GraphNode[]>([])
  const layoutNodesRef = useRef<GraphNode[] | null>(null)
  const hoveredNodeRef = useRef<GraphNode | null>(null)
  const selectedNodeRef = useRef<GraphNode | null>(null)
  const selectedEdgeIdsRef = useRef<Set<string>>(new Set())
  const connectedNodeIdsRef = useRef<Set<string>>(new Set())
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const theme = useAppStore(state => state.theme)
  const domainColors = getDomainColors(theme)
  const visualTheme = getVisualTheme(theme)

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
      const r = 250
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

  // Stats computations
  const radarData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const n of nodes) counts[n.domain] = (counts[n.domain] || 0) + 1
    const max = Math.max(...Object.values(counts), 1)
    return Object.keys(domainColors).map(domain => ({
      domain: DOMAIN_LABELS[domain] || domain,
      value: Math.round(((counts[domain] || 0) / max) * 100),
    }))
  }, [domainColors, nodes])

  const topConnections = useMemo(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const pairCounts: Record<string, number> = {}
    for (const edge of edges) {
      const s = nodeMap.get(edge.source)
      const t = nodeMap.get(edge.target)
      if (!s || !t) continue
      const pair = [s.domain, t.domain].sort().join('–')
      pairCounts[pair] = (pairCounts[pair] || 0) + 1
    }
    return Object.entries(pairCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([pair, count]) => ({ pair, count }))
  }, [nodes, edges])

  const distanceHistogram = useMemo(() => {
    const buckets = [
      { range: '0-25', count: 0 },
      { range: '25-50', count: 0 },
      { range: '50-75', count: 0 },
      { range: '75-100', count: 0 },
    ]
    for (const edge of edges) {
      const idx = Math.min(3, Math.floor(edge.distance / 25))
      buckets[idx].count++
    }
    return buckets
  }, [edges])

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return []
    const connected: GraphNode[] = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    for (const edge of edges) {
      if (edge.source === selectedNode.id) {
        const t = nodeMap.get(edge.target)
        if (t) connected.push(t)
      } else if (edge.target === selectedNode.id) {
        const s = nodeMap.get(edge.source)
        if (s) connected.push(s)
      }
    }
    return connected
  }, [selectedNode, nodes, edges])

  const selectedEdgeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>()
    const ids = new Set<string>()
    for (const edge of edges) {
      if (edge.source === selectedNode.id || edge.target === selectedNode.id) {
        ids.add(`${edge.source}-${edge.target}`)
      }
    }
    return ids
  }, [selectedNode, edges])

  hoveredNodeRef.current = hoveredNode
  selectedNodeRef.current = selectedNode
  selectedEdgeIdsRef.current = selectedEdgeIds
  connectedNodeIdsRef.current = new Set(connectedNodes.map(node => node.id))

  // Canvas mouse interaction
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    let closest: GraphNode | null = null
    let closestDist = 20
    for (const node of nodesRef.current) {
      const dx = node.x - mx
      const dy = node.y - my
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < closestDist) {
        closestDist = d
        closest = node
      }
    }
    setHoveredNode(closest)
    canvas.style.cursor = closest ? 'pointer' : 'default'
  }, [])

  const handleCanvasClick = useCallback(() => {
    setSelectedNode(hoveredNode)
  }, [hoveredNode])

  // Canvas rendering
  /* eslint-disable react-hooks/immutability -- The force simulation intentionally mutates its canvas-local node copies. */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const isNewLayout = layoutNodesRef.current !== nodes
    const simulationNodes = isNewLayout ? nodes.map(node => ({ ...node })) : nodesRef.current
    const nodeMap = new Map(simulationNodes.map(n => [n.id, n]))
    nodesRef.current = simulationNodes

    // Keep simulation coordinates in CSS pixels and scale only the backing store.
    const container = canvas.parentElement!
    let width = 1
    let height = 1
    let dpr = 1
    let cx = 0.5
    let cy = 0.5

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      const nextWidth = Math.max(1, rect.width)
      const nextHeight = Math.max(1, rect.height)
      const nextDpr = Math.max(1, window.devicePixelRatio || 1)
      const nextCx = nextWidth / 2
      const nextCy = nextHeight / 2

      if (layoutNodesRef.current === nodes && width > 1 && height > 1) {
        const dx = nextCx - cx
        const dy = nextCy - cy
        for (const node of simulationNodes) {
          node.x += dx
          node.y += dy
        }
      }

      width = nextWidth
      height = nextHeight
      dpr = nextDpr
      cx = nextCx
      cy = nextCy
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resizeCanvas()

    if (isNewLayout) {
      for (let i = 0; i < simulationNodes.length; i++) {
        const angle = (i / simulationNodes.length) * Math.PI * 2
        const r = Math.min(cx, cy) * 0.6 + Math.random() * Math.min(cx, cy) * 0.2
        simulationNodes[i].x = cx + Math.cos(angle) * r
        simulationNodes[i].y = cy + Math.sin(angle) * r
      }
      layoutNodesRef.current = nodes
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)
    window.addEventListener('resize', resizeCanvas)

    function tick() {
      // Spring forces on edges
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
      for (let i = 0; i < simulationNodes.length; i++) {
        for (let j = i + 1; j < simulationNodes.length; j++) {
          const dx = simulationNodes[j].x - simulationNodes[i].x
          const dy = simulationNodes[j].y - simulationNodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          if (dist < 60) {
            const force = 0.5 / dist
            simulationNodes[i].vx -= (dx / dist) * force
            simulationNodes[i].vy -= (dy / dist) * force
            simulationNodes[j].vx += (dx / dist) * force
            simulationNodes[j].vy += (dy / dist) * force
          }
        }
      }

      // Center gravity + damping
      for (const node of simulationNodes) {
        node.vx += (cx - node.x) * 0.0005
        node.vy += (cy - node.y) * 0.0005
        node.vx *= 0.95
        node.vy *= 0.95
        node.x += node.vx
        node.y += node.vy
      }

      // Draw
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, width, height)

      // Edges
      for (const edge of edges) {
        const s = nodeMap.get(edge.source)
        const t = nodeMap.get(edge.target)
        if (!s || !t) continue
        const edgeKey = `${edge.source}-${edge.target}`
        const isSelected = selectedEdgeIdsRef.current.has(edgeKey)
        const color = domainColors[s.domain as keyof typeof domainColors] || visualTheme.lineMuted
        ctx!.strokeStyle = color
        ctx!.globalAlpha = isSelected ? 0.6 : 0.12
        ctx!.lineWidth = isSelected ? 1.5 : 0.5
        ctx!.beginPath()
        ctx!.moveTo(s.x, s.y)
        ctx!.lineTo(t.x, t.y)
        ctx!.stroke()
      }
      ctx!.globalAlpha = 1

      // Nodes
      for (const node of simulationNodes) {
        const color = domainColors[node.domain as keyof typeof domainColors] ?? visualTheme.mutedForeground
        const isHovered = hoveredNodeRef.current?.id === node.id
        const isSelected = selectedNodeRef.current?.id === node.id
        const isConnected = connectedNodeIdsRef.current.has(node.id)

        ctx!.fillStyle = isSelected ? visualTheme.signal : color
        ctx!.globalAlpha = (isSelected || isConnected || isHovered) ? 1 : 0.7
        ctx!.beginPath()
        ctx!.arc(node.x, node.y, isSelected ? 6 : isHovered ? 5 : 4, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.globalAlpha = 1

        // A crisp line frame distinguishes interaction without ambient glow.
        if (isHovered || isSelected) {
          ctx!.strokeStyle = isSelected ? visualTheme.signal : color
          ctx!.lineWidth = 1.5
          const frameSize = isSelected ? 18 : 14
          ctx!.strokeRect(node.x - frameSize / 2, node.y - frameSize / 2, frameSize, frameSize)

          ctx!.font = '600 10px "IBM Plex Mono", monospace'
          ctx!.fillStyle = visualTheme.foreground
          ctx!.textAlign = 'center'
          ctx!.fillText(node.name.slice(0, 30), node.x, node.y - 14)
        }
      }

      animRef.current = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(animRef.current)
      resizeObserver.disconnect()
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [nodes, edges, theme, domainColors, visualTheme])
  /* eslint-enable react-hooks/immutability */

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground xl:flex-row">
      {/* Canvas area */}
      <div className="neo-grid-fine relative min-h-[24rem] flex-1 border-b border-line xl:min-h-0 xl:border-b-0">
        <div className="neo-kicker absolute left-3 top-3 z-10 border border-line bg-panel px-2 py-1 text-foreground">
          Entity Graph / {nodes.length} nodes / {edges.length} edges
        </div>
        {/* Legend */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex max-h-24 flex-wrap gap-x-3 gap-y-1 overflow-y-auto border border-line bg-panel p-2 sm:bottom-auto sm:left-auto sm:top-3 sm:max-w-[420px]">
          {Object.entries(domainColors).map(([domain, color]) => (
            <div key={domain} className="flex items-center gap-1">
              <DomainMark color={color} />
              <span className="neo-kicker text-[9px] text-muted-foreground">{DOMAIN_LABELS[domain] || domain}</span>
            </div>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
        />
      </div>

      {/* Stats sidebar */}
      <aside className="neo-scrollbar grid max-h-[45%] w-full shrink-0 grid-cols-1 gap-3 overflow-y-auto bg-panel p-3 sm:grid-cols-2 xl:max-h-none xl:w-80 xl:grid-cols-1 xl:border-l xl:border-line">
        {/* Domain Radar */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-3">Node Distribution</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-[180px] p-2">
            <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--line-muted)" />
              <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontFamily: '"IBM Plex Mono", monospace' }} />
              <Radar dataKey="value" stroke="var(--signal)" fill="var(--signal)" fillOpacity={0.12} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
            </RadarChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Top Connections */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-3">Top Connections</AnalysisSectionTitle>
          <AnalysisChartRegion className="p-2">
          {topConnections.length > 0 ? (
            <ResponsiveContainer width="100%" height={topConnections.length * 24 + 20}>
              <BarChart data={topConnections} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid {...CHART_GRID_STYLE} horizontal={false} />
                <XAxis type="number" {...CHART_AXIS_STYLE} />
                <YAxis type="category" dataKey="pair" width={70} tick={{ fill: 'var(--muted-foreground)', fontSize: 9, fontFamily: '"IBM Plex Mono", monospace' }} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="var(--signal)" {...CHART_BAR_STYLE} activeBar={activeBarGrow} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="neo-data py-4 text-center text-xs text-muted-foreground">No cross-domain connections</div>
          )}
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Proximity Histogram */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-3">Edge Distance (km)</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-[120px] p-2">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distanceHistogram} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
              <XAxis dataKey="range" {...CHART_AXIS_STYLE} />
              <YAxis hide />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={domainColors.rf} {...CHART_BAR_STYLE} activeBar={activeBarGrow} />
            </BarChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Selected Node Detail */}
        <AnalysisPanel className="p-3">
          <AnalysisSectionTitle className="mb-3">Selected Entity</AnalysisSectionTitle>
          {selectedNode ? (
            <div className="space-y-2">
              <div>
                <div className="neo-data truncate text-sm text-foreground">{selectedNode.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <DomainMark color={domainColors[selectedNode.domain as keyof typeof domainColors]} />
                  <span className="neo-kicker text-muted-foreground">{selectedNode.domain}</span>
                </div>
                <div className="neo-data mt-1 text-xs text-muted-foreground">
                  {selectedNode.lat.toFixed(3)}, {selectedNode.lon.toFixed(3)}
                </div>
              </div>
              {connectedNodes.length > 0 && (
                <div>
                  <div className="neo-kicker mb-1 text-muted-foreground">Connected ({connectedNodes.length})</div>
                  <div className="neo-scrollbar max-h-[160px] space-y-0.5 overflow-y-auto">
                    {connectedNodes.map(n => (
                      <div key={n.id} className="flex items-center gap-1.5">
                        <DomainMark color={domainColors[n.domain as keyof typeof domainColors]} className="size-1.5" />
                        <span className="neo-data truncate text-xs text-muted-foreground">{n.name.slice(0, 30)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="neo-data py-4 text-center text-xs text-muted-foreground">Click a node to inspect</div>
          )}
        </AnalysisPanel>
      </aside>
    </div>
  )
}
