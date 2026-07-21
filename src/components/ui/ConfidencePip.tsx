import { cn } from '@/lib/utils'
import { type ConfidenceLevel, CONFIDENCE_LABELS } from '@/lib/confidence'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'

interface ConfidencePipProps {
  level: ConfidenceLevel
  className?: string
}

export function ConfidencePip({ level, className }: ConfidencePipProps) {
  const color = level === 'high' ? 'text-success' : level === 'medium' ? 'text-warning' : 'text-danger'
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'relative inline-grid size-3 flex-shrink-0 cursor-help place-items-center border border-current',
            color,
            className,
          )} role="img" aria-label={CONFIDENCE_LABELS[level]}>
            <span className="h-px w-1.5 bg-current" aria-hidden="true" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{CONFIDENCE_LABELS[level]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
