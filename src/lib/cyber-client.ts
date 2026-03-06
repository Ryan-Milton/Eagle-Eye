import type { CyberEvent, CyberEventType } from '@/types'

interface AbuseIPDBEntry {
  ipAddress: string
  abuseConfidenceScore: number
  countryCode: string
  totalReports: number
  lastReportedAt: string
}

// Simple IP geolocation lookup table not feasible here.
// The server proxy adds lat/lon from a GeoIP database.
export function parseAbuseIPDB(data: {
  data?: Array<AbuseIPDBEntry & { lat?: number; lon?: number }>
}): CyberEvent[] {
  if (!data.data) return []
  return data.data
    .filter(e => e.lat != null && e.lon != null)
    .map((e, i) => ({
      id: `abuse-${e.ipAddress}-${i}`,
      type: (e.abuseConfidenceScore > 95 ? 'ddos' : 'scan') as CyberEventType,
      title: `Abuse report: ${e.ipAddress} (${e.countryCode})`,
      description: `${e.totalReports} reports, confidence ${e.abuseConfidenceScore}%`,
      ip: e.ipAddress,
      lat: e.lat!,
      lon: e.lon!,
      severity: Math.min(10, Math.round(e.abuseConfidenceScore / 10)),
      source: 'abuseipdb' as const,
      time: new Date(e.lastReportedAt).getTime(),
      lastUpdate: Date.now(),
    }))
}

interface IODASignal {
  entityType: string
  entityCode: string
  entityName: string
  datasource: string
  from: number
  until: number
  level: string
}

export function parseIODASignals(data: { data?: IODASignal[] }, geoLookup: Map<string, { lat: number; lon: number }>): CyberEvent[] {
  if (!data.data) return []
  return data.data
    .filter(e => {
      const geo = geoLookup.get(e.entityCode)
      return geo != null && e.level === 'critical'
    })
    .map(e => {
      const geo = geoLookup.get(e.entityCode)!
      return {
        id: `ioda-${e.entityCode}-${e.from}`,
        type: 'outage' as CyberEventType,
        title: `Internet outage: ${e.entityName}`,
        description: `${e.datasource} detected ${e.level} outage`,
        ip: null,
        lat: geo.lat,
        lon: geo.lon,
        severity: 8,
        source: 'ioda' as const,
        time: e.from * 1000,
        lastUpdate: Date.now(),
      }
    })
}
