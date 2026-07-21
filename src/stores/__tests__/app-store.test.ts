import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('app-store theme', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.dataset.theme = 'signal'
  })

  it('initializes from a persisted theme', async () => {
    localStorage.setItem('eagle-eye-theme', 'schematic')

    const { useAppStore } = await import('../app-store')

    expect(useAppStore.getState().theme).toBe('schematic')
  })

  it('falls back to signal for an invalid persisted value', async () => {
    localStorage.setItem('eagle-eye-theme', 'invalid')

    const { useAppStore } = await import('../app-store')

    expect(useAppStore.getState().theme).toBe('signal')
  })

  it('updates state, the document theme, and local storage', async () => {
    const { useAppStore } = await import('../app-store')

    useAppStore.getState().setTheme('schematic')

    expect(useAppStore.getState().theme).toBe('schematic')
    expect(document.documentElement.dataset.theme).toBe('schematic')
    expect(localStorage.getItem('eagle-eye-theme')).toBe('schematic')
  })
})
