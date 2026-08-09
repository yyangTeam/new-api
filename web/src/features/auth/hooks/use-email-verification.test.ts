import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useEmailVerification } from './use-email-verification'

const mockSendEmailVerification = vi.fn()

vi.mock('../api', () => ({
  sendEmailVerification: (...args: unknown[]) =>
    mockSendEmailVerification(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

describe('useEmailVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('returns initial state with isSending false and isActive false', () => {
    const { result } = renderHook(() => useEmailVerification())

    expect(result.current.isSending).toBe(false)
    expect(result.current.isActive).toBe(false)
  })

  it('shows error when email is empty', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useEmailVerification())

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result.current.sendCode('')
    })

    expect(returnValue).toBe(false)
    expect(toast.error).toHaveBeenCalled()
    expect(mockSendEmailVerification).not.toHaveBeenCalled()
  })

  it('calls sendEmailVerification and starts countdown on success', async () => {
    const { toast } = await import('sonner')
    mockSendEmailVerification.mockResolvedValue({ success: true })
    const { result } = renderHook(() => useEmailVerification())

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result.current.sendCode('user@example.com')
    })

    expect(returnValue).toBe(true)
    expect(mockSendEmailVerification).toHaveBeenCalledWith(
      'user@example.com',
      undefined
    )
    expect(toast.success).toHaveBeenCalled()
    expect(result.current.isActive).toBe(true)
  })

  it('returns false and shows error when API returns failure', async () => {
    const { toast } = await import('sonner')
    mockSendEmailVerification.mockResolvedValue({
      success: false,
      message: 'Rate limited',
    })
    const { result } = renderHook(() => useEmailVerification())

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result.current.sendCode('user@example.com')
    })

    expect(returnValue).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Rate limited')
  })

  it('returns false when validateTurnstile fails', async () => {
    const validateTurnstile = vi.fn().mockReturnValue(false)
    const { result } = renderHook(() =>
      useEmailVerification({ validateTurnstile })
    )

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result.current.sendCode('user@example.com')
    })

    expect(returnValue).toBe(false)
    expect(mockSendEmailVerification).not.toHaveBeenCalled()
  })

  it('passes turnstileToken to sendEmailVerification', async () => {
    mockSendEmailVerification.mockResolvedValue({ success: true })
    const { result } = renderHook(() =>
      useEmailVerification({
        turnstileToken: 'token-abc',
        validateTurnstile: () => true,
      })
    )

    await act(async () => {
      await result.current.sendCode('user@example.com')
    })

    expect(mockSendEmailVerification).toHaveBeenCalledWith(
      'user@example.com',
      'token-abc'
    )
  })

  it('handles API exception gracefully', async () => {
    mockSendEmailVerification.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useEmailVerification())

    let returnValue: boolean | undefined
    await act(async () => {
      returnValue = await result.current.sendCode('user@example.com')
    })

    expect(returnValue).toBe(false)
    expect(result.current.isSending).toBe(false)
  })
})
