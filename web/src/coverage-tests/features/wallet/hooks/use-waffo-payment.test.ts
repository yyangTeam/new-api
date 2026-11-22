import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useWaffoPayment } from '@/features/wallet/hooks/use-waffo-payment'

const mockRequestWaffoPayment = vi.fn()
const mockIsApiSuccess = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockWindowOpen = vi.fn()

vi.mock('@/features/wallet/api', () => ({
  requestWaffoPayment: (...args: unknown[]) => mockRequestWaffoPayment(...args),
  isApiSuccess: (...args: unknown[]) => mockIsApiSuccess(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

describe('useWaffoPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsApiSuccess.mockImplementation(
      (res: { success?: boolean; message?: string }) =>
        res.success === true || res.message === 'success'
    )
    vi.stubGlobal('open', mockWindowOpen)
  })

  it('starts with processing=false', () => {
    const { result } = renderHook(() => useWaffoPayment())
    expect(result.current.processing).toBe(false)
  })

  it('processes waffo payment successfully and opens URL', async () => {
    mockRequestWaffoPayment.mockResolvedValue({
      success: true,
      data: { payment_url: 'https://waffo.com/pay/123' },
    })

    const { result } = renderHook(() => useWaffoPayment())

    let paymentResult: boolean = false
    await act(async () => {
      paymentResult = await result.current.processWaffoPayment(100, 2)
    })

    expect(paymentResult).toBe(true)
    expect(mockRequestWaffoPayment).toHaveBeenCalledWith({
      amount: 100,
      pay_method_index: 2,
    })
    expect(mockWindowOpen).toHaveBeenCalledWith('https://waffo.com/pay/123', '_blank')
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('floors the topup amount', async () => {
    mockRequestWaffoPayment.mockResolvedValue({
      success: true,
      data: { payment_url: 'https://waffo.com' },
    })

    const { result } = renderHook(() => useWaffoPayment())

    await act(async () => {
      await result.current.processWaffoPayment(99.9)
    })

    expect(mockRequestWaffoPayment).toHaveBeenCalledWith({
      amount: 99,
      pay_method_index: undefined,
    })
  })

  it('returns false when API returns failure', async () => {
    mockRequestWaffoPayment.mockResolvedValue({
      success: false,
      message: 'Service unavailable',
    })

    const { result } = renderHook(() => useWaffoPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPayment(50)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Service unavailable')
  })

  it('returns false when payment_url is missing', async () => {
    mockRequestWaffoPayment.mockResolvedValue({
      success: true,
      data: {},
    })

    const { result } = renderHook(() => useWaffoPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPayment(50)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('uses string data as error message', async () => {
    mockRequestWaffoPayment.mockResolvedValue({
      success: false,
      message: undefined,
      data: 'Custom error from backend',
    })

    const { result } = renderHook(() => useWaffoPayment())

    await act(async () => {
      await result.current.processWaffoPayment(50)
    })

    expect(mockToastError).toHaveBeenCalledWith('Custom error from backend')
  })

  it('returns false on exception', async () => {
    mockRequestWaffoPayment.mockRejectedValue(new Error('timeout'))

    const { result } = renderHook(() => useWaffoPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPayment(100)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('sets processing state during API call', async () => {
    let resolvePayment: (val: unknown) => void = () => {}
    mockRequestWaffoPayment.mockImplementation(
      () => new Promise((resolve) => { resolvePayment = resolve })
    )

    const { result } = renderHook(() => useWaffoPayment())

    let paymentPromise: Promise<boolean>
    act(() => {
      paymentPromise = result.current.processWaffoPayment(200)
    })

    expect(result.current.processing).toBe(true)

    await act(async () => {
      resolvePayment({ success: true, data: { payment_url: 'http://x.com' } })
      await paymentPromise!
    })

    expect(result.current.processing).toBe(false)
  })

  it('handles data that is not an object', async () => {
    mockRequestWaffoPayment.mockResolvedValue({
      success: true,
      data: null,
    })

    const { result } = renderHook(() => useWaffoPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPayment(50)
    })

    expect(paymentResult).toBe(false)
  })
})
