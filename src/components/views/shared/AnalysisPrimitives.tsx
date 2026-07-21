import type { HTMLAttributes, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function AnalysisPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Card className={cn('bg-panel', className)} {...props} />
}

export function AnalysisHeader({
  eyebrow,
  title,
  detail,
  action,
  className,
}: {
  eyebrow: string
  title: string
  detail?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3 border-b border-line bg-panel px-4 py-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <div className="neo-kicker text-signal">{eyebrow}</div>
        <h1 className="neo-display mt-1 text-2xl text-foreground sm:text-3xl">{title}</h1>
        {detail ? <div className="neo-data mt-1 text-xs text-muted-foreground">{detail}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function AnalysisSectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('neo-kicker border-l-4 border-signal pl-2 text-foreground', className)}>{children}</h2>
}

export function AnalysisChartRegion({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('neo-grid-fine min-w-0 border-t border-line-muted bg-panel-subtle p-3', className)}>{children}</div>
}

export function DomainMark({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 border border-line', className)} style={{ backgroundColor: color }} />
}
