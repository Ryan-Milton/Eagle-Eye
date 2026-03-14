export interface SentinelScene {
  id: string
  datetime: string
  cloudCover: number
  thumbnail: string | null
  tileUrl: string | null
  bbox: [number, number, number, number]
}

/** Parse STAC search results into scene metadata */
export function parseSTACResults(json: unknown): SentinelScene[] {
  const data = json as {
    features?: Array<{
      id?: string
      properties?: {
        datetime?: string
        'eo:cloud_cover'?: number
      }
      assets?: Record<string, { href?: string; type?: string }>
      bbox?: number[]
    }>
  }

  if (!Array.isArray(data?.features)) return []

  return data.features.slice(0, 10).map(f => {
    const props = f.properties ?? {}
    const assets = f.assets ?? {}

    // Find visual/RGB asset for tile serving
    const visual = assets['rendered_preview'] ?? assets['visual'] ?? assets['thumbnail']
    const tileAsset = assets['tilejson'] ?? assets['visual']

    return {
      id: f.id ?? '',
      datetime: props.datetime ?? '',
      cloudCover: props['eo:cloud_cover'] ?? 0,
      thumbnail: visual?.href ?? null,
      tileUrl: tileAsset?.href ?? null,
      bbox: (f.bbox ?? [0, 0, 0, 0]) as [number, number, number, number],
    }
  })
}
