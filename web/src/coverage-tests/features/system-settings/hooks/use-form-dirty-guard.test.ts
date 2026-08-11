import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(),
}))

import { useBlocker } from '@tanstack/react-router'
import { useFormDirtyGuard } from '@/features/system-settings/hooks/use-form-dirty-guard'

describe('useFormDirtyGuard', () => {
  const mockUseBlocker = vi.mocked(useBlocker)

  beforeEach(() => {
    mockUseBlocker.mockImplementation(() => ({}) as ReturnType<typeof useBlocker>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls useBlocker with isDirty=false and default message', () => {
    renderHook(() => useFormDirtyGuard(false))
    expect(mockUseBlocker).toHaveBeenCalledWith({
      condition: false,
      blockerFn: expect.any(Function),
    })
  })

  it('calls useBlocker with isDirty=true and default message', () => {
    renderHook(() => useFormDirtyGuard(true))
    expect(mockUseBlocker).toHaveBeenCalledWith({
      condition: true,
      blockerFn: expect.any(Function),
    })
  })

  it('calls useBlocker with custom message', () => {
    window.confirm = vi.fn().mockReturnValue(true)
    renderHook(() => useFormDirtyGuard(true, 'Custom leave message'))
    // The last call to useBlocker should have the custom message via blockerFn closure
    const lastCallIdx = mockUseBlocker.mock.calls.length - 1
    const call = mockUseBlocker.mock.calls[lastCallIdx][0]
    ;(call as { blockerFn: () => boolean }).blockerFn()
    expect(window.confirm).toHaveBeenCalledWith('Custom leave message')
  })

  it('blockerFn calls window.confirm with the message', () => {
    window.confirm = vi.fn().mockReturnValue(false)
    renderHook(() => useFormDirtyGuard(true))
    const call = mockUseBlocker.mock.calls[0][0]
    const result = (call as { blockerFn: () => boolean }).blockerFn()
    expect(window.confirm).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to leave?'
    )
    expect(result).toBe(false)
  })

  it('does not add beforeunload listener when isDirty is false', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useFormDirtyGuard(false))
    expect(addSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
    addSpy.mockRestore()
  })

  it('adds beforeunload listener when isDirty is true', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    renderHook(() => useFormDirtyGuard(true))
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    addSpy.mockRestore()
  })

  it('removes beforeunload listener on unmount when isDirty is true', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useFormDirtyGuard(true))
    unmount()
    expect(removeSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
    removeSpy.mockRestore()
  })

  it('removes beforeunload listener when isDirty changes to false', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { rerender } = renderHook(
      ({ isDirty }: { isDirty: boolean }) => useFormDirtyGuard(isDirty),
      { initialProps: { isDirty: true } }
    )
    rerender({ isDirty: false })
    expect(removeSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function)
    )
    removeSpy.mockRestore()
  })

  it('beforeunload handler sets e.returnValue and calls preventDefault', () => {
    let handler: ((e: BeforeUnloadEvent) => string | void) | undefined
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (event: string, fn: unknown) => {
        if (event === 'beforeunload') {
          handler = fn as (e: BeforeUnloadEvent) => string | void
        }
      }
    )

    renderHook(() => useFormDirtyGuard(true, 'Leave now?'))

    expect(handler).toBeDefined()
    const event = new Event('beforeunload') as BeforeUnloadEvent
    Object.defineProperty(event, 'returnValue', { writable: true, value: '' })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    const result = handler!(event)
    expect(preventSpy).toHaveBeenCalled()
    expect(event.returnValue).toBe('Leave now?')
    expect(result).toBe('Leave now?')
  })
})
