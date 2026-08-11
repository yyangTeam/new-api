import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// This tests the .tsx version of use-mobile which is functionally identical to .ts
// Both files export useIsMobile with the same implementation.
// We import explicitly from the .tsx file for coverage.

describe('useIsMobile (tsx variant)', () => {
  beforeEach(() => {
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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  it('returns false for desktop viewport', async () => {
    // Dynamic import to explicitly get the .tsx version
    const { useIsMobile } = await import('@/hooks/use-mobile.tsx')
    Object.defineProperty(window, 'innerWidth', { value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true for mobile viewport', async () => {
    const { useIsMobile } = await import('@/hooks/use-mobile.tsx')
    Object.defineProperty(window, 'innerWidth', { value: 500 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })
})
