import { useMemo, useCallback, type ReactNode } from 'react'
import { utcTimeString, utcDateString } from '@/lib/utils'
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
import { DOMAIN_HEX_COLORS, CHART_TOOLTIP_STYLE, CHART_BAR_STYLE, activeBarGrow } from '@/lib/chart-theme'
import { Button } from '@/components/ui/button'
import { Stat } from '@/components/ui/stat'
import { AnalysisChartRegion, AnalysisHeader, AnalysisPanel, AnalysisSectionTitle } from './shared/AnalysisPrimitives'
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

// ─── Helper: group a Map's values by a field and count occurrences ─────────
function groupBy<T>(map: Map<string | number, T>, field: keyof T): { name: string; value: number }[] {
  const counts: Record<string, number> = {}
  map.forEach(item => {
    const key = String(item[field] ?? 'unknown')
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

// ─── Mini chart colors (cycle through a palette) ──────────────────────────
const MINI_COLORS = [
  DOMAIN_HEX_COLORS.satellite,
  DOMAIN_HEX_COLORS.vessel,
  DOMAIN_HEX_COLORS.flight,
  DOMAIN_HEX_COLORS.weather,
  DOMAIN_HEX_COLORS.news,
  DOMAIN_HEX_COLORS.cyber,
  DOMAIN_HEX_COLORS.osint,
  DOMAIN_HEX_COLORS.port,
  DOMAIN_HEX_COLORS.rf,
  DOMAIN_HEX_COLORS.economic,
]

// ─── ReportSection local component ─────────────────────────────────────────
function ReportSection({ title, content, chart }: { title: string; content: string; chart?: ReactNode }) {
  return (
    <div className="mb-4">
      <AnalysisPanel>
        <AnalysisSectionTitle className="m-4">{title}</AnalysisSectionTitle>
        <p className="border-t border-line-muted p-4 font-mono text-xs leading-relaxed text-foreground">{content}</p>
        {chart ? <AnalysisChartRegion>{chart}</AnalysisChartRegion> : null}
      </AnalysisPanel>
    </div>
  )
}

// ─── Mini PieChart ─────────────────────────────────────────────────────────
function MiniPie({ data }: { data: { name: string; value: number }[] }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={120}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={20} strokeWidth={0} fontSize={10}>
          {data.map((_, i) => (
            <Cell key={i} fill={MINI_COLORS[i % MINI_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...CHART_TOOLTIP_STYLE} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Mini horizontal BarChart ──────────────────────────────────────────────
function MiniBar({ data, color }: { data: { name: string; value: number }[]; color: string }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 24)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'var(--muted-foreground)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip {...CHART_TOOLTIP_STYLE} />
        <Bar dataKey="value" fill={color} {...CHART_BAR_STYLE} barSize={14} activeBar={activeBarGrow} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Main component ────────────────────────────────────────────────────────
export function ReportsView() {
  const satStats = useSatelliteStore(s => s.getStats)()
  const vessels = useVesselStore(s => s.vessels)
  const vesselCount = useVesselStore(s => s.count)
  const vesselConnected = useVesselStore(s => s.connected)
  const flights = useFlightStore(s => s.flights)
  const flightCount = useFlightStore(s => s.count)
  const flightConnected = useFlightStore(s => s.connected)
  const weatherEvents = useWeatherStore(s => s.events)
  const weatherCount = useWeatherStore(s => s.count)
  const newsEvents = useNewsStore(s => s.events)
  const newsCount = useNewsStore(s => s.count)
  const conflictEvents = useConflictStore(s => s.events)
  const conflictCount = useConflictStore(s => s.count)
  const cyberEvents = useCyberStore(s => s.events)
  const cyberCount = useCyberStore(s => s.count)
  const osintPosts = useOsintStore(s => s.posts)
  const osintCount = useOsintStore(s => s.count)
  const ports = usePortStore(s => s.ports)
  const portCount = usePortStore(s => s.count)
  const rfSpots = useRFStore(s => s.spots)
  const rfCount = useRFStore(s => s.count)
  const econCount = useEconomicStore(s => s.count)
  const alerts = useAlertStore(s => s.alerts)
  const unackCount = useAlertStore(s => s.unacknowledgedCount)

  const now = new Date()

  // ─── Computed breakdowns ───────────────────────────────────────────────
  const vesselTypes = useMemo(() => groupBy(vessels, 'type'), [vessels])
  const flightTypes = useMemo(() => groupBy(flights, 'type'), [flights])
  const weatherTypes = useMemo(() => groupBy(weatherEvents, 'type'), [weatherEvents])
  const newsCategories = useMemo(() => groupBy(newsEvents, 'category'), [newsEvents])
  const conflictTypes = useMemo(() => groupBy(conflictEvents, 'type'), [conflictEvents])
  const cyberTypes = useMemo(() => groupBy(cyberEvents, 'type'), [cyberEvents])
  const osintPlatforms = useMemo(() => groupBy(osintPosts, 'platform'), [osintPosts])
  const portSizes = useMemo(() => groupBy(ports, 'size'), [ports])
  const rfSources = useMemo(() => groupBy(rfSpots, 'source'), [rfSpots])

  const report = useMemo(() => {
    const totalEntities = satStats.enabledCount + vesselCount + flightCount + weatherCount + newsCount + conflictCount + cyberCount + osintCount + portCount + rfCount + econCount
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length
    const cyberHighSeverity = Array.from(cyberEvents.values()).filter(e => e.severity >= 7).length

    // Threat level calculation
    const threatScore = (criticalAlerts * 10 + warningAlerts * 3 + cyberHighSeverity * 2 + conflictCount) / Math.max(totalEntities, 1)
    let threatLevel: { label: string; color: string }
    if (threatScore < 0.5) threatLevel = { label: 'LOW', color: 'text-success' }
    else if (threatScore < 2) threatLevel = { label: 'MODERATE', color: 'text-warning' }
    else if (threatScore < 5) threatLevel = { label: 'HIGH', color: 'text-signal' }
    else threatLevel = { label: 'CRITICAL', color: 'text-danger' }

    // Active domains count
    const domainCounts = [satStats.enabledCount, vesselCount, flightCount, weatherCount, newsCount, conflictCount, cyberCount, osintCount, portCount, rfCount, econCount]
    const activeDomains = domainCounts.filter(c => c > 0).length

    return {
      generatedAt: `${utcDateString(now)} ${utcTimeString(now)}`,
      totalEntities,
      criticalAlerts,
      warningAlerts,
      activeDomains,
      threatLevel,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satStats, vesselCount, flightCount, weatherCount, newsCount, conflictCount, cyberCount, osintCount, portCount, rfCount, econCount, alerts.length, cyberEvents])

  // ─── Radar chart data ─────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const domainRaw = [
      { domain: 'SAT', count: satStats.enabledCount },
      { domain: 'AIS', count: vesselCount },
      { domain: 'ADSB', count: flightCount },
      { domain: 'WX', count: weatherCount },
      { domain: 'NEWS', count: newsCount },
      { domain: 'CON', count: conflictCount },
      { domain: 'CYB', count: cyberCount },
      { domain: 'OSINT', count: osintCount },
      { domain: 'PORT', count: portCount },
      { domain: 'RF', count: rfCount },
      { domain: 'ECON', count: econCount },
    ]
    const maxCount = Math.max(...domainRaw.map(d => d.count), 1)
    return domainRaw.map(d => ({ domain: d.domain, level: Math.round((d.count / maxCount) * 100) }))
  }, [satStats.enabledCount, vesselCount, flightCount, weatherCount, newsCount, conflictCount, cyberCount, osintCount, portCount, rfCount, econCount])

  // ─── Alert severity breakdown ──────────────────────────────────────────
  const alertSeverityData = useMemo(() => {
    const info = alerts.filter(a => a.severity === 'info').length
    const warning = alerts.filter(a => a.severity === 'warning').length
    const critical = alerts.filter(a => a.severity === 'critical').length
    return [
      { name: 'Info', value: info },
      { name: 'Warning', value: warning },
      { name: 'Critical', value: critical },
    ].filter(d => d.value > 0)
  }, [alerts])

  const recentCriticalAlerts = useMemo(() => {
    return alerts
      .filter(a => a.severity === 'critical' || a.severity === 'warning')
      .sort((a, b) => b.time - a.time)
      .slice(0, 5)
  }, [alerts])

  // ─── Export markdown ───────────────────────────────────────────────────
  const handleExportMarkdown = useCallback(() => {
    let md = `# Eagle Eye Situational Awareness Report\n\n`
    md += `**Generated:** ${report.generatedAt}\n\n`
    md += `**Total Entities:** ${report.totalEntities.toLocaleString()}\n`
    md += `**Active Domains:** ${report.activeDomains}\n`
    md += `**Alerts:** ${alerts.length} (${report.criticalAlerts} critical, ${report.warningAlerts} warning)\n`
    md += `**Threat Level:** ${report.threatLevel.label}\n\n`
    md += `---\n\n`
    md += `## Executive Summary\n\nEagle Eye is currently tracking ${report.totalEntities.toLocaleString()} entities across ${report.activeDomains} intelligence domains. ${report.criticalAlerts > 0 ? `There are ${report.criticalAlerts} critical alerts requiring immediate attention.` : 'No critical alerts at this time.'} All primary data feeds are ${vesselConnected && flightConnected ? 'operational' : 'partially degraded'}.\n\n`
    md += `## Space Domain\n\nTracking ${satStats.enabledCount.toLocaleString()} satellites across ${satStats.constellationCount} constellations. TLE data from CelesTrak is ${satStats.lastFetchTime ? 'current' : 'unavailable'}. SGP4 propagation running at 2-second intervals.\n\n`
    md += `## Maritime Domain\n\n${vesselCount.toLocaleString()} vessels tracked via AIS. Stream status: ${vesselConnected ? 'CONNECTED' : 'DISCONNECTED'}.\n\n`
    md += `## Aviation Domain\n\n${flightCount.toLocaleString()} aircraft tracked via ADS-B. Feed status: ${flightConnected ? 'CONNECTED' : 'DISCONNECTED'}.\n\n`
    md += `## Weather & Natural Events\n\n${weatherCount} active weather events from USGS, NASA EONET, and NWS.\n\n`
    md += `## News Intelligence\n\n${newsCount} geolocated news events from GDELT.\n\n`
    md += `## Conflict & Security\n\n${conflictCount} conflict events from ACLED and UCDP databases.\n\n`
    md += `## Cyber Threats\n\n${cyberCount} cyber threat indicators from AbuseIPDB and IODA.\n\n`
    md += `## Social Media OSINT\n\n${osintCount} geolocated social media posts.\n\n`
    md += `## Ports & Infrastructure\n\n${portCount} ports from World Port Index (NGA).\n\n`
    md += `## RF Spectrum\n\n${rfCount} RF spots from PSK Reporter, Reverse Beacon Network, and SatNOGS.\n\n`
    md += `## Economic Indicators\n\n${econCount} economic data points from World Bank.\n\n`
    md += `## Active Alerts\n\n${alerts.length} total alerts (${unackCount} unacknowledged). ${report.criticalAlerts} critical, ${report.warningAlerts} warnings, ${alerts.filter(a => a.severity === 'info').length} informational.\n\n`
    md += `---\n\n*Generated by Eagle Eye Geospatial Intelligence Dashboard*\n`

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eagle-eye-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [report, alerts, unackCount, satStats, vesselCount, vesselConnected, flightCount, flightConnected, weatherCount, newsCount, conflictCount, cyberCount, osintCount, portCount, rfCount, econCount])

  const ALERT_COLORS: Record<string, string> = { Info: 'var(--info)', Warning: 'var(--warning)', Critical: 'var(--danger)' }

  return (
    <div className="neo-scrollbar h-full min-h-0 overflow-y-auto bg-background text-foreground">
      <AnalysisHeader
        eyebrow="Analysis / Reports"
        title="Situational Awareness Report"
        detail={`Generated ${report.generatedAt}`}
        action={(
          <Button
            type="button"
            onClick={handleExportMarkdown}
            variant="signal"
            size="sm"
          >
            Export MD
          </Button>
        )}
      />
      <div className="mx-auto max-w-5xl p-3 sm:p-6">

        {/* ─── Stats Bar ───────────────────────────────────────────────── */}
        <AnalysisPanel className="mb-6 p-4">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Total Entities" value={report.totalEntities.toLocaleString()} />
            <Stat label="Active Domains" value={report.activeDomains} detail="of 11 monitored" />
            <Stat label="Alerts" value={alerts.length} detail={`${unackCount} unacknowledged`} />
            <Stat label="Critical" value={<span className={report.criticalAlerts > 0 ? 'text-danger' : 'text-muted-foreground'}>{report.criticalAlerts}</span>} signal={report.criticalAlerts > 0} />
            <Stat label="Threat Level" value={<span className={report.threatLevel.color}>{report.threatLevel.label}</span>} />
          </div>
        </AnalysisPanel>

        {/* ─── Executive Summary + Radar ───────────────────────────────── */}
        <AnalysisPanel className="mb-4">
          <AnalysisSectionTitle className="m-4">Executive Summary</AnalysisSectionTitle>
          <div className="grid border-t border-line-muted lg:grid-cols-[1fr_18rem]">
              <div className="flex-1">
                <p className="p-4 font-mono text-xs leading-relaxed text-foreground">
                  Eagle Eye is currently tracking {report.totalEntities.toLocaleString()} entities across {report.activeDomains} intelligence domains.{' '}
                  {report.criticalAlerts > 0
                    ? `There are ${report.criticalAlerts} critical alerts requiring immediate attention.`
                    : 'No critical alerts at this time.'}{' '}
                  All primary data feeds are {vesselConnected && flightConnected ? 'operational' : 'partially degraded'}.
                  Threat level is assessed as <span className={`font-bold ${report.threatLevel.color}`}>{report.threatLevel.label}</span>.
                </p>
              </div>
              <AnalysisChartRegion className="h-56 border-l-0 lg:border-l">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--line-muted)" />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: 'var(--muted-foreground)', fontFamily: '"IBM Plex Mono", monospace', fontSize: 9 }} />
                    <Radar dataKey="level" stroke={DOMAIN_HEX_COLORS.satellite} fill={DOMAIN_HEX_COLORS.satellite} fillOpacity={0.25} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                  </RadarChart>
                </ResponsiveContainer>
              </AnalysisChartRegion>
          </div>
        </AnalysisPanel>

        {/* ─── Domain Report Sections ──────────────────────────────────── */}
        <ReportSection
          title="Maritime Domain"
          content={`${vesselCount.toLocaleString()} vessels tracked via AIS. Stream status: ${vesselConnected ? 'CONNECTED' : 'DISCONNECTED'}. Coverage includes cargo, tanker, passenger, fishing, military, tug, and pleasure craft.`}
          chart={vesselTypes.length > 0 ? <MiniPie data={vesselTypes} /> : undefined}
        />

        <ReportSection
          title="Aviation Domain"
          content={`${flightCount.toLocaleString()} aircraft tracked via ADS-B. Feed status: ${flightConnected ? 'CONNECTED' : 'DISCONNECTED'}. Coverage includes commercial, cargo, military, private, and helicopter traffic.`}
          chart={flightTypes.length > 0 ? <MiniPie data={flightTypes} /> : undefined}
        />

        <ReportSection
          title="Weather & Natural Events"
          content={`${weatherCount} active weather events from USGS, NASA EONET, and NWS. Monitoring earthquakes, wildfires, volcanic activity, storms, and NWS alerts.`}
          chart={weatherTypes.length > 0 ? <MiniBar data={weatherTypes} color={DOMAIN_HEX_COLORS.weather} /> : undefined}
        />

        <ReportSection
          title="News Intelligence"
          content={`${newsCount} geolocated news events from GDELT. Categories: conflict, politics, disaster, economy, technology, health, environment. 24-hour rolling window.`}
          chart={newsCategories.length > 0 ? <MiniBar data={newsCategories} color={DOMAIN_HEX_COLORS.news} /> : undefined}
        />

        <ReportSection
          title="Conflict & Security"
          content={`${conflictCount} conflict events from ACLED and UCDP databases. Types: battles, protests, riots, explosions, violence against civilians, strategic developments.`}
          chart={conflictTypes.length > 0 ? <MiniBar data={conflictTypes} color={DOMAIN_HEX_COLORS.conflict} /> : undefined}
        />

        <ReportSection
          title="Cyber Threats"
          content={`${cyberCount} cyber threat indicators from AbuseIPDB and IODA. Monitoring DDoS attacks, network scans, malware distribution, internet outages, and vulnerabilities.`}
          chart={cyberTypes.length > 0 ? <MiniBar data={cyberTypes} color={DOMAIN_HEX_COLORS.cyber} /> : undefined}
        />

        <ReportSection
          title="Social Media OSINT"
          content={`${osintCount} geolocated social media posts from Reddit, Mastodon, and Bluesky. Location extraction via named entity matching. 5-minute polling cycle.`}
          chart={osintPlatforms.length > 0 ? <MiniPie data={osintPlatforms} /> : undefined}
        />

        <ReportSection
          title="Ports & Infrastructure"
          content={`${portCount} ports from World Port Index (NGA). Categorized by harbor size (large/medium/small). Visible at zoom level 4+.`}
          chart={portSizes.length > 0 ? <MiniPie data={portSizes} /> : undefined}
        />

        <ReportSection
          title="RF Spectrum"
          content={`${rfCount} RF spots from PSK Reporter, Reverse Beacon Network, and SatNOGS. Monitoring HF through SHF band transmissions with arc visualizations.`}
          chart={rfSources.length > 0 ? <MiniPie data={rfSources} /> : undefined}
        />

        <ReportSection
          title="Space Domain"
          content={`Tracking ${satStats.enabledCount.toLocaleString()} satellites across ${satStats.constellationCount} constellations. TLE data from CelesTrak is ${satStats.lastFetchTime ? 'current' : 'unavailable'}. SGP4 propagation running at 2-second intervals.`}
        />

        <ReportSection
          title="Economic Indicators"
          content={`${econCount} economic data points from World Bank. Tracking GDP, GDP Growth, Inflation (CPI), Unemployment, and Current Account Balance across 40+ countries.`}
        />

        {/* ─── Alert Summary ──────────────────────────────────────────── */}
        <AnalysisPanel className="mb-4">
          <AnalysisSectionTitle className="m-4">Alert Summary</AnalysisSectionTitle>
          <div className="grid border-t border-line-muted md:grid-cols-[14rem_1fr]">
              <AnalysisChartRegion className="h-[150px] border-t-0 md:border-r">
                {alertSeverityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={alertSeverityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={45} innerRadius={20} strokeWidth={0} fontSize={10}>
                        {alertSeverityData.map((entry) => (
                          <Cell key={entry.name} fill={ALERT_COLORS[entry.name] || 'var(--muted-foreground)'} />
                        ))}
                      </Pie>
                      <Tooltip {...CHART_TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="neo-data flex h-full items-center justify-center text-xs text-muted-foreground">No alerts</div>
                )}
              </AnalysisChartRegion>
              <div className="p-4">
                <div className="neo-kicker mb-2 text-muted-foreground">
                  {alerts.length} total ({unackCount} unacknowledged)
                </div>
                {recentCriticalAlerts.length > 0 ? (
                  <div className="space-y-1.5">
                    {recentCriticalAlerts.map(a => (
                      <div key={a.id} className="flex items-start gap-2">
                        <span className={`mt-0.5 inline-block size-1.5 flex-shrink-0 border border-current ${a.severity === 'critical' ? 'bg-danger text-danger' : 'bg-warning text-warning'}`} />
                        <div>
                          <div className="font-mono text-xs text-foreground">{a.title}</div>
                          <div className="neo-data text-[10px] text-muted-foreground">{new Date(a.time).toISOString().slice(11, 19)}Z - {a.domain}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="neo-data text-xs text-muted-foreground">No critical or warning alerts</div>
                )}
              </div>
          </div>
        </AnalysisPanel>

      </div>
    </div>
  )
}
