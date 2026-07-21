import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'

export function PipelineError({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex min-h-5 flex-shrink-0 cursor-help items-center gap-1 border border-warning px-1 font-mono text-[9px] font-bold uppercase text-warning" role="status" aria-label={`${errors.length} pipeline issue${errors.length > 1 ? 's' : ''}`}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className="text-warning"
              fill="none"
            >
              <path
                d="M5.134 1.5a1 1 0 0 1 1.732 0l4.134 7.164A1 1 0 0 1 10.134 10H1.866a1 1 0 0 1-.866-1.5L5.134 1.5z"
                fill="currentColor"
                opacity="0.2"
                stroke="currentColor"
                strokeWidth="0.8"
              />
              <text x="6" y="8.5" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold">!</text>
            </svg>
            ERR
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="neo-kicker mb-1 text-warning">
            Pipeline Issue{errors.length > 1 ? 's' : ''}
          </div>
          {errors.map((err, i) => (
            <div key={i} className="font-mono text-[11px] leading-relaxed text-foreground">{err}</div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
