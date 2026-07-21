import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useOsintStore } from '@/stores/osint-store'
import { OsintModal } from '@/components/ui/OsintModal'
import type { OsintPost } from '@/lib/osint-client'

const PLATFORM_ICONS: Record<string, string> = {
  reddit: 'R/',
  mastodon: 'M',
  bluesky: 'B',
}

export function OsintSection() {
  const [open, setOpen] = useState(true)
  const [modalPost, setModalPost] = useState<OsintPost | null>(null)
  const { posts, platformToggles, togglePlatform, version, count } = useOsintStore()

  const sortedPosts = useMemo(() => {
    void version
    const arr = [...posts.values()]
      .filter(p => platformToggles.get(p.platform) !== false)
      .sort((a, b) => b.time - a.time)
    return arr.slice(0, 50)
  }, [version, posts, platformToggles])

  const platforms = ['reddit', 'mastodon', 'bluesky'] as const

  return (
    <div className="border-b border-line-muted">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between px-3 transition-colors hover:bg-panel-raised"
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] transition-transform', open && 'rotate-90')}>▶</span>
          <span className="neo-kicker text-domain-osint">OSINT</span>
          <span className="neo-data text-[11px] text-muted-foreground">{count}</span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-2">
          {/* Platform toggles */}
          <div className="flex gap-1 mb-2">
            {platforms.map(p => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={cn(
                  'min-h-9 border px-2 font-mono text-[10px] uppercase tracking-wider transition-colors',
                  platformToggles.get(p) !== false
                    ? 'border-domain-osint bg-domain-osint text-background'
                    : 'border-line-muted bg-background text-muted-foreground',
                )}
              >
                {PLATFORM_ICONS[p]} {p}
              </button>
            ))}
          </div>

          {/* Posts list */}
          <div className="neo-scrollbar max-h-64 overflow-y-auto border border-line-muted">
            {sortedPosts.map(post => (
              <button
                key={post.id}
                onClick={() => setModalPost(post)}
                className="block min-h-10 w-full border-b border-line-muted px-2 py-1.5 text-left transition-colors hover:bg-panel-raised"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={cn(
                    'border border-domain-osint px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-domain-osint',
                  )}>
                    {post.platform.slice(0, 3)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{post.author}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">{post.locationName}</span>
                </div>
                <div className="truncate font-mono text-[11px] text-foreground">{post.text}</div>
              </button>
            ))}
            {sortedPosts.length === 0 && (
              <div className="py-4 text-center font-mono text-[11px] text-muted-foreground motion-safe:animate-pulse-signal">
                {count === 0 ? 'Loading OSINT...' : 'No geolocated posts'}
              </div>
            )}
          </div>
        </div>
      )}
      <OsintModal post={modalPost} onClose={() => setModalPost(null)} />
    </div>
  )
}
