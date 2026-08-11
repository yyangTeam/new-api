import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useWaffoPancakePayment } from '@/features/wallet/hooks/use-waffo-pancake-payment'

const mockRequestWaffoPancakePayment = vi.fn()
const mockIsApiSuccess = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/features/wallet/api', () => ({
  requestWaffoPancakePayment: (...args: unknown[]) => mockRequestWaffoPancakePayment(...args),
  isApiSuccess: (...args: unknown[]) => mockIsApiSuccess(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

describe('useWaffoPancakePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsApiSuccess.mockImplementation(
      (res: { success?: boolean; message?: string }) =>
        res.success === true || res.message === 'success'
    )
    // Mock window.location.href setter
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: '' },
    })
  })

  it('starts with processing=false', () => {
    const { result } = renderHook(() => useWaffoPancakePayment())
    expect(result.current.processing).toBe(false)
  })

  it('processes payment and redirects to checkout URL', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { checkout_url: 'https://pancake.waffo.com/checkout/abc' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = false
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(true)
    expect(mockRequestWaffoPancakePayment).toHaveBeenCalledWith({ amount: 100 })
    expect(window.location.href).toBe('https://pancake.waffo.com/checkout/abc')
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('floors the topup amount', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { checkout_url: 'https://x.com/pay' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    await act(async () => {
      await result.current.processWaffoPancakePayment(75.9)
    })

    expect(mockRequestWaffoPancakePayment).toHaveBeenCalledWith({ amount: 75 })
  })

  it('rejects unsafe checkout URLs (javascript:)', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { checkout_url: 'javascript:alert(1)' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('rejects unsafe checkout URLs (data:)', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { checkout_url: 'data:text/html,<h1>evil</h1>' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('rejects empty checkout URL', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { checkout_url: '' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(false)
  })

  it('returns false when API returns failure', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: false,
      message: 'Amount too low',
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(1)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Amount too low')
  })

  it('returns false when checkout_url is missing from data', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { session_id: 'abc' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('uses string data as error message', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: false,
      message: undefined,
      data: 'Backend says no',
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    await act(async () => {
      await result.current.processWaffoPancakePayment(50)
    })

    expect(mockToastError).toHaveBeenCalledWith('Backend says no')
  })

  it('returns false on exception', async () => {
    mockRequestWaffoPancakePayment.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('sets processing state during API call', async () => {
    let resolvePayment: (val: unknown) => void = () => {}
    mockRequestWaffoPancakePayment.mockImplementation(
      () => new Promise((resolve) => { resolvePayment = resolve })
    )

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentPromise: Promise<boolean>
    act(() => {
      paymentPromise = result.current.processWaffoPancakePayment(200)
    })

    expect(result.current.processing).toBe(true)

    await act(async () => {
      resolvePayment({ success: true, data: { checkout_url: 'https://ok.com' } })
      await paymentPromise!
    })

    expect(result.current.processing).toBe(false)
  })

  it('handles data that is null', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: null,
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = true
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(false)
  })

  it('allows http: URLs as checkout targets', async () => {
    mockRequestWaffoPancakePayment.mockResolvedValue({
      success: true,
      data: { checkout_url: 'http://staging.example.com/pay' },
    })

    const { result } = renderHook(() => useWaffoPancakePayment())

    let paymentResult: boolean = false
    await act(async () => {
      paymentResult = await result.current.processWaffoPancakePayment(100)
    })

    expect(paymentResult).toBe(true)
    expect(window.location.href).toBe('http://staging.example.com/pay')
  })
})
