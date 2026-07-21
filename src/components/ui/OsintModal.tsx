import { useEffect, useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { OsintPost, OsintMedia, OsintLinkCard, OsintComment } from '@/lib/osint-client'

interface OsintModalProps {
  post: OsintPost | null
  onClose: () => void
}

interface ExtractedArticle {
  title: string | null
  content: string | null
  excerpt: string | null
  siteName: string | null
  byline: string | null
  error?: string
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function isLinkSharePost(post: OsintPost): boolean {
  if (!post.linkCard?.url) return false
  const text = post.fullText ?? post.text
  // Strip URLs before counting words
  const textWithoutLinks = text.replace(/https?:\/\/\S+/g, '').replace(/\S+\.\S+\/\S+/g, '')
  const wordCount = textWithoutLinks.trim().split(/\s+/).filter(Boolean).length
  return wordCount < 25
}

function MediaGallery({ media }: { media: OsintMedia[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (media.length === 0) return null

  return (
    <>
      <div className={cn(
        'grid gap-2 mt-3',
        media.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
      )}>
        {media.map((m, i) => (
          m.type === 'image' ? (
            <button
              key={i}
              onClick={() => setExpanded(expanded === m.url ? null : m.url)}
              aria-label={`Expand image ${i + 1}`}
              className="overflow-hidden border border-line-muted transition-colors hover:border-line"
            >
              <img
                src={m.previewUrl ?? m.url}
                alt={m.alt ?? ''}
                className="w-full max-h-[300px] object-cover"
                loading="lazy"
              />
            </button>
          ) : (
            <video
              key={i}
              src={m.url}
              poster={m.previewUrl}
              controls
              className="max-h-[300px] w-full border border-line-muted"
            />
          )
        ))}
      </div>
      {expanded && (
        <button
          type="button"
          aria-label="Close expanded image"
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-[var(--overlay)] p-4"
          onClick={() => setExpanded(null)}
        >
          <img src={expanded} alt="Expanded OSINT attachment" className="max-h-[90vh] max-w-[90vw] border border-line bg-background object-contain" />
        </button>
      )}
    </>
  )
}

function LinkCardView({ card, onClick }: { card: OsintLinkCard; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex min-h-11 w-full overflow-hidden border border-line-muted bg-panel-subtle text-left transition-colors hover:border-line hover:bg-panel-raised"
    >
      {card.image && (
        <img
          src={card.image}
          alt=""
          className="w-[120px] h-[90px] object-cover flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="flex-1 min-w-0 p-3">
        <div className="line-clamp-2 font-mono text-[11px] leading-tight text-foreground">{card.title}</div>
        {card.description && (
          <div className="mt-1 line-clamp-2 font-mono text-[10px] text-muted-foreground">{card.description}</div>
        )}
        <div className="mt-1 font-mono text-[9px] text-domain-osint">Load full article / {extractDomain(card.url)}</div>
      </div>
    </button>
  )
}

function EngagementBar({ post }: { post: OsintPost }) {
  const items: Array<{ label: string; value: number }> = []
  if (post.score != null) items.push({ label: post.platform === 'reddit' ? 'upvotes' : 'likes', value: post.score })
  if (post.commentCount != null) items.push({ label: 'replies', value: post.commentCount })
  if (post.repostCount != null) items.push({ label: post.platform === 'mastodon' ? 'boosts' : 'reposts', value: post.repostCount })

  if (items.length === 0) return null

  return (
    <div className="mt-3 flex items-center gap-4 border-t border-line-muted pt-3">
      {items.map(({ label, value }) => (
        <span key={label} className="font-mono text-[10px] text-muted-foreground">
          <span className="neo-data text-foreground">{formatNumber(value)}</span> {label}
        </span>
      ))}
    </div>
  )
}

function ArticleContent({ article }: { article: ExtractedArticle }) {
  return (
    <div className="mt-4 border-t border-line-muted pt-4">
      {/* Article source */}
      {(article.siteName || article.byline) && (
        <div className="flex items-center gap-2 mb-3">
          {article.siteName && (
            <span className="border border-domain-osint px-1.5 py-0.5 font-mono text-[10px] text-domain-osint">{article.siteName}</span>
          )}
          {article.byline && (
            <span className="font-mono text-[10px] text-muted-foreground">{article.byline}</span>
          )}
        </div>
      )}

      {/* Article title */}
      {article.title && (
        <h2 className="mb-3 font-body text-[17px] font-bold leading-snug text-foreground">{article.title}</h2>
      )}

      {/* Article body */}
      {article.content && (
        <div
          className="osint-article-content font-body text-[14px] leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      )}
    </div>
  )
}

function useArticleExtract(url: string | null) {
  const [article, setArticle] = useState<ExtractedArticle | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchArticle = useCallback(async (articleUrl: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/article/extract?url=${encodeURIComponent(articleUrl)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as ExtractedArticle
      if (data.content) {
        setArticle(data)
      } else {
        setArticle(null)
      }
    } catch {
      setArticle(null)
      setError('Article preview unavailable.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch when URL is provided
  useEffect(() => {
    if (url) {
      setArticle(null)
      fetchArticle(url)
    } else {
      setArticle(null)
      setLoading(false)
      setError(null)
    }
  }, [url, fetchArticle])

  return { article, loading, error, fetchArticle }
}

function useOsintComments(post: OsintPost | null) {
  const [comments, setComments] = useState<OsintComment[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!post || loaded) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ platform: post.platform, url: post.url })
      // For Mastodon, extract the numeric ID from our prefixed ID
      if (post.platform === 'mastodon') {
        const numericId = post.id.replace('mast-', '')
        params.set('id', numericId)
      }
      const res = await fetch(`/api/osint/comments?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { comments: OsintComment[] }
      setComments(data.comments ?? [])
    } catch {
      setComments([])
      setError('Comments unavailable.')
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [post, loaded])

  // Reset when post changes
  useEffect(() => {
    setComments([])
    setLoaded(false)
    setLoading(false)
    setError(null)
  }, [post?.id])

  return { comments, loading, loaded, error, fetchComments }
}

function CommentItem({ comment, depth = 0 }: { comment: OsintComment; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth >= 2)
  const hasReplies = comment.replies && comment.replies.length > 0

  return (
    <div className={cn('mt-2', depth > 0 && 'ml-4 border-l border-line-muted pl-3')}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-mono text-[11px] font-semibold text-foreground">{comment.author}</span>
        {comment.score != null && (
          <span className="neo-data text-[10px] text-muted-foreground">{formatNumber(comment.score)} pts</span>
        )}
        <span className="font-mono text-[9px] text-muted-foreground">
          {new Date(comment.time).toISOString().slice(0, 16).replace('T', ' ')}
        </span>
      </div>
      {comment.htmlContent ? (
        <div
          className="osint-html-content font-body text-[12px] leading-relaxed text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: comment.htmlContent }}
        />
      ) : (
        <div className="whitespace-pre-wrap font-body text-[12px] leading-relaxed text-muted-foreground">
          {comment.text}
        </div>
      )}
      {hasReplies && (
        <>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-expanded={!collapsed}
            className="mt-1 min-h-9 border border-transparent px-1 font-mono text-[10px] text-muted-foreground hover:border-line-muted hover:text-foreground"
          >
            {collapsed
              ? `▸ ${comment.replies!.length} ${comment.replies!.length === 1 ? 'reply' : 'replies'}`
              : '▾ hide replies'}
          </button>
          {!collapsed && comment.replies!.map(reply => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  )
}

function CommentsSection({ post }: { post: OsintPost }) {
  const { comments, loading, loaded, error, fetchComments } = useOsintComments(post)
  const [expanded, setExpanded] = useState(false)

  const handleToggle = () => {
    if (!loaded && !loading) fetchComments()
    setExpanded(!expanded)
  }

  return (
    <div className="mt-4 border-t border-line-muted pt-4">
      <button
        onClick={handleToggle}
        aria-expanded={expanded}
        className="group flex min-h-9 w-full items-center gap-2 text-left"
      >
        <span className="font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground">
          {expanded ? '▾' : '▸'}
        </span>
        <span className="neo-kicker text-muted-foreground transition-colors group-hover:text-foreground">
          Comments
        </span>
        {post.commentCount != null && (
          <span className="neo-data text-[10px] text-muted-foreground">({post.commentCount})</span>
        )}
      </button>

      {expanded && (
        <div className="mt-2">
          {loading && (
            <div className="flex items-center gap-2 py-3">
              <div className="size-3 border-2 border-line-muted border-t-domain-osint motion-safe:animate-spin" aria-hidden="true" />
              <span className="font-mono text-[11px] text-muted-foreground">Loading comments...</span>
            </div>
          )}
          {error && !loading && (
            <div className="border-l-2 border-danger py-2 pl-2 font-mono text-[11px] text-danger">{error}</div>
          )}
          {loaded && comments.length === 0 && !loading && !error && (
            <div className="py-2 font-mono text-[11px] text-muted-foreground">No comments found.</div>
          )}
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OsintModal({ post: postProp, onClose }: OsintModalProps) {
  // Snapshot the post when a new one is selected to prevent re-renders
  // from store version updates causing content to flicker
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const post = useMemo(() => postProp, [postProp?.id])

  // Determine the article URL to extract
  const articleUrl = post?.linkCard?.url ?? null
  const autoFetch = post ? (
    (post.platform === 'reddit' && post.linkCard?.url) ||
    (post.platform === 'bluesky' && post.linkCard?.url) ||
    (post.platform === 'mastodon' && post.linkCard?.url)
  ) : false

  const { article: extractedArticle, loading, error: articleError, fetchArticle } = useArticleExtract(autoFetch ? articleUrl : null)

  if (!post) return null

  const isLinkShare = isLinkSharePost(post)

  // For link-share posts, fall back to linkCard data if extraction fails
  const article: ExtractedArticle | null = extractedArticle ?? (
    isLinkShare && !loading && post.linkCard ? {
      title: post.linkCard.title || post.text,
      content: post.linkCard.description ? `<p>${post.linkCard.description}</p>` : null,
      excerpt: post.linkCard.description || null,
      siteName: extractDomain(post.linkCard.url),
      byline: null,
    } : null
  )

  return (
    <Dialog open={postProp !== null} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex max-h-[90vh] w-[min(94vw,44rem)] max-w-none flex-col gap-0 overflow-hidden border-line bg-panel p-0 shadow-hard sm:max-h-[85vh]"
      >
        <DialogTitle className="sr-only">{isLinkShare && article?.title ? article.title : `${post.platform} post by ${post.author}`}</DialogTitle>
        {/* Header */}
        <div className="flex min-h-12 flex-shrink-0 items-center gap-2 border-b border-line bg-panel px-4 py-2.5">
          {isLinkShare && article ? (
            <>
              {article.siteName && (
                <span className="border border-domain-osint px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-osint">
                  {article.siteName}
                </span>
              )}
              <span className="font-mono text-[10px] text-muted-foreground">
                via @{post.author} on {post.platform}
              </span>
              <div className="flex-1" />
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={post.linkCard!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center border border-line-muted bg-background px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-signal hover:text-signal-foreground"
                    >
                      ↗ OPEN ARTICLE
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Open article</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <>
              <span className="border border-domain-osint px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-domain-osint">
                {post.platform}
              </span>
              <span className="font-mono text-[11px] text-foreground">{post.author}</span>
              {post.subreddit && (
                <span className="font-mono text-[10px] text-domain-osint">r/{post.subreddit}</span>
              )}
              <div className="flex-1" />
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center border border-line-muted bg-background px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-signal hover:text-signal-foreground"
                    >
                      ↗ NEW TAB
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>Open in new tab</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
          <button
            onClick={onClose}
            aria-label="Close OSINT detail"
            className="grid size-9 place-items-center border border-line-muted bg-background font-mono text-lg leading-none text-muted-foreground transition-colors hover:bg-signal hover:text-signal-foreground"
          >
            ✕
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="neo-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          {isLinkShare && article ? (
            /* ── Link-share post: render as article ── */
            <>
              {/* Location + date */}
              <div className="flex items-center gap-2 mb-3">
                {post.locationName && (
                  <span className="border border-domain-osint px-1.5 py-0.5 font-mono text-[10px] text-domain-osint">{post.locationName}</span>
                )}
                <span className="neo-data text-[10px] text-muted-foreground">{formatTime(post.time)}</span>
              </div>

              {/* Article source + byline */}
              {article.byline && (
                <div className="mb-2 font-mono text-[11px] text-muted-foreground">{article.byline}</div>
              )}

              {/* Article title */}
              <h2 className="mb-4 font-body text-[17px] font-bold leading-snug text-foreground">{article.title}</h2>

              {/* Article body */}
              {article.content && (
                <div
                  className="osint-article-content font-body text-[14px] leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />
              )}

              {/* Engagement */}
              <EngagementBar post={post} />

              {/* Comments */}
              <CommentsSection post={post} />

              {/* Source link */}
              <div className="mt-4 border-t border-line-muted pt-3">
                <a
                  href={post.linkCard!.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-domain-osint underline decoration-line-muted underline-offset-4 hover:decoration-domain-osint"
                >
                  ↗ {extractDomain(post.linkCard!.url)} — view original article
                </a>
              </div>
            </>
          ) : isLinkShare && loading ? (
            /* ── Link-share post: loading article ── */
            <>
              <div className="flex items-center gap-2 mb-4">
                {post.locationName && (
                  <span className="border border-domain-osint px-1.5 py-0.5 font-mono text-[10px] text-domain-osint">{post.locationName}</span>
                )}
                <span className="neo-data text-[10px] text-muted-foreground">{formatTime(post.time)}</span>
              </div>

              {/* Show link card title as preview while loading */}
              {post.linkCard?.title && (
                <h2 className="mb-4 font-body text-[17px] font-bold leading-snug text-foreground">{post.linkCard.title}</h2>
              )}

              <div className="flex items-center gap-2 py-4">
                <div className="size-3 border-2 border-line-muted border-t-domain-osint motion-safe:animate-spin" aria-hidden="true" />
                <span className="font-mono text-[11px] text-muted-foreground">Loading article from {post.linkCard ? extractDomain(post.linkCard.url) : ''}...</span>
              </div>
            </>
          ) : (
            /* ── Regular post or link-share fallback ── */
            <>
              {/* Meta line */}
              <div className="flex items-center gap-2 mb-3">
                {post.locationName && (
                  <span className="border border-domain-osint px-1.5 py-0.5 font-mono text-[10px] text-domain-osint">{post.locationName}</span>
                )}
                <span className="neo-data text-[10px] text-muted-foreground">{formatTime(post.time)}</span>
              </div>

              {/* Post title (Reddit) */}
              {post.platform === 'reddit' && !article && (
                <h2 className="mb-2 font-body text-[15px] font-bold leading-snug text-foreground">{post.text}</h2>
              )}

              {/* Post content (social media post text) */}
              {!article && (
                <>
                  {post.htmlContent ? (
                    <div
                      className="osint-html-content font-body text-[13px] leading-relaxed text-foreground"
                      dangerouslySetInnerHTML={{ __html: post.htmlContent }}
                    />
                  ) : post.fullText ? (
                    <div className="whitespace-pre-wrap font-body text-[13px] leading-relaxed text-foreground">
                      {post.fullText}
                    </div>
                  ) : null}
                </>
              )}

              {/* Media from social post */}
              <MediaGallery media={post.media} />

              {/* Link card (clickable to load article if not auto-fetched) */}
              {post.linkCard && !article && !loading && !autoFetch && (
                <LinkCardView card={post.linkCard} onClick={() => fetchArticle(post.linkCard!.url)} />
              )}

              {/* Loading state */}
              {loading && (
                <div className="mt-4 flex items-center gap-2 border-t border-line-muted pt-4">
                  <div className="size-3 border-2 border-line-muted border-t-domain-osint motion-safe:animate-spin" aria-hidden="true" />
                  <span className="font-mono text-[11px] text-muted-foreground">Loading article...</span>
                </div>
              )}

              {articleError && !loading && !article && (
                <div className="mt-4 border-l-2 border-danger py-2 pl-2 font-mono text-[11px] text-danger">{articleError}</div>
              )}

              {/* Extracted article content */}
              {article && <ArticleContent article={article} />}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {post.tags.map(tag => (
                    <span key={tag} className="border border-line-muted bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Engagement */}
              <EngagementBar post={post} />

              {/* Comments — collapsed by default */}
              <CommentsSection post={post} />

              {/* Source link at bottom */}
              {post.linkCard?.url && (
                <div className="mt-4 border-t border-line-muted pt-3">
                  <a
                    href={post.linkCard.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] text-domain-osint underline decoration-line-muted underline-offset-4 hover:decoration-domain-osint"
                  >
                    ↗ {extractDomain(post.linkCard.url)} — view original
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
