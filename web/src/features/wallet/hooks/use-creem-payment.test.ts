import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useCreemPayment } from './use-creem-payment'

const mockRequestCreemPayment = vi.fn()
const mockIsApiSuccess = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockWindowOpen = vi.fn()

vi.mock('../api', () => ({
  requestCreemPayment: (...args: unknown[]) => mockRequestCreemPayment(...args),
  isApiSuccess: (...args: unknown[]) => mockIsApiSuccess(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

describe('useCreemPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsApiSuccess.mockImplementation(
      (res: { success?: boolean; message?: string }) =>
        res.success === true || res.message === 'success'
    )
    vi.stubGlobal('open', mockWindowOpen)
  })

  it('starts with processing=false', () => {
    const { result } = renderHook(() => useCreemPayment())
    expect(result.current.processing).toBe(false)
  })

  it('processes creem payment successfully and opens checkout URL', async () => {
    mockRequestCreemPayment.mockResolvedValue({
      success: true,
      data: { checkout_url: 'https://creem.com/checkout/123' },
    })

    const { result } = renderHook(() => useCreemPayment())

    let paymentResult: boolean = false
    await act(async () => {
      paymentResult = await result.current.processCreemPayment('prod_123')
    })

    expect(paymentResult).toBe(true)
    expect(mockRequestCreemPayment).toHaveBeenCalledWith({
      product_id: 'prod_123',
      payment_method: 'creem',
    })
    expect(mockWindowOpen).toHaveBeenCalledWith('https://creem.com/checkout/123', '_blank')
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('returns false when API returns failure', async () => {
    mockRequestCreemPayment.mockResolvedValue({
      success: false,
      message: 'Product not found',
    })

    const { result } = renderHook(() => useCreemPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processCreemPayment('bad_prod')
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Product not found')
    expect(mockWindowOpen).not.toHaveBeenCalled()
  })

  it('returns false when checkout_url is missing', async () => {
    mockRequestCreemPayment.mockResolvedValue({
      success: true,
      data: {},
    })

    const { result } = renderHook(() => useCreemPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processCreemPayment('prod_x')
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('returns false and shows error on exception', async () => {
    mockRequestCreemPayment.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => useCreemPayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processCreemPayment('prod_y')
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('sets processing during API call', async () => {
    let resolvePayment: (val: unknown) => void = () => {}
    mockRequestCreemPayment.mockImplementation(
      () => new Promise((resolve) => { resolvePayment = resolve })
    )

    const { result } = renderHook(() => useCreemPayment())

    let paymentPromise: Promise<boolean>
    act(() => {
      paymentPromise = result.current.processCreemPayment('prod_z')
    })

    expect(result.current.processing).toBe(true)

    await act(async () => {
      resolvePayment({ success: true, data: { checkout_url: 'https://x.com' } })
      await paymentPromise!
    })

    expect(result.current.processing).toBe(false)
  })

  it('shows fallback error message when no message in response', async () => {
    mockRequestCreemPayment.mockResolvedValue({
      success: false,
    })

    const { result } = renderHook(() => useCreemPayment())

    await act(async () => {
      await result.current.processCreemPayment('prod')
    })

    expect(mockToastError).toHaveBeenCalled()
  })
})
