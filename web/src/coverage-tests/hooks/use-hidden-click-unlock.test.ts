import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { useHiddenClickUnlock } from '@/hooks/use-hidden-click-unlock'

describe('useHiddenClickUnlock', () => {
  it('starts in locked state', () => {
    const { result } = renderHook(() => useHiddenClickUnlock())
    expect(result.current.unlocked).toBe(false)
  })

  it('stays locked when clicks are below threshold', () => {
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 5 })
    )

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
      result.current.handleClick()
      result.current.handleClick()
    })

    expect(result.current.unlocked).toBe(false)
  })

  it('unlocks when clicks reach threshold (default 3)', () => {
    const { result } = renderHook(() => useHiddenClickUnlock())

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
      result.current.handleClick()
    })

    expect(result.current.unlocked).toBe(true)
  })

  it('unlocks at custom threshold', () => {
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 2 })
    )

    act(() => {
      result.current.handleClick()
    })
    expect(result.current.unlocked).toBe(false)

    act(() => {
      result.current.handleClick()
    })
    expect(result.current.unlocked).toBe(true)
  })

  it('calls onUnlock callback when unlocked', () => {
    const onUnlock = vi.fn()
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 2, onUnlock })
    )

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
    })

    expect(onUnlock).toHaveBeenCalledOnce()
  })

  it('does not respond to clicks after already unlocked', () => {
    const onUnlock = vi.fn()
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 2, onUnlock })
    )

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
    })
    expect(onUnlock).toHaveBeenCalledOnce()

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
    })
    // Should not fire again since already unlocked
    expect(onUnlock).toHaveBeenCalledOnce()
  })

  it('resets to locked state', () => {
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 2 })
    )

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
    })
    expect(result.current.unlocked).toBe(true)

    act(() => {
      result.current.reset()
    })
    expect(result.current.unlocked).toBe(false)
  })

  it('can unlock again after reset', () => {
    const onUnlock = vi.fn()
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 2, onUnlock })
    )

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
    })
    expect(result.current.unlocked).toBe(true)

    act(() => {
      result.current.reset()
    })

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
    })
    expect(result.current.unlocked).toBe(true)
    expect(onUnlock).toHaveBeenCalledTimes(2)
  })

  it('does not respond to clicks when disabled', () => {
    const { result } = renderHook(() =>
      useHiddenClickUnlock({ requiredClicks: 2, disabled: true })
    )

    act(() => {
      result.current.handleClick()
      result.current.handleClick()
      result.current.handleClick()
    })

    expect(result.current.unlocked).toBe(false)
  })
})
