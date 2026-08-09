import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useMediaQuery } from './use-media-query'

describe('useMediaQuery', () => {
  let listeners: Array<() => void>

  beforeEach(() => {
    listeners = []
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, cb: () => void) => {
        listeners.push(cb)
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('returns false when media query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(false)
  })

  it('returns true when media query matches', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(true)
  })

  it('updates when media query changes', () => {
    let currentMatches = false
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: currentMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, cb: () => void) => {
        listeners.push(cb)
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    expect(result.current).toBe(false)

    currentMatches = true
    act(() => {
      listeners.forEach((cb) => cb())
    })

    expect(result.current).toBe(true)
  })

  it('removes event listener on unmount', () => {
    const removeEventListener = vi.fn()
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener,
      dispatchEvent: vi.fn(),
    }))

    const { unmount } = renderHook(() => useMediaQuery('(max-width: 640px)'))
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
