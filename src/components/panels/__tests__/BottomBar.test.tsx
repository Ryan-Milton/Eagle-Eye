import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/stores/app-store'
import { BottomBar } from '../BottomBar'

const NOW = Date.parse('2026-07-20T12:00:00.000Z')
const MINUTE = 60 * 1000
const SIX_HOURS = 6 * 60 * MINUTE

describe('BottomBar timeline keyboard controls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    useAppStore.setState({
      sessionStart: NOW - 10 * MINUTE,
      timelineStart: NOW - SIX_HOURS,
      timelineCursor: NOW - 30 * MINUTE,
      timelineLive: false,
      timelinePlaying: false,
      timelineSpeed: 1,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('supports minute steps and window boundary keys', () => {
    render(<BottomBar />)
    const timeline = screen.getByRole('slider', { name: 'Six-hour operational timeline' })

    fireEvent.keyDown(timeline, { key: 'ArrowLeft' })
    expect(useAppStore.getState().timelineCursor).toBe(NOW - 31 * MINUTE)

    fireEvent.keyDown(timeline, { key: 'Home' })
    expect(useAppStore.getState().timelineCursor).toBe(NOW - SIX_HOURS)

    fireEvent.keyDown(timeline, { key: 'End' })
    expect(useAppStore.getState()).toMatchObject({ timelineCursor: NOW, timelineLive: true })
  })
})
