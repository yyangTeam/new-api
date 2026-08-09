import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { PAYMENT_TYPES } from '../constants'
import { usePayment, requestPaymentAmount } from './use-payment'

const mockCalculateAmount = vi.fn()
const mockCalculateStripeAmount = vi.fn()
const mockCalculateWaffoAmount = vi.fn()
const mockCalculateWaffoPancakeAmount = vi.fn()
const mockRequestPayment = vi.fn()
const mockRequestStripePayment = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockSubmitPaymentForm = vi.fn()
const mockWindowOpen = vi.fn()

vi.mock('../api', () => ({
  calculateAmount: (...args: unknown[]) => mockCalculateAmount(...args),
  calculateStripeAmount: (...args: unknown[]) => mockCalculateStripeAmount(...args),
  calculateWaffoAmount: (...args: unknown[]) => mockCalculateWaffoAmount(...args),
  calculateWaffoPancakeAmount: (...args: unknown[]) => mockCalculateWaffoPancakeAmount(...args),
  requestPayment: (...args: unknown[]) => mockRequestPayment(...args),
  requestStripePayment: (...args: unknown[]) => mockRequestStripePayment(...args),
  isApiSuccess: (res: { success?: boolean; message?: string }) =>
    res.success === true || res.message === 'success',
}))

