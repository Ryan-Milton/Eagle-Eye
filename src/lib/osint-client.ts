import { extractLocations } from './geo-extract'

export interface OsintPost {
  id: string
  platform: 'reddit' | 'mastodon' | 'bluesky'
  author: string
  text: string
  url: string
  lat: number
  lon: number
  locationName: string
  time: number
  lastUpdate: number
}

export function parseRedditPosts(json: unknown): OsintPost[] {
  const data = json as { data?: { children?: Array<{ data: {
    id?: string; author?: string; title?: string; selftext?: string
    url?: string; permalink?: string; created_utc?: number
  } }> } }

  if (!Array.isArray(data?.data?.children)) return []

  const posts: OsintPost[] = []
  for (const child of data.data!.children!) {
    const d = child.data
    if (!d.title) continue
    const text = `${d.title} ${d.selftext ?? ''}`
    const locations = extractLocations(text)
    if (locations.length === 0) continue

    const loc = locations[0]
    posts.push({
      id: `reddit-${d.id}`,
      platform: 'reddit',
      author: d.author ?? 'unknown',
      text: d.title ?? '',
      url: d.permalink ? `https://reddit.com${d.permalink}` : d.url ?? '',
      lat: loc.lat,
      lon: loc.lon,
      locationName: loc.name,
      time: (d.created_utc ?? 0) * 1000,
      lastUpdate: Date.now(),
    })
  }

  return posts
}

export function parseMastodonPosts(json: unknown): OsintPost[] {
  const data = json as Array<{
    id?: string; content?: string; url?: string; created_at?: string
    account?: { acct?: string }
  }>

  if (!Array.isArray(data)) return []

  const posts: OsintPost[] = []
  for (const item of data) {
    if (!item.content) continue
    // Strip HTML
    const text = item.content.replace(/<[^>]+>/g, ' ')
    const locations = extractLocations(text)
    if (locations.length === 0) continue

    const loc = locations[0]
    posts.push({
      id: `mast-${item.id}`,
      platform: 'mastodon',
      author: item.account?.acct ?? 'unknown',
      text: text.slice(0, 200),
      url: item.url ?? '',
      lat: loc.lat,
      lon: loc.lon,
      locationName: loc.name,
      time: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
      lastUpdate: Date.now(),
    })
  }

  return posts
}

export function parseBlueskyPosts(json: unknown): OsintPost[] {
  const data = json as { posts?: Array<{
    uri?: string; cid?: string; record?: { text?: string; createdAt?: string }
    author?: { handle?: string }
  }> }

  if (!Array.isArray(data?.posts)) return []

  const posts: OsintPost[] = []
  for (const item of data.posts!) {
    const text = item.record?.text ?? ''
    if (!text) continue
    const locations = extractLocations(text)
    if (locations.length === 0) continue

    const loc = locations[0]
    posts.push({
      id: `bsky-${item.cid ?? item.uri}`,
      platform: 'bluesky',
      author: item.author?.handle ?? 'unknown',
      text: text.slice(0, 200),
      url: item.uri ?? '',
      lat: loc.lat,
      lon: loc.lon,
      locationName: loc.name,
      time: item.record?.createdAt ? new Date(item.record.createdAt).getTime() : Date.now(),
      lastUpdate: Date.now(),
    })
  }

  return posts
}
