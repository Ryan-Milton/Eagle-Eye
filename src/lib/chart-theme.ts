import { createElement } from 'react'
import {
  DOMAIN_KEYS,
  DOMAIN_LABELS as VISUAL_DOMAIN_LABELS,
  getDomainColors,
  getVisualTheme,
  type VisualThemeName,
} from './visual-theme'

const CHART_FONT_FAMILY = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace'

/** Semantic colors for DOM/SVG charts. CSS resolves these when data-theme changes. */
export const DOMAIN_HEX_COLORS: Record<string, string> = Object.fromEntries(
  DOMAIN_KEYS.map(domain => [domain, `var(--domain-${domain})`]),
)

/** Kept here for existing chart callers; the canonical labels live in visual-theme. */
export const DOMAIN_LABELS: Record<string, string> = VISUAL_DOMAIN_LABELS

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--panel-raised)',
    border: '1px solid var(--line)',
    borderRadius: 0,
    fontFamily: CHART_FONT_FAMILY,
    fontSize: 11,
    color: 'var(--foreground)',
  },
  labelStyle: {
    color: 'var(--foreground)',
    fontWeight: 600,
  },
  itemStyle: {
    color: 'var(--foreground)',
  },
  cursor: false as const,
}

export const CHART_AXIS_STYLE = {
  tick: { fill: 'var(--muted-foreground)', fontFamily: CHART_FONT_FAMILY, fontSize: 10 },
  axisLine: { stroke: 'var(--line-muted)' },
  tickLine: { stroke: 'var(--line-muted)' },
}

export const CHART_GRID_STYLE = {
  stroke: 'var(--line-muted)',
  strokeDasharray: '2 2',
  strokeOpacity: 0.55,
}

export const CHART_BAR_STYLE = {
  radius: 0,
} as const

/** Raw chart values for Canvas, image, and document export renderers. */
export function getChartTheme(themeName: VisualThemeName) {
  const theme = getVisualTheme(themeName)

  return {
    domainColors: getDomainColors(themeName),
    tooltip: {
      contentStyle: {
        background: theme.panelRaised,
        border: `1px solid ${theme.line}`,
        borderRadius: 0,
        fontFamily: CHART_FONT_FAMILY,
        fontSize: 11,
        color: theme.foreground,
      },
      labelStyle: {
        color: theme.foreground,
        fontWeight: 600,
      },
      itemStyle: {
        color: theme.foreground,
      },
      cursor: false as const,
    },
    axis: {
      tick: { fill: theme.mutedForeground, fontFamily: CHART_FONT_FAMILY, fontSize: 10 },
      axisLine: { stroke: theme.lineMuted },
      tickLine: { stroke: theme.lineMuted },
    },
    grid: {
      stroke: theme.lineMuted,
      strokeDasharray: '2 2',
      strokeOpacity: 0.55,
    },
    bar: CHART_BAR_STYLE,
  }
}

/** Render a slightly enlarged bar on hover (used as <Bar activeBar={activeBarGrow} />) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function activeBarGrow(props: any) {
  const { x, y, width, height, fill } = props as {
    x: number; y: number; width: number; height: number; fill: string
  }
  const grow = 3
  return createElement('rect', {
    x: x - grow / 2,
    y: y - grow,
    width: width + grow,
    height: height + grow,
    fill,
    rx: 0,
    ry: 0,
    fillOpacity: 1,
  })
}
