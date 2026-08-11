import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useRedemption } from '@/features/wallet/hooks/use-redemption'

const mockRedeemTopupCode = vi.fn()
const mockGetSelf = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('@/features/wallet/api', () => ({
  redeemTopupCode: (...args: unknown[]) => mockRedeemTopupCode(...args),
}))

vi.mock('@/lib/api', () => ({
  getSelf: (...args: unknown[]) => mockGetSelf(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (quota: number) => `$${quota}`,
}))

describe('useRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSelf.mockResolvedValue(undefined)
  })

  it('starts with redeeming=false', () => {
    const { result } = renderHook(() => useRedemption())
    expect(result.current.redeeming).toBe(false)
  })

  it('shows error toast for empty code', async () => {
    const { result } = renderHook(() => useRedemption())

    let returnValue: boolean = true
    await act(async () => {
      returnValue = await result.current.redeemCode('')
    })

    expect(returnValue).toBe(false)
    expect(mockToastError).toHaveBeenCalledOnce()
    expect(mockRedeemTopupCode).not.toHaveBeenCalled()
  })

  it('shows error toast for whitespace-only code', async () => {
    const { result } = renderHook(() => useRedemption())

    let returnValue: boolean = true
    await act(async () => {
      returnValue = await result.current.redeemCode('   ')
    })

    expect(returnValue).toBe(false)
    expect(mockToastError).toHaveBeenCalledOnce()
  })

  it('returns true and shows success toast on successful redemption', async () => {
    mockRedeemTopupCode.mockResolvedValue({
      success: true,
      data: 500,
    })

    const { result } = renderHook(() => useRedemption())

    let returnValue: boolean = false
    await act(async () => {
      returnValue = await result.current.redeemCode('VALID-CODE')
    })

    expect(returnValue).toBe(true)
    expect(mockRedeemTopupCode).toHaveBeenCalledWith({ key: 'VALID-CODE' })
    expect(mockToastSuccess).toHaveBeenCalledOnce()
    expect(mockGetSelf).toHaveBeenCalledOnce()
  })

  it('returns false and shows error toast when API returns failure', async () => {
    mockRedeemTopupCode.mockResolvedValue({
      success: false,
      message: 'Invalid code',
    })

    const { result } = renderHook(() => useRedemption())

    let returnValue: boolean = true
    await act(async () => {
      returnValue = await result.current.redeemCode('BAD-CODE')
    })

    expect(returnValue).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Invalid code')
  })

  it('returns false and shows generic error on API exception', async () => {
    mockRedeemTopupCode.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useRedemption())

    let returnValue: boolean = true
    await act(async () => {
      returnValue = await result.current.redeemCode('SOME-CODE')
    })

    expect(returnValue).toBe(false)
    expect(mockToastError).toHaveBeenCalledOnce()
  })

  it('sets redeeming=true during API call and resets after', async () => {
    let resolvePromise: (value: unknown) => void = () => {}
    mockRedeemTopupCode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve
        })
    )

    const { result } = renderHook(() => useRedemption())

    let redeemPromise: Promise<boolean>
    act(() => {
      redeemPromise = result.current.redeemCode('CODE')
    })

    // During the API call, redeeming should be true
    expect(result.current.redeeming).toBe(true)

    // Resolve the promise
    await act(async () => {
      resolvePromise({ success: true, data: 100 })
      await redeemPromise!
    })

    expect(result.current.redeeming).toBe(false)
  })

  it('shows fallback error message when API returns no message', async () => {
    mockRedeemTopupCode.mockResolvedValue({
      success: false,
      message: '',
    })

    const { result } = renderHook(() => useRedemption())

    await act(async () => {
      await result.current.redeemCode('CODE')
    })

    // Should use the i18next translated fallback
    expect(mockToastError).toHaveBeenCalledOnce()
  })
})
