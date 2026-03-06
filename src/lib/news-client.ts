import type { NewsEvent, NewsCategory } from '@/types'

/** Classify a GDELT article into a NewsCategory based on themes/title */
function classifyArticle(title: string, themes: string[] = []): NewsCategory {
  const text = [title, ...themes].join(' ').toLowerCase()
  if (/\b(war|military|attack|bomb|strike|armed|weapon|troops|battle)\b/.test(text)) return 'conflict'
  if (/\b(elect|vote|parliament|government|president|minister|senate|congress|diplomacy|treaty)\b/.test(text)) return 'politics'
  if (/\b(earthquake|flood|hurricane|tornado|wildfire|tsunami|disaster|cyclone|eruption)\b/.test(text)) return 'disaster'
  if (/\b(economy|stock|market|trade|gdp|inflation|bank|finance|recession|tariff)\b/.test(text)) return 'economy'
  if (/\b(tech|cyber|ai|software|silicon|data|internet|computer|hack|robot)\b/.test(text)) return 'technology'
  if (/\b(health|disease|virus|pandemic|hospital|vaccine|medical|who|outbreak)\b/.test(text)) return 'health'
  if (/\b(climate|environment|pollution|carbon|emission|deforest|biodiversity|ocean)\b/.test(text)) return 'environment'
  return 'other'
}

interface GdeltArticle {
  url: string
  title: string
  seendate: string
  socialimage?: string
  domain?: string
  language?: string
  sourcecountry?: string
  tone?: number
  themes?: string[]
}

interface GdeltGeoEvent {
  lat: number
  lon: number
  name: string
  count: number
  tone: number
}

/** Parse GDELT Doc API response */
export function parseGdeltArticles(json: { articles?: GdeltArticle[] }): Omit<NewsEvent, 'lat' | 'lon'>[] {
  if (!json.articles) return []
  return json.articles.map((a, i) => ({
    id: `gdelt-art-${i}-${Date.now()}`,
    title: a.title ?? 'Untitled',
    url: a.url ?? '',
    source: a.domain ?? 'unknown',
    category: classifyArticle(a.title ?? '', a.themes),
    tone: a.tone ?? 0,
    articleCount: 1,
    imageUrl: a.socialimage || null,
    time: a.seendate ? new Date(a.seendate).getTime() : Date.now(),
    lastUpdate: Date.now(),
  }))
}

/** Parse GDELT Geo API GeoJSON response */
export function parseGdeltGeo(json: GeoJSON.FeatureCollection): NewsEvent[] {
  const events: NewsEvent[] = []
  if (!json.features) return events

  for (let i = 0; i < json.features.length; i++) {
    const f = json.features[i]
    if (!f.geometry || f.geometry.type !== 'Point') continue
    const coords = (f.geometry as GeoJSON.Point).coordinates
    const props = (f.properties ?? {}) as Record<string, unknown>
    const name = (props.name as string) ?? ''
    const tone = (props.tone as number) ?? 0
    const count = (props.count as number) ?? (props.articlecount as number) ?? 1
    const urllist = (props.urllist as string) ?? ''
    const url = urllist.split('<br/>')[0]?.trim() || ''

    events.push({
      id: `gdelt-geo-${i}-${Date.now()}`,
      title: name || `Event cluster (${count} articles)`,
      url,
      source: 'GDELT',
      category: classifyArticle(name),
      lat: coords[1],
      lon: coords[0],
      tone,
      articleCount: count,
      imageUrl: null,
      time: Date.now(),
      lastUpdate: Date.now(),
    })
  }

  return events
}
