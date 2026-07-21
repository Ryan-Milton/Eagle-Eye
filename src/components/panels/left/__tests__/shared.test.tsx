import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MasterToggle, TypeToggle } from '../shared'

describe('shared layer toggles', () => {
  it('exposes and activates the master toggle without activating its parent', () => {
    const onToggle = vi.fn()
    const onParentClick = vi.fn()
    render(<div onClick={onParentClick}><MasterToggle allOn noneOn={false} onToggle={onToggle} /></div>)

    const toggle = screen.getByRole('button', { name: 'Disable all layers' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(toggle)

    expect(onToggle).toHaveBeenCalledOnce()
    expect(onParentClick).not.toHaveBeenCalled()
  })

  it('exposes and activates a type toggle without activating its parent', () => {
    const onClick = vi.fn()
    const onParentClick = vi.fn()
    render(<div onClick={onParentClick}><TypeToggle on={false} color="var(--domain-satellite)" label="satellites" onClick={onClick} /></div>)

    const toggle = screen.getByRole('button', { name: 'Show satellites' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)

    expect(onClick).toHaveBeenCalledOnce()
    expect(onParentClick).not.toHaveBeenCalled()
  })
})
