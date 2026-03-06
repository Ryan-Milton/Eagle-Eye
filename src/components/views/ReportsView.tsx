import { useMemo, useCallback } from 'react'
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

export function ReportsView() {
  const satStats = useSatelliteStore(s => s.getStats)()
  const vesselCount = useVesselStore(s => s.count)
  const vesselConnected = useVesselStore(s => s.connected)
  const flightCount = useFlightStore(s => s.count)
  const flightConnected = useFlightStore(s => s.connected)
  const weatherCount = useWeatherStore(s => s.count)
  const newsCount = useNewsStore(s => s.count)
  const conflictCount = useConflictStore(s => s.count)
  const cyberCount = useCyberStore(s => s.count)
  const osintCount = useOsintStore(s => s.count)
  const portCount = usePortStore(s => s.count)
  const rfCount = useRFStore(s => s.count)
  const econCount = useEconomicStore(s => s.count)
  const alerts = useAlertStore(s => s.alerts)
  const unackCount = useAlertStore(s => s.unacknowledgedCount)

  const now = new Date()
  const report = useMemo(() => {
    const totalEntities = satStats.enabledCount + vesselCount + flightCount + weatherCount + newsCount + conflictCount + cyberCount + osintCount + portCount + rfCount + econCount
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length

    return {
      generatedAt: `${utcDateString(now)} ${utcTimeString(now)}`,
      totalEntities,
      criticalAlerts,
      sections: [
        {
          title: 'Executive Summary',
          content: `Eagle Eye is currently tracking ${totalEntities.toLocaleString()} entities across 11 intelligence domains. ${criticalAlerts > 0 ? `There are ${criticalAlerts} critical alerts requiring immediate attention.` : 'No critical alerts at this time.'} All primary data feeds are ${vesselConnected && flightConnected ? 'operational' : 'partially degraded'}.`,
        },
        {
          title: 'Space Domain',
          content: `Tracking ${satStats.enabledCount.toLocaleString()} satellites across ${satStats.constellationCount} constellations. TLE data from CelesTrak is ${satStats.lastFetchTime ? 'current' : 'unavailable'}. SGP4 propagation running at 2-second intervals.`,
        },
        {
          title: 'Maritime Domain',
          content: `${vesselCount.toLocaleString()} vessels tracked via AIS. Stream status: ${vesselConnected ? 'CONNECTED' : 'DISCONNECTED'}. Coverage includes cargo, tanker, passenger, fishing, military, tug, and pleasure craft.`,
        },
        {
          title: 'Aviation Domain',
          content: `${flightCount.toLocaleString()} aircraft tracked via ADS-B. Feed status: ${flightConnected ? 'CONNECTED' : 'DISCONNECTED'}. Coverage includes commercial, cargo, military, private, and helicopter traffic.`,
        },
        {
          title: 'Weather & Natural Events',
          content: `${weatherCount} active weather events from USGS, NASA EONET, and NWS. Monitoring earthquakes, wildfires, volcanic activity, storms, and NWS alerts.`,
        },
        {
          title: 'News Intelligence',
          content: `${newsCount} geolocated news events from GDELT. Categories: conflict, politics, disaster, economy, technology, health, environment. 24-hour rolling window.`,
        },
        {
          title: 'Conflict & Security',
          content: `${conflictCount} conflict events from ACLED and UCDP databases. Types: battles, protests, riots, explosions, violence against civilians, strategic developments.`,
        },
        {
          title: 'Cyber Threats',
          content: `${cyberCount} cyber threat indicators from AbuseIPDB and IODA. Monitoring DDoS attacks, network scans, malware distribution, internet outages, and vulnerabilities.`,
        },
        {
          title: 'Social Media OSINT',
          content: `${osintCount} geolocated social media posts from Reddit, Mastodon, and Bluesky. Location extraction via named entity matching. 5-minute polling cycle.`,
        },
        {
          title: 'Ports & Infrastructure',
          content: `${portCount} ports from World Port Index (NGA). Categorized by harbor size (large/medium/small). Visible at zoom level 4+.`,
        },
        {
          title: 'RF Spectrum',
          content: `${rfCount} RF spots from PSK Reporter, Reverse Beacon Network, and SatNOGS. Monitoring HF through SHF band transmissions with arc visualizations.`,
        },
        {
          title: 'Economic Indicators',
          content: `${econCount} economic data points from World Bank. Tracking GDP, GDP Growth, Inflation (CPI), Unemployment, and Current Account Balance across 40+ countries.`,
        },
        {
          title: 'Active Alerts',
          content: `${alerts.length} total alerts (${unackCount} unacknowledged). ${criticalAlerts} critical, ${alerts.filter(a => a.severity === 'warning').length} warnings, ${alerts.filter(a => a.severity === 'info').length} informational.`,
        },
      ],
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satStats, vesselCount, flightCount, weatherCount, newsCount, conflictCount, cyberCount, osintCount, portCount, rfCount, econCount, alerts.length])

  const handleExportMarkdown = useCallback(() => {
    let md = `# Eagle Eye Situational Awareness Report\n\n`
    md += `**Generated:** ${report.generatedAt}\n\n`
    md += `**Total Entities:** ${report.totalEntities.toLocaleString()}\n\n`
    md += `---\n\n`
    for (const section of report.sections) {
      md += `## ${section.title}\n\n${section.content}\n\n`
    }
    md += `---\n\n*Generated by Eagle Eye Geospatial Intelligence Dashboard*\n`

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eagle-eye-report-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [report])

  return (
    <div className="fixed top-[46px] left-64 right-[272px] bottom-[34px] bg-zinc-950 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-display text-lg font-bold tracking-[3px] text-zinc-50 uppercase">Situational Awareness Report</div>
            <div className="font-mono text-[12px] text-zinc-500 mt-1">Generated {report.generatedAt}</div>
          </div>
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            Export MD
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="font-mono text-[10px] text-zinc-500 uppercase">Total Entities</div>
              <div className="font-mono text-xl font-bold text-orange-400">{report.totalEntities.toLocaleString()}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-zinc-500 uppercase">Active Domains</div>
              <div className="font-mono text-xl font-bold text-green-400">8</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-zinc-500 uppercase">Alerts</div>
              <div className="font-mono text-xl font-bold text-yellow-400">{alerts.length}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-zinc-500 uppercase">Critical</div>
              <div className={`font-mono text-xl font-bold ${report.criticalAlerts > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {report.criticalAlerts}
              </div>
            </div>
          </div>
        </div>

        {report.sections.map(section => (
          <div key={section.title} className="mb-4">
            <div className="font-display text-[13px] font-semibold tracking-[2px] text-zinc-500 uppercase mb-2">{section.title}</div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <p className="font-mono text-[12px] text-zinc-300 leading-relaxed">{section.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
