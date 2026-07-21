import { cn } from '@/lib/utils'
import { SOURCE_LABELS } from '@/lib/colors'

interface SourceBadgeProps {
  source: string
  className?: string
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const key = source.toLowerCase()
  const label = SOURCE_LABELS[key] ?? source.toUpperCase()

  return (
    <span className={cn(
      'border border-line-muted bg-background px-1 py-0.5 font-mono text-[8px] uppercase leading-tight tracking-wider text-muted-foreground',
      className,
    )}>
      {label}
    </span>
  )
}
