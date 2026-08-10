import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from 'sonner'

import { useMessageActionGuard } from './use-message-action-guard'

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('useMessageActionGuard', () => {
  it('calls action when not generating', () => {
    const { result } = renderHook(() => useMessageActionGuard(false))
    const action = vi.fn()
    const guarded = result.current.guardAction(action)

    act(() => { guarded() })

    expect(action).toHaveBeenCalledTimes(1)
    expect(toast.warning).not.toHaveBeenCalled()
  })

  it('shows warning and blocks action when generating', () => {
    const { result } = renderHook(() => useMessageActionGuard(true))
    const action = vi.fn()
    const guarded = result.current.guardAction(action)

    act(() => { guarded() })

    expect(action).not.toHaveBeenCalled()
    expect(toast.warning).toHaveBeenCalledWith(
      'Please wait for the current generation to complete'
    )
  })

  it('guardAction correctly reflects updated isGenerating state', () => {
    const { result, rerender } = renderHook(
      ({ isGenerating }) => useMessageActionGuard(isGenerating),
      { initialProps: { isGenerating: false } }
    )
    const action = vi.fn()

    // Initially allows action
    act(() => { result.current.guardAction(action)() })
    expect(action).toHaveBeenCalledTimes(1)

    // After changing to generating, blocks action
    rerender({ isGenerating: true })
    act(() => { result.current.guardAction(action)() })
    expect(action).toHaveBeenCalledTimes(1) // not called again
    expect(toast.warning).toHaveBeenCalled()
  })

  it('updates guardAction reference when isGenerating changes', () => {
    const { result, rerender } = renderHook(
      ({ isGenerating }) => useMessageActionGuard(isGenerating),
      { initialProps: { isGenerating: false } }
    )
    const firstRef = result.current.guardAction
    rerender({ isGenerating: true })
    expect(result.current.guardAction).not.toBe(firstRef)
  })
})
