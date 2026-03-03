import type { Entity, FeedItem, SystemStatus } from '@/types'

export const ENTITIES: Entity[] = [
  { id: 'EE-001', name: 'Subject Alpha',    type: 'person',   icon: '◉', conf: 'high', time: '0:12', lat:  35.68, lon:  139.65 },
  { id: 'EE-002', name: 'Vehicle Bravo-7',  type: 'vehicle',  icon: '▲', conf: 'high', time: '0:28', lat:  51.51, lon:   -0.13 },
  { id: 'EE-003', name: 'Signal Node C-9',  type: 'signal',   icon: '⊛', conf: 'med',  time: '1:14', lat:  40.71, lon:  -74.01 },
  { id: 'EE-004', name: 'Contact Delta',    type: 'person',   icon: '◉', conf: 'low',  time: '2:33', lat:  48.86, lon:    2.35 },
  { id: 'EE-005', name: 'Vehicle Echo-2',   type: 'vehicle',  icon: '▲', conf: 'high', time: '0:05', lat:  37.77, lon: -122.42 },
  { id: 'EE-006', name: 'Site Foxtrot',     type: 'location', icon: '◆', conf: 'high', time: '5:12', lat:  55.76, lon:   37.62 },
  { id: 'EE-007', name: 'Signal Node G-4',  type: 'signal',   icon: '⊛', conf: 'med',  time: '0:44', lat:  31.23, lon:  121.47 },
  { id: 'EE-008', name: 'Subject Hotel',    type: 'person',   icon: '◉', conf: 'low',  time: '3:11', lat: -33.87, lon:  151.21 },
  { id: 'EE-009', name: 'Convoy India-1',   type: 'vehicle',  icon: '▲', conf: 'high', time: '0:09', lat:  19.08, lon:   72.88 },
  { id: 'EE-010', name: 'Signal Node J-2',  type: 'signal',   icon: '⊛', conf: 'high', time: '0:31', lat: -23.55, lon:  -46.63 },
]

export const ARC_PAIRS: [number, number][] = [
  [0, 2], [1, 4], [2, 6], [3, 5], [7, 9], [8, 0], [1, 3], [6, 9],
]

export const FEED_TEMPLATES: Omit<FeedItem, 'id' | 'timestamp'>[] = [
  { severity: 'critical', msg: 'Anomalous movement — Subject Alpha changed trajectory.',    coord: '35.6762°N  139.6503°E' },
  { severity: 'warning',  msg: 'Encrypted burst transmission on flagged frequency.',        coord: '51.5074°N  000.1278°W' },
  { severity: 'info',     msg: 'Vehicle Bravo-7 intersects with known route corridor.',     coord: '48.8566°N  002.3522°E' },
  { severity: 'critical', msg: 'Signal Node C-9 — contact lost. Last ping 4 min ago.',     coord: '40.7128°N  074.0060°W' },
  { severity: 'warning',  msg: 'Cross-ref match — Subject Hotel flagged in SIGINT record.', coord: '33.8688°S  151.2093°E' },
  { severity: 'info',     msg: 'Convoy India-1 position updated via satellite pass.',       coord: '19.0760°N  072.8777°E' },
  { severity: 'critical', msg: 'Geofence breach — Site Foxtrot perimeter triggered.',      coord: '55.7558°N  037.6176°E' },
  { severity: 'info',     msg: 'Unidentified vessel detected 40 NM outside boundary.',     coord: '22.3964°N  114.1095°E' },
]

export const SYSTEM_STATUS: SystemStatus = {
  activeTracks: 247,
  priority: 12,
  avgConfidence: 84,
  feedStatus: 'Live',
}
