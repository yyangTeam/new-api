import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useIsMobile } from '@/hooks/use-mobile'

describe('useIsMobile', () => {
  let changeListeners: Array<() => void>

  beforeEach(() => {
    changeListeners = []
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, cb: () => void) => {
        changeListeners.push(cb)
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('returns false for desktop viewport (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for mobile viewport (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true at 767px', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('updates when viewport changes via matchMedia change event', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    Object.defineProperty(window, 'innerWidth', { value: 500 })
    act(() => {
      changeListeners.forEach((cb) => cb())
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

    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