vi.mock('../lib', () => ({
  isStripePayment: (type: string) => type === 'stripe',
  isWaffoPayment: (type: string) => type === 'waffo',
  isWaffoPancakePayment: (type: string) => type === 'waffo_pancake',
  submitPaymentForm: (...args: unknown[]) => mockSubmitPaymentForm(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

describe('requestPaymentAmount', () => {
  it('uses regular calculator for alipay', async () => {
    const calculators = {
      regular: vi.fn().mockResolvedValue({ success: true, data: '10.00' }),
      stripe: vi.fn().mockResolvedValue({ success: true, data: '15.00' }),
      waffo: vi.fn().mockResolvedValue({ success: true, data: '12.00' }),
      waffoPancake: vi.fn().mockResolvedValue({ success: true, data: '13.00' }),
    }

    const result = await requestPaymentAmount(100, 'alipay', calculators)
    expect(result).toBe(10)
    expect(calculators.regular).toHaveBeenCalledWith({ amount: 100 })
  })

  it('uses stripe calculator for stripe', async () => {
    const calculators = {
      regular: vi.fn(),
      stripe: vi.fn().mockResolvedValue({ success: true, data: '15.00' }),
      waffo: vi.fn(),
      waffoPancake: vi.fn(),
    }

    const result = await requestPaymentAmount(100, PAYMENT_TYPES.STRIPE, calculators)
    expect(result).toBe(15)
    expect(calculators.stripe).toHaveBeenCalledWith({ amount: 100 })
  })

  it('uses waffo calculator for waffo', async () => {
    const calculators = {
      regular: vi.fn(),
      stripe: vi.fn(),
      waffo: vi.fn().mockResolvedValue({ success: true, data: '18.75' }),
      waffoPancake: vi.fn(),
    }

    const result = await requestPaymentAmount(120, PAYMENT_TYPES.WAFFO, calculators)
    expect(result).toBe(18.75)
    expect(calculators.waffo).toHaveBeenCalledWith({ amount: 120 })
  })

  it('uses waffoPancake calculator for waffo_pancake', async () => {
    const calculators = {
      regular: vi.fn(),
      stripe: vi.fn(),
      waffo: vi.fn(),
      waffoPancake: vi.fn().mockResolvedValue({ success: true, data: '25.00' }),
    }

    const result = await requestPaymentAmount(200, PAYMENT_TYPES.WAFFO_PANCAKE, calculators)
    expect(result).toBe(25)
    expect(calculators.waffoPancake).toHaveBeenCalledWith({ amount: 200 })
  })

  it('returns 0 when response is not successful', async () => {
    const calculators = {
      regular: vi.fn().mockResolvedValue({ success: false }),
      stripe: vi.fn(),
      waffo: vi.fn(),
      waffoPancake: vi.fn(),
    }

    const result = await requestPaymentAmount(100, 'alipay', calculators)
    expect(result).toBe(0)
  })

  it('returns 0 when response data is empty', async () => {
    const calculators = {
      regular: vi.fn().mockResolvedValue({ success: true, data: '' }),
      stripe: vi.fn(),
      waffo: vi.fn(),
      waffoPancake: vi.fn(),
    }

    const result = await requestPaymentAmount(100, 'alipay', calculators)
    expect(result).toBe(0)
  })
})

describe('usePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('open', mockWindowOpen)
  })

  it('starts with default states', () => {
    const { result } = renderHook(() => usePayment())
    expect(result.current.amount).toBe(0)
    expect(result.current.calculating).toBe(false)
    expect(result.current.processing).toBe(false)
  })

  it('calculatePaymentAmount calls API and updates amount', async () => {
    mockCalculateAmount.mockResolvedValue({ success: true, data: '50.00' })

    const { result } = renderHook(() => usePayment())

    let calculatedAmount: number = 0
    await act(async () => {
      calculatedAmount = await result.current.calculatePaymentAmount(500, 'alipay')
    })

    expect(calculatedAmount).toBe(50)
    expect(result.current.amount).toBe(50)
  })

  it('calculatePaymentAmount returns 0 on error', async () => {
    mockCalculateAmount.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => usePayment())

    let calculatedAmount: number = 99
    await act(async () => {
      calculatedAmount = await result.current.calculatePaymentAmount(500, 'alipay')
    })

    expect(calculatedAmount).toBe(0)
    expect(result.current.amount).toBe(0)
  })

  it('sets calculating state during calculation', async () => {
    let resolveCalc: (val: unknown) => void = () => {}
    mockCalculateAmount.mockImplementation(
      () => new Promise((resolve) => { resolveCalc = resolve })
    )

    const { result } = renderHook(() => usePayment())

    let calcPromise: Promise<number>
    act(() => {
      calcPromise = result.current.calculatePaymentAmount(100, 'alipay')
    })

    expect(result.current.calculating).toBe(true)

    await act(async () => {
      resolveCalc({ success: true, data: '10' })
      await calcPromise!
    })

    expect(result.current.calculating).toBe(false)
  })

  it('processPayment with stripe opens pay_link', async () => {
    mockRequestStripePayment.mockResolvedValue({
      success: true,
      data: { pay_link: 'https://stripe.com/session/123' },
    })

    const { result } = renderHook(() => usePayment())

    let payResult: boolean = false
    await act(async () => {
      payResult = await result.current.processPayment(100, 'stripe')
    })

    expect(payResult).toBe(true)
    expect(mockRequestStripePayment).toHaveBeenCalledWith({
      amount: 100,
      payment_method: 'stripe',
    })
    expect(mockWindowOpen).toHaveBeenCalledWith('https://stripe.com/session/123', '_blank')
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('processPayment with regular calls submitPaymentForm', async () => {
    mockRequestPayment.mockResolvedValue({
      success: true,
      data: { order_id: '456' },
      url: 'http://payment.com/form',
    })

    const { result } = renderHook(() => usePayment())

    let payResult: boolean = false
    await act(async () => {
      payResult = await result.current.processPayment(200, 'alipay')
    })

    expect(payResult).toBe(true)
    expect(mockRequestPayment).toHaveBeenCalledWith({
      amount: 200,
      payment_method: 'alipay',
    })
    expect(mockSubmitPaymentForm).toHaveBeenCalled()
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('processPayment returns false on API failure', async () => {
    mockRequestPayment.mockResolvedValue({
      success: false,
      message: 'Insufficient balance',
    })

    const { result } = renderHook(() => usePayment())

    let payResult: boolean = true
    await act(async () => {
      payResult = await result.current.processPayment(9999, 'alipay')
    })

    expect(payResult).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Insufficient balance')
  })

  it('processPayment returns false on exception', async () => {
    mockRequestPayment.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => usePayment())

    let payResult: boolean = true
    await act(async () => {
      payResult = await result.current.processPayment(100, 'alipay')
    })

    expect(payResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('processPayment returns false when stripe has no pay_link', async () => {
    mockRequestStripePayment.mockResolvedValue({
      success: true,
      data: {},
    })

    const { result } = renderHook(() => usePayment())

    let payResult: boolean = true
    await act(async () => {
      payResult = await result.current.processPayment(100, 'stripe')
    })

    expect(payResult).toBe(false)
  })

  it('processPayment returns false when regular has no URL', async () => {
    mockRequestPayment.mockResolvedValue({
      success: true,
      data: { order_id: '123' },
    })

    const { result } = renderHook(() => usePayment())

    let payResult: boolean = true
    await act(async () => {
      payResult = await result.current.processPayment(100, 'alipay')
    })

    expect(payResult).toBe(false)
  })

  it('processPayment floors the amount', async () => {
    mockRequestPayment.mockResolvedValue({
      success: true,
      data: { order_id: '1' },
      url: 'http://pay.com',
    })

    const { result } = renderHook(() => usePayment())

    await act(async () => {
      await result.current.processPayment(99.9, 'alipay')
    })

    expect(mockRequestPayment).toHaveBeenCalledWith({
      amount: 99,
      payment_method: 'alipay',
    })
  })

  it('sets processing state during payment', async () => {
    let resolvePayment: (val: unknown) => void = () => {}
    mockRequestPayment.mockImplementation(
      () => new Promise((resolve) => { resolvePayment = resolve })
    )

    const { result } = renderHook(() => usePayment())

    let payPromise: Promise<boolean>
    act(() => {
      payPromise = result.current.processPayment(100, 'alipay')
    })

    expect(result.current.processing).toBe(true)

    await act(async () => {
      resolvePayment({ success: true, data: {}, url: 'http://x.com' })
      await payPromise!
    })

    expect(result.current.processing).toBe(false)
  })

  it('setAmount updates amount state directly', () => {
    const { result } = renderHook(() => usePayment())

    act(() => {
      result.current.setAmount(42)
    })

    expect(result.current.amount).toBe(42)
  })
})
