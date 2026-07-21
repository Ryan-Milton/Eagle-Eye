import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ViewErrorBoundaryProps {
  children: ReactNode
}

interface ViewErrorBoundaryState {
  error: Error | null
}

export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  state: ViewErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Center view failed to render', error, info)
  }

  private retry = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="neo-grid-fine grid h-full place-items-center overflow-auto bg-background p-6 text-foreground">
        <section role="alert" className="neo-corners w-full max-w-xl border border-danger bg-panel p-8 shadow-hard">
          <div className="grid size-12 place-items-center border border-danger text-danger">
            <CircleAlert aria-hidden="true" className="size-6" />
          </div>
          <div className="neo-kicker mt-6 text-danger">Renderer unavailable</div>
          <h1 className="neo-display mt-3 text-4xl">View initialization failed</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This view could not initialize in the current browser or graphics environment. Other operational panels remain available.
          </p>
          <pre className="neo-scrollbar mt-5 max-h-28 overflow-auto border border-line-muted bg-background p-3 font-mono text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button type="button" variant="signal" className="mt-6" onClick={this.retry}>
            <RotateCcw aria-hidden="true" /> Retry view
          </Button>
        </section>
      </div>
    )
  }
}
