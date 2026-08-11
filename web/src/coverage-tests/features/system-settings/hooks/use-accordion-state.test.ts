import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useAccordionState } from '@/features/system-settings/hooks/use-accordion-state'

describe('useAccordionState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty openItems when nothing stored', () => {
    const { result } = renderHook(() => useAccordionState('general'))
    expect(result.current.openItems).toEqual([])
  })

  it('loads initial state from localStorage', () => {
    localStorage.setItem(
      'system-settings-general-accordion',
      JSON.stringify(['section-1', 'section-2'])
    )
    const { result } = renderHook(() => useAccordionState('general'))
    expect(result.current.openItems).toEqual(['section-1', 'section-2'])
  })

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorage.setItem(
      'system-settings-test-accordion',
      'not-valid-json{'
    )
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useAccordionState('test'))
    expect(result.current.openItems).toEqual([])
    consoleSpy.mockRestore()
  })

  it('updates openItems immediately on change', () => {
    const { result } = renderHook(() => useAccordionState('page'))
    act(() => {
      result.current.handleAccordionChange(['item-a'])
    })
    expect(result.current.openItems).toEqual(['item-a'])
  })

  it('supports multiple items open simultaneously', () => {
    const { result } = renderHook(() => useAccordionState('page'))
    act(() => {
      result.current.handleAccordionChange(['item-a', 'item-b', 'item-c'])
    })
    expect(result.current.openItems).toEqual(['item-a', 'item-b', 'item-c'])
  })

  it('does not persist to localStorage before debounce delay', () => {
    const { result } = renderHook(() => useAccordionState('page'))
    act(() => {
      result.current.handleAccordionChange(['section-1'])
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(localStorage.getItem('system-settings-page-accordion')).toBeNull()
  })

  it('persists to localStorage after 500ms debounce', () => {
    const { result } = renderHook(() => useAccordionState('page'))
    act(() => {
      result.current.handleAccordionChange(['section-1'])
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(localStorage.getItem('system-settings-page-accordion')).toBe(
      JSON.stringify(['section-1'])
    )
  })

  it('debounces rapid changes and only persists last value', () => {
    const { result } = renderHook(() => useAccordionState('page'))
    act(() => {
      result.current.handleAccordionChange(['a'])
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.handleAccordionChange(['a', 'b'])
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      result.current.handleAccordionChange(['a', 'b', 'c'])
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(localStorage.getItem('system-settings-page-accordion')).toBe(
      JSON.stringify(['a', 'b', 'c'])
    )
  })

  it('uses different storage keys for different pageIds', () => {
    const { result: result1 } = renderHook(() =>
      useAccordionState('general')
    )
    const { result: result2 } = renderHook(() =>
      useAccordionState('advanced')
    )

    act(() => {
      result1.current.handleAccordionChange(['x'])
    })
    act(() => {
      result2.current.handleAccordionChange(['y'])
    })
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(localStorage.getItem('system-settings-general-accordion')).toBe(
      JSON.stringify(['x'])
    )
    expect(localStorage.getItem('system-settings-advanced-accordion')).toBe(
      JSON.stringify(['y'])
    )
  })

  it('cancels pending debounce on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useAccordionState('page')
    )
    act(() => {
      result.current.handleAccordionChange(['pending'])
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(localStorage.getItem('system-settings-page-accordion')).toBeNull()
  })
})
