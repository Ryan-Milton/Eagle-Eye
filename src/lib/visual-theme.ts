export type VisualThemeName = 'signal' | 'schematic'

export const DOMAIN_KEYS = [
  'satellite',
  'vessel',
  'flight',
  'weather',
  'news',
  'conflict',
  'cyber',
  'osint',
  'port',
  'rf',
  'economic',
  'camera',
  'infrastructure',
  'geofence',
  'alert',
  'watchlist',
] as const

export type VisualDomain = (typeof DOMAIN_KEYS)[number]
export type DomainColors = Readonly<Record<VisualDomain, string>>

export interface VisualTheme {
  readonly background: string
  readonly foreground: string
  readonly panel: string
  readonly panelRaised: string
  readonly panelSubtle: string
  readonly muted: string
  readonly mutedForeground: string
  readonly line: string
  readonly lineMuted: string
  readonly input: string
  readonly signal: string
  readonly signalForeground: string
  readonly signalSoft: string
  readonly signalRed: string
  readonly signalBlue: string
  readonly success: string
  readonly warning: string
  readonly danger: string
  readonly info: string
  readonly focus: string
  readonly overlay: string
  readonly shadowColor: string
  readonly noiseOpacity: number
  readonly domains: DomainColors
}

const SIGNAL_DOMAINS = {
  satellite: '#f97316',
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
  camera: '#38bdf8',
  infrastructure: '#94a3b8',
  geofence: '#f59e0b',
  alert: '#e54b4b',
  watchlist: '#fb923c',
} as const satisfies DomainColors

const SCHEMATIC_DOMAINS = {
  satellite: '#a23b00',
  vessel: '#006779',
  flight: '#795b00',
  weather: '#2f6b25',
  news: '#9e2146',
  conflict: '#a51d29',
  cyber: '#6b2a91',
  osint: '#006e67',
  port: '#254db5',
  rf: '#56348b',
  economic: '#1f704d',
  camera: '#17658a',
  infrastructure: '#475569',
  geofence: '#8b5200',
  alert: '#a51d29',
  watchlist: '#a4470c',
} as const satisfies DomainColors

const VISUAL_THEMES = {
  signal: {
    background: '#050505',
    foreground: '#f7f7f2',
    panel: '#0b0b0c',
    panelRaised: '#111214',
    panelSubtle: '#17181b',
    muted: '#202125',
    mutedForeground: '#9a9ca2',
    line: '#e2e3e5',
    lineMuted: '#45474d',
    input: '#2a2b30',
    signal: '#f2c300',
    signalForeground: '#080808',
    signalSoft: '#ffdb2f',
    signalRed: '#c8102e',
    signalBlue: '#343459',
    success: '#a9d66f',
    warning: '#f2c300',
    danger: '#e54b4b',
    info: '#8ca8ff',
    focus: '#f2c300',
    overlay: 'rgba(0, 0, 0, 0.78)',
    shadowColor: 'rgba(247, 247, 242, 0.16)',
    noiseOpacity: 0.12,
    domains: SIGNAL_DOMAINS,
  },
  schematic: {
    background: '#f1f0ea',
    foreground: '#080808',
    panel: '#f8f7f2',
    panelRaised: '#ffffff',
    panelSubtle: '#e8e7e1',
    muted: '#d8d7d1',
    mutedForeground: '#55575d',
    line: '#080808',
    lineMuted: '#85878c',
    input: '#b8b9bc',
    signal: '#edbd00',
    signalForeground: '#080808',
    signalSoft: '#f7d64e',
    signalRed: '#b70f2b',
    signalBlue: '#343459',
    success: '#4f7e1e',
    warning: '#8b6800',
    danger: '#a51d29',
    info: '#254db5',
    focus: '#080808',
    overlay: 'rgba(8, 8, 8, 0.52)',
    shadowColor: 'rgba(8, 8, 8, 0.26)',
    noiseOpacity: 0.06,
    domains: SCHEMATIC_DOMAINS,
  },
} as const satisfies Record<VisualThemeName, VisualTheme>

export const DOMAIN_LABELS: Readonly<Record<VisualDomain, string>> = {
  satellite: 'SAT',
  vessel: 'AIS',
  flight: 'ADSB',
  weather: 'WX',
  news: 'NEWS',
  conflict: 'CON',
  cyber: 'CYB',
  osint: 'OSINT',
  port: 'PORT',
  rf: 'RF',
  economic: 'ECON',
  camera: 'CAM',
  infrastructure: 'INFRA',
  geofence: 'GEO',
  alert: 'ALERT',
  watchlist: 'WATCH',
}

export function getVisualTheme(theme: VisualThemeName): VisualTheme {
  return VISUAL_THEMES[theme]
}

export function getDomainColors(theme: VisualThemeName): DomainColors {
  return VISUAL_THEMES[theme].domains
}
