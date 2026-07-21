import { describe, expect, it } from 'vitest'
import {
  CHART_AXIS_STYLE,
  CHART_BAR_STYLE,
  CHART_GRID_STYLE,
  CHART_TOOLTIP_STYLE,
  DOMAIN_HEX_COLORS,
  activeBarGrow,
  getChartTheme,
} from '../chart-theme'
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS,
  getDomainColors,
  getVisualTheme,
} from '../visual-theme'

const SIGNAL_DOMAINS = {
  satellite: '#f97316', vessel: '#22d3ee', flight: '#eab308', weather: '#4ade80',
  news: '#fb7185', conflict: '#f87171', cyber: '#c084fc', osint: '#2dd4bf',
  port: '#60a5fa', rf: '#a78bfa', economic: '#34d399', camera: '#38bdf8',
  infrastructure: '#94a3b8', geofence: '#f59e0b', alert: '#e54b4b', watchlist: '#fb923c',
}

const SCHEMATIC_DOMAINS = {
  satellite: '#a23b00', vessel: '#006779', flight: '#795b00', weather: '#2f6b25',
  news: '#9e2146', conflict: '#a51d29', cyber: '#6b2a91', osint: '#006e67',
  port: '#254db5', rf: '#56348b', economic: '#1f704d', camera: '#17658a',
  infrastructure: '#475569', geofence: '#8b5200', alert: '#a51d29', watchlist: '#a4470c',
}

describe('visual theme registry', () => {
  it('matches the signal core palette', () => {
    expect(getVisualTheme('signal')).toMatchObject({
      background: '#050505', foreground: '#f7f7f2', panel: '#0b0b0c', panelRaised: '#111214',
      panelSubtle: '#17181b', muted: '#202125', mutedForeground: '#9a9ca2', line: '#e2e3e5',
      lineMuted: '#45474d', input: '#2a2b30', signal: '#f2c300', signalForeground: '#080808',
      signalSoft: '#ffdb2f', signalRed: '#c8102e', signalBlue: '#343459', success: '#a9d66f',
      warning: '#f2c300', danger: '#e54b4b', info: '#8ca8ff', focus: '#f2c300',
      overlay: 'rgba(0, 0, 0, 0.78)', shadowColor: 'rgba(247, 247, 242, 0.16)', noiseOpacity: 0.12,
    })
  })

  it('matches the schematic core palette', () => {
    expect(getVisualTheme('schematic')).toMatchObject({
      background: '#f1f0ea', foreground: '#080808', panel: '#f8f7f2', panelRaised: '#ffffff',
      panelSubtle: '#e8e7e1', muted: '#d8d7d1', mutedForeground: '#55575d', line: '#080808',
      lineMuted: '#85878c', input: '#b8b9bc', signal: '#edbd00', signalForeground: '#080808',
      signalSoft: '#f7d64e', signalRed: '#b70f2b', signalBlue: '#343459', success: '#4f7e1e',
      warning: '#8b6800', danger: '#a51d29', info: '#254db5', focus: '#080808',
      overlay: 'rgba(8, 8, 8, 0.52)', shadowColor: 'rgba(8, 8, 8, 0.26)', noiseOpacity: 0.06,
    })
  })

  it('contains every stable domain, color, and label for both themes', () => {
    expect(getDomainColors('signal')).toEqual(SIGNAL_DOMAINS)
    expect(getDomainColors('schematic')).toEqual(SCHEMATIC_DOMAINS)
    expect(Object.keys(DOMAIN_LABELS)).toEqual(DOMAIN_KEYS)
    expect(DOMAIN_LABELS).toMatchObject({
      satellite: 'SAT', vessel: 'AIS', flight: 'ADSB', camera: 'CAM',
      infrastructure: 'INFRA', geofence: 'GEO', alert: 'ALERT', watchlist: 'WATCH',
    })
  })
})

describe('chart theme', () => {
  it('uses semantic CSS colors and technical geometry for Recharts', () => {
    expect(DOMAIN_HEX_COLORS.camera).toBe('var(--domain-camera)')
    expect(CHART_TOOLTIP_STYLE.contentStyle).toMatchObject({
      background: 'var(--panel-raised)',
      border: '1px solid var(--line)',
      borderRadius: 0,
    })
    expect(CHART_TOOLTIP_STYLE.contentStyle.fontFamily).toContain('IBM Plex Mono')
    expect(CHART_AXIS_STYLE.tick.fill).toBe('var(--muted-foreground)')
    expect(CHART_GRID_STYLE).toEqual({
      stroke: 'var(--line-muted)',
      strokeDasharray: '2 2',
      strokeOpacity: 0.55,
    })
    expect(CHART_BAR_STYLE.radius).toBe(0)
  })

  it('provides raw palette values for non-CSS renderers', () => {
    const chart = getChartTheme('schematic')

    expect(chart.domainColors).toBe(getDomainColors('schematic'))
    expect(chart.tooltip.contentStyle.background).toBe('#ffffff')
    expect(chart.axis.tick.fill).toBe('#55575d')
    expect(chart.grid.stroke).toBe('#85878c')
  })

  it('keeps the active bar square while growing it by three pixels', () => {
    const bar = activeBarGrow({ x: 10, y: 20, width: 30, height: 40, fill: '#fff', radius: 8 })

    expect(bar.props).toMatchObject({
      x: 8.5,
      y: 17,
      width: 33,
      height: 43,
      rx: 0,
      ry: 0,
    })
  })
})
