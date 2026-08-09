import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { toast } from 'sonner'
import { copyToClipboard as copyToClipboardUtil } from '@/lib/copy-to-clipboard'
import { useCopyToClipboard } from './use-copy-to-clipboard'

const mockCopy = copyToClipboardUtil as ReturnType<typeof vi.fn>

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial state with copiedText as null', () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() => useCopyToClipboard())
    expect(result.current.copiedText).toBeNull()
  })

  it('sets copiedText on successful copy', async () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copyToClipboard('hello')
    })

    expect(result.current.copiedText).toBe('hello')
  })

  it('shows success toast when notify is true (default)', async () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    expect(toast.success).toHaveBeenCalledWith('Copied to clipboard')
  })

  it('does not show toast when notify is false', async () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() => useCopyToClipboard({ notify: false }))

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('uses custom success message', async () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() =>
      useCopyToClipboard({ successMessage: 'Done!' })
    )

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    expect(toast.success).toHaveBeenCalledWith('Done!')
  })

  it('resets copiedText after resetAfterMs', async () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() =>
      useCopyToClipboard({ resetAfterMs: 1000 })
    )

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    expect(result.current.copiedText).toBe('text')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.copiedText).toBeNull()
  })

  it('returns false and shows error toast on failed copy', async () => {
    mockCopy.mockResolvedValue(false)
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useCopyToClipboard())

    let success: boolean = true
    await act(async () => {
      success = await result.current.copyToClipboard('text')
    })

    expect(success).toBe(false)
    expect(result.current.copiedText).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Failed to copy to clipboard')
    consoleWarnSpy.mockRestore()
  })

  it('uses custom error message on failure', async () => {
    mockCopy.mockResolvedValue(false)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() =>
      useCopyToClipboard({ errorMessage: 'Oops!' })
    )

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    expect(toast.error).toHaveBeenCalledWith('Oops!')
  })

  it('does not show error toast when notify is false', async () => {
    mockCopy.mockResolvedValue(false)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() => useCopyToClipboard({ notify: false }))

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    expect(toast.error).not.toHaveBeenCalled()
  })

  it('clears previous timeout when copying again', async () => {
    mockCopy.mockResolvedValue(true)
    const { result } = renderHook(() =>
      useCopyToClipboard({ resetAfterMs: 2000 })
    )

    await act(async () => {
      await result.current.copyToClipboard('first')
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await act(async () => {
      await result.current.copyToClipboard('second')
    })

    expect(result.current.copiedText).toBe('second')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.copiedText).toBeNull()
  })

  it('cleans up timeout on unmount', async () => {
    mockCopy.mockResolvedValue(true)
    const { result, unmount } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current.copyToClipboard('text')
    })

    unmount()
    // Should not throw
    act(() => {
      vi.advanceTimersByTime(5000)
    })
  })
})
