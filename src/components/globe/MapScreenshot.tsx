import { useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/Tooltip'

interface MapScreenshotProps {
  map: mapboxgl.Map | null
}

export function MapScreenshot({ map }: MapScreenshotProps) {
  const handleScreenshot = useCallback(() => {
    if (!map) return
    try {
      const canvas = map.getCanvas()
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `eagle-eye-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.warn('Screenshot failed:', err)
    }
  }, [map])

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleScreenshot}
            disabled={!map}
            aria-label="Save map screenshot as a PNG"
            className="min-h-9 border border-line bg-panel px-3 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-panel-raised hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            Screenshot
          </button>
        </TooltipTrigger>
        <TooltipContent>Save map screenshot</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
