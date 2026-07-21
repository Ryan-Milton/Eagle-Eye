import { cn } from '@/lib/utils'

type PipColor = 'ok' | 'warn' | 'danger' | 'info'

interface PipProps { color: PipColor; className?: string }

export function Pip({ color, className }: PipProps) {
  const label = color === 'ok' ? 'Operational' : color === 'warn' ? 'Warning' : color === 'danger' ? 'Error' : 'Information'
  return (
    <span className={cn(
      'inline-block size-2 flex-shrink-0 border motion-safe:animate-pulse-signal',
      color === 'ok'     && 'border-success bg-success',
      color === 'warn'   && 'border-warning bg-warning',
      color === 'danger' && 'border-danger bg-danger',
      color === 'info'   && 'border-info bg-info',
      className
    )} role="img" aria-label={label} title={label} />
  )
}
