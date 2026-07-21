import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAppStore } from '@/stores/app-store'
import { ThemeToggle } from '../ThemeToggle'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.dataset.theme = 'signal'
    useAppStore.setState({ theme: 'signal' })
  })

  it('persists the selected theme and updates the document attribute', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to schematic theme' }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'schematic')
    expect(localStorage.getItem('eagle-eye-theme')).toBe('schematic')
    expect(screen.getByRole('button', { name: 'Switch to signal theme' })).toBeInTheDocument()
  })
})
