import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

export function PipelineError({ errors }: { errors: string[] }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const iconRef = useRef<HTMLDivElement>(null)

  const handleEnter = useCallback(() => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect()
      setPos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    setShowTooltip(true)
  }, [])

  if (errors.length === 0) return null

  return (
    <div
      ref={iconRef}
      className="relative flex-shrink-0"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        className="text-amber-400 cursor-help"
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

      {showTooltip && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none max-w-xs"
          style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="mb-1.5 bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 shadow-lg">
            <div className="font-mono text-[10px] text-amber-400 font-semibold uppercase tracking-wide mb-1">
              Pipeline Issue{errors.length > 1 ? 's' : ''}
            </div>
            {errors.map((err, i) => (
              <div key={i} className="font-mono text-[11px] text-zinc-300 leading-relaxed">{err}</div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
