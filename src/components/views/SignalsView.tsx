import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'
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
import { useAlertStore } from '@/stores/alert-store'
import { useCameraStore } from '@/stores/camera-store'
import {
  DOMAIN_HEX_COLORS,
  DOMAIN_LABELS,
  CHART_TOOLTIP_STYLE,
  CHART_AXIS_STYLE,
  CHART_GRID_STYLE,
  CHART_BAR_STYLE,
  activeBarGrow,
} from '@/lib/chart-theme'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'
import { AnalysisChartRegion, AnalysisHeader, AnalysisPanel, AnalysisSectionTitle } from './shared/AnalysisPrimitives'

const SEVERITY_COLORS: Record<string, string> = {
  info: 'var(--info)',
  warning: 'var(--warning)',
  critical: 'var(--danger)',
}

export function SignalsView() {
  // --- Store subscriptions ---
  const satStats = useSatelliteStore(s => s.getStats)()
  const satLastFetch = useSatelliteStore(s => s.getStats)().lastFetchTime

  const vesselCount = useVesselStore(s => s.count)
  const vesselConnected = useVesselStore(s => s.connected)

  const flightCount = useFlightStore(s => s.count)
  const flightConnected = useFlightStore(s => s.connected)

  const weatherCount = useWeatherStore(s => s.count)
  const weatherLastFetch = useWeatherStore(s => s.lastFetch)

  const newsCount = useNewsStore(s => s.count)
  const newsLastFetch = useNewsStore(s => s.lastFetch)

  const conflictCount = useConflictStore(s => s.count)
  const conflictLastFetch = useConflictStore(s => s.lastFetch)
  const conflictEvents = useConflictStore(s => s.events)

  const cyberCount = useCyberStore(s => s.count)
  const cyberLastFetch = useCyberStore(s => s.lastFetch)
  const cyberEvents = useCyberStore(s => s.events)

  const osintCount = useOsintStore(s => s.count)
  const osintLastFetch = useOsintStore(s => s.lastFetch)

  const portCount = usePortStore(s => s.count)
  const portLastFetch = usePortStore(s => s.lastFetch)

  const rfCount = useRFStore(s => s.count)
  const rfLastFetch = useRFStore(s => s.lastFetch)

  const econCount = useEconomicStore(s => s.count)
  const econLastFetch = useEconomicStore(s => s.lastFetch)

  const alerts = useAlertStore(s => s.alerts)
  const unackCount = useAlertStore(s => s.unacknowledgedCount)
  const acknowledgeAll = useAlertStore(s => s.acknowledgeAll)

  const cameraCount = useCameraStore(s => s.count)
  const cameraLastFetch = useCameraStore(s => s.lastFetch)

  // --- Computed values ---

  const domainCounts: Record<string, number> = useMemo(() => ({
    satellite: satStats.enabledCount,
    vessel: vesselCount,
    flight: flightCount,
    weather: weatherCount,
    news: newsCount,
    conflict: conflictCount,
    cyber: cyberCount,
    osint: osintCount,
    port: portCount,
    rf: rfCount,
    economic: econCount,
  }), [satStats.enabledCount, vesselCount, flightCount, weatherCount, newsCount, conflictCount, cyberCount, osintCount, portCount, rfCount, econCount])

  const totalEntities = useMemo(() => Object.values(domainCounts).reduce((a, b) => a + b, 0), [domainCounts])

  const activeSources = useMemo(() => Object.values(domainCounts).filter(c => c > 0).length, [domainCounts])

  // Row 2: Domain bar chart data
  const domainBarData = useMemo(() =>
    Object.entries(domainCounts).map(([key, value]) => ({
      domain: key,
      label: DOMAIN_LABELS[key],
      count: value,
      fill: DOMAIN_HEX_COLORS[key],
    })),
    [domainCounts],
  )

  // Row 3 Left: Alert timeline buckets (last hour, 5-min buckets = 12 buckets)
  const alertTimelineData = useMemo(() => {
    const now = Date.now()
    const hourAgo = now - 60 * 60 * 1000
    const bucketSize = 5 * 60 * 1000
    const buckets: Array<{ time: string; info: number; warning: number; critical: number }> = []

    for (let i = 0; i < 12; i++) {
      const bucketStart = hourAgo + i * bucketSize
      const bucketEnd = bucketStart + bucketSize
      const label = new Date(bucketEnd).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

      const bucket = { time: label, info: 0, warning: 0, critical: 0 }
      for (const a of alerts) {
        if (a.time >= bucketStart && a.time < bucketEnd) {
          bucket[a.severity]++
        }
      }
      buckets.push(bucket)
    }
    return buckets
  }, [alerts])

  // Row 3 Right: Alert severity pie data
  const alertSeverityData = useMemo(() => {
    const counts = { info: 0, warning: 0, critical: 0 }
    for (const a of alerts) counts[a.severity]++
    return [
      { name: 'Info', value: counts.info, fill: SEVERITY_COLORS.info },
      { name: 'Warning', value: counts.warning, fill: SEVERITY_COLORS.warning },
      { name: 'Critical', value: counts.critical, fill: SEVERITY_COLORS.critical },
    ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.length])

  // Row 4 Left: Cyber events by type
  const cyberByType = useMemo(() => {
    const counts: Record<string, number> = { ddos: 0, scan: 0, malware: 0, outage: 0, vulnerability: 0 }
    for (const [, ev] of cyberEvents) counts[ev.type] = (counts[ev.type] || 0) + 1
    return Object.entries(counts).map(([type, count]) => ({
      type: type.toUpperCase(),
      count,
    }))
  }, [cyberEvents])

  // Row 4 Right: Conflict events by type
  const conflictByType = useMemo(() => {
    const counts: Record<string, { count: number; fatalities: number }> = {}
    for (const t of ['battle', 'protest', 'riot', 'explosion', 'violence', 'strategic']) {
      counts[t] = { count: 0, fatalities: 0 }
    }
    for (const [, ev] of conflictEvents) {
      if (!counts[ev.type]) counts[ev.type] = { count: 0, fatalities: 0 }
      counts[ev.type].count++
      counts[ev.type].fatalities += ev.fatalities || 0
    }
    return Object.entries(counts).map(([type, data]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count: data.count,
      fatalities: data.fatalities,
    }))
  }, [conflictEvents])

  // Row 5: Feed health sources
  const feedHealthSources = useMemo(() => {
    const now = Date.now()
    const staleThreshold = 10 * 60 * 1000

    function getStatus(count: number, lastFetch: number | null, connected?: boolean): 'green' | 'amber' | 'red' {
      if (connected !== undefined) {
        if (connected && count > 0) return 'green'
        if (connected || count > 0) return 'amber'
        return 'red'
      }
      if (count > 0 && lastFetch && (now - lastFetch) < staleThreshold) return 'green'
      if (count > 0 || (lastFetch && (now - lastFetch) < staleThreshold)) return 'amber'
      return 'red'
    }

    return [
      { key: 'satellite', label: 'SAT', count: satStats.enabledCount, status: getStatus(satStats.enabledCount, satLastFetch) },
      { key: 'vessel', label: 'AIS', count: vesselCount, status: getStatus(vesselCount, null, vesselConnected) },
      { key: 'flight', label: 'ADSB', count: flightCount, status: getStatus(flightCount, null, flightConnected) },
      { key: 'weather', label: 'WX', count: weatherCount, status: getStatus(weatherCount, weatherLastFetch) },
      { key: 'news', label: 'NEWS', count: newsCount, status: getStatus(newsCount, newsLastFetch) },
      { key: 'conflict', label: 'CON', count: conflictCount, status: getStatus(conflictCount, conflictLastFetch) },
      { key: 'cyber', label: 'CYB', count: cyberCount, status: getStatus(cyberCount, cyberLastFetch) },
      { key: 'osint', label: 'OSINT', count: osintCount, status: getStatus(osintCount, osintLastFetch) },
      { key: 'port', label: 'PORT', count: portCount, status: getStatus(portCount, portLastFetch) },
      { key: 'rf', label: 'RF', count: rfCount, status: getStatus(rfCount, rfLastFetch) },
      { key: 'economic', label: 'ECON', count: econCount, status: getStatus(econCount, econLastFetch) },
      { key: 'camera', label: 'CAM', count: cameraCount, status: getStatus(cameraCount, cameraLastFetch) },
    ]
  }, [
    satStats.enabledCount, satLastFetch,
    vesselCount, vesselConnected,
    flightCount, flightConnected,
    weatherCount, weatherLastFetch,
    newsCount, newsLastFetch,
    conflictCount, conflictLastFetch,
    cyberCount, cyberLastFetch,
    osintCount, osintLastFetch,
    portCount, portLastFetch,
    rfCount, rfLastFetch,
    econCount, econLastFetch,
    cameraCount, cameraLastFetch,
  ])

  const statusDotColor = { green: 'bg-success', amber: 'bg-warning', red: 'bg-danger' }

  return (
    <div className="neo-scrollbar h-full min-h-0 overflow-y-auto bg-background text-foreground">
      <AnalysisHeader eyebrow="Analysis / Signals" title="Signals Dashboard" detail={`${activeSources} active intelligence sources`} />
      <div className="p-3 sm:p-4">

      {/* Row 1: KPI Cards */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <AnalysisPanel className="p-4"><Stat label="Total Entities" value={totalEntities.toLocaleString()} /></AnalysisPanel>
        <AnalysisPanel className="p-4"><Stat label="Active Sources" value={`${activeSources}/11`} detail="Domain feeds reporting" /></AnalysisPanel>
        <AnalysisPanel className="p-4"><Stat label="Alerts" value={alerts.length} detail="Current alert ledger" /></AnalysisPanel>
        <AnalysisPanel className="flex items-center justify-between gap-3 p-4">
          <Stat label="Unacknowledged" value={<span className={unackCount > 0 ? 'text-danger' : 'text-muted-foreground'}>{unackCount}</span>} signal={unackCount > 0} />
            {unackCount > 0 && (
              <Button
                type="button"
                onClick={acknowledgeAll}
                variant="danger"
                size="sm"
              >
                ACK ALL
              </Button>
            )}
        </AnalysisPanel>
      </div>

      {/* Row 2: Domain Activity Bar Chart */}
      <AnalysisPanel className="mb-4">
        <AnalysisSectionTitle className="m-4">Entities by Domain</AnalysisSectionTitle>
        <AnalysisChartRegion className="overflow-x-auto">
          <div className="h-[220px] min-w-[680px]">
            <ResponsiveContainer width="100%" height="100%">
          <BarChart data={domainBarData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid {...CHART_GRID_STYLE} />
            <XAxis dataKey="label" {...CHART_AXIS_STYLE} />
            <YAxis {...CHART_AXIS_STYLE} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Bar dataKey="count" {...CHART_BAR_STYLE} activeBar={activeBarGrow}>
              {domainBarData.map((entry) => (
                <Cell key={entry.domain} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalysisChartRegion>
      </AnalysisPanel>

      {/* Row 3: Alert Analysis */}
      <AnalysisSectionTitle className="mb-3">Alert Analysis</AnalysisSectionTitle>
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Alert Timeline */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-4">Alert Timeline (Last Hour)</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={alertTimelineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="time" {...CHART_AXIS_STYLE} />
              <YAxis {...CHART_AXIS_STYLE} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="critical" stackId="1" stroke="var(--danger)" fill="var(--danger)" fillOpacity={0.24} />
              <Area type="monotone" dataKey="warning" stackId="1" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.2} />
              <Area type="monotone" dataKey="info" stackId="1" stroke="var(--info)" fill="var(--info)" fillOpacity={0.18} />
            </AreaChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Alert Severity Breakdown */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-4">Alert Severity Breakdown</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={alertSeverityData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                isAnimationActive={false}
              >
                {alertSeverityData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} />
            </PieChart>
            </ResponsiveContainer>
          </AnalysisChartRegion>
          <div className="flex flex-wrap justify-center gap-4 border-t border-line-muted p-3">
            {alertSeverityData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 border border-line" style={{ backgroundColor: d.fill }} />
                <span className="neo-kicker text-muted-foreground">{d.name}</span>
                <span className="neo-data text-xs text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </AnalysisPanel>
      </div>

      {/* Row 4: Threat Breakdown */}
      <AnalysisSectionTitle className="mb-3">Threat Breakdown</AnalysisSectionTitle>
      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Cyber Threats by Type */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-4">Cyber Threats by Type</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-[230px] overflow-x-auto">
            <div className="h-full min-w-[420px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={cyberByType} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="type" {...CHART_AXIS_STYLE} />
              <YAxis {...CHART_AXIS_STYLE} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={DOMAIN_HEX_COLORS.cyber} {...CHART_BAR_STYLE} activeBar={activeBarGrow} />
            </BarChart>
            </ResponsiveContainer></div>
          </AnalysisChartRegion>
        </AnalysisPanel>

        {/* Conflict Events by Type */}
        <AnalysisPanel>
          <AnalysisSectionTitle className="m-4">Conflict Events by Type</AnalysisSectionTitle>
          <AnalysisChartRegion className="h-[230px] overflow-x-auto">
            <div className="h-full min-w-[480px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={conflictByType} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis dataKey="type" {...CHART_AXIS_STYLE} />
              <YAxis {...CHART_AXIS_STYLE} allowDecimals={false} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(value, name) => {
                  if (name === 'count') return [value, 'Events']
                  if (name === 'fatalities') return [value, 'Fatalities']
                  return [value, name]
                }}
              />
              <Bar dataKey="count" fill={DOMAIN_HEX_COLORS.conflict} {...CHART_BAR_STYLE} activeBar={activeBarGrow} />
              <Bar dataKey="fatalities" fill="var(--signal-red)" {...CHART_BAR_STYLE} activeBar={activeBarGrow} />
            </BarChart>
            </ResponsiveContainer></div>
          </AnalysisChartRegion>
        </AnalysisPanel>
      </div>

      {/* Row 5: Feed Health */}
      <AnalysisSectionTitle className="mb-3">Feed Health</AnalysisSectionTitle>
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {feedHealthSources.map((source) => (
          <AnalysisPanel key={source.key} className="flex items-center gap-3 p-3 sm:p-4">
            <div className={`size-2.5 border border-current ${statusDotColor[source.status]} shrink-0`} />
            <div className="min-w-0 flex-1">
              <div className="neo-kicker text-muted-foreground">{source.label}</div>
              <div className="neo-data text-lg text-foreground">{source.count.toLocaleString()}</div>
            </div>
          </AnalysisPanel>
        ))}
      </div>
      </div>
    </div>
  )
}
