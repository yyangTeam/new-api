import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useTurnstile } from './use-turnstile'

const mockUseStatus = vi.fn()

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => mockUseStatus(),
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('useTurnstile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports turnstile disabled when status has no turnstile config', () => {
    mockUseStatus.mockReturnValue({ status: {} })
    const { result } = renderHook(() => useTurnstile())

    expect(result.current.isTurnstileEnabled).toBe(false)
    expect(result.current.turnstileSiteKey).toBe('')
  })

  it('reports turnstile enabled when status has both turnstile_check and turnstile_site_key', () => {
    mockUseStatus.mockReturnValue({
      status: { turnstile_check: true, turnstile_site_key: 'site-key-123' },
    })
    const { result } = renderHook(() => useTurnstile())

    expect(result.current.isTurnstileEnabled).toBe(true)
    expect(result.current.turnstileSiteKey).toBe('site-key-123')
  })

  it('validates successfully when turnstile is disabled', () => {
    mockUseStatus.mockReturnValue({ status: {} })
    const { result } = renderHook(() => useTurnstile())

    expect(result.current.validateTurnstile()).toBe(true)
  })

  it('fails validation when turnstile is enabled but token is empty', async () => {
    const { toast } = await import('sonner')
    mockUseStatus.mockReturnValue({
      status: { turnstile_check: true, turnstile_site_key: 'key' },
    })
    const { result } = renderHook(() => useTurnstile())

    expect(result.current.validateTurnstile()).toBe(false)
    expect(toast.info).toHaveBeenCalled()
  })

  it('passes validation when turnstile is enabled and token is set', () => {
    mockUseStatus.mockReturnValue({
      status: { turnstile_check: true, turnstile_site_key: 'key' },
    })
    const { result } = renderHook(() => useTurnstile())

    act(() => {
      result.current.setTurnstileToken('valid-token')
    })

    expect(result.current.validateTurnstile()).toBe(true)
  })

  it('exposes setTurnstileToken to update the token', () => {
    mockUseStatus.mockReturnValue({ status: {} })
    const { result } = renderHook(() => useTurnstile())

    expect(result.current.turnstileToken).toBe('')
    act(() => {
      result.current.setTurnstileToken('new-token')
    })
    expect(result.current.turnstileToken).toBe('new-token')
  })
})
