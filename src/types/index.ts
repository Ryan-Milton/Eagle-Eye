export type EntityType = 'person' | 'vehicle' | 'location' | 'signal'
export type Confidence = 'high' | 'med' | 'low'
export type AlertSeverity = 'critical' | 'warning' | 'info'
export type ThreatLevel = 'nominal' | 'elevated' | 'critical'
export type NavView = 'Globe' | 'Objects' | 'Graph' | 'Signals' | 'Reports'
export type FilterTab = 'All' | 'Person' | 'Vehicle' | 'Signal'
export type LayerId = 'grid' | 'arcs' | 'nodes' | 'heat'

export interface Entity {
  id: string
  name: string
  type: EntityType
  icon: string
  conf: Confidence
  time: string
  lat: number
  lon: number
}

export interface FeedItem {
  id: string
  severity: AlertSeverity
  msg: string
  coord: string
  timestamp: string
}

export interface SystemStatus {
  activeTracks: number
  priority: number
  avgConfidence: number
  feedStatus: 'Live' | 'Delayed' | 'Offline'
}
