import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useMinimumLoadingTime } from '@/hooks/use-minimum-loading-time'

describe('useMinimumLoadingTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns true while loading is true', () => {
    const { result } = renderHook(() => useMinimumLoadingTime(true, 1000))
    expect(result.current).toBe(true)
  })

  it('keeps returning true for minimum time even after loading completes early', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useMinimumLoadingTime(loading, 1000),
      { initialProps: { loading: true } }
    )

    expect(result.current).toBe(true)

    // Loading finishes after 200ms
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ loading: false })

    // Should still show skeleton because minimum time hasn't elapsed
    expect(result.current).toBe(true)

    // Advance to remaining time (800ms)
    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current).toBe(false)
  })

  it('returns false immediately when loading ends after minimum time has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useMinimumLoadingTime(loading, 500),
      { initialProps: { loading: true } }
    )

    // Advance past minimum time
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Now stop loading
    rerender({ loading: false })

    expect(result.current).toBe(false)
  })

  it('uses default minimum time of 1000ms', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useMinimumLoadingTime(loading),
      { initialProps: { loading: true } }
    )

    // Stop loading immediately
    act(() => {
      vi.advanceTimersByTime(0)
    })
    rerender({ loading: false })

    // Should still show because default 1000ms hasn't elapsed
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe(false)
  })

  it('resets timer when loading starts again', () => {
    const { result, rerender } = renderHook(
      ({ loading }) => useMinimumLoadingTime(loading, 500),
      { initialProps: { loading: true } }
    )

    // Stop loading after 100ms
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ loading: false })
    expect(result.current).toBe(true)

    // Start loading again before timeout fires
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ loading: true })
    expect(result.current).toBe(true)

    // Stop loading again - timer should reset from new start
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender({ loading: false })
    expect(result.current).toBe(true)

    // Wait for the remaining time from new start
    act(() => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current).toBe(false)
  })

  it('returns false when initialized with loading=false', () => {
    const { result } = renderHook(() => useMinimumLoadingTime(false, 500))
    expect(result.current).toBe(false)
  })
})
