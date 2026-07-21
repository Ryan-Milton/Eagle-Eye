import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

export function ThemeToggle() {
  const theme = useAppStore(state => state.theme)
  const setTheme = useAppStore(state => state.setTheme)
  const nextTheme = theme === 'signal' ? 'schematic' : 'signal'
  const label = `Switch to ${nextTheme} theme`
  const Icon = theme === 'signal' ? Sun : Moon

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
      className="inline-flex size-11 shrink-0 items-center justify-center border border-line bg-panel text-foreground transition-colors hover:bg-signal hover:text-signal-foreground focus-visible:outline-focus"
    >
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </button>
  )
}
