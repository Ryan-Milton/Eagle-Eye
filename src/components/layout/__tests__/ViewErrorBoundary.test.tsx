import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ViewErrorBoundary } from '../ViewErrorBoundary'

function BrokenView(): never {
  throw new Error('WebGL unavailable')
}

describe('ViewErrorBoundary', () => {
  it('keeps a renderer failure inside the center view', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ViewErrorBoundary>
        <BrokenView />
      </ViewErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('View initialization failed')
    expect(screen.getByText('WebGL unavailable')).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
