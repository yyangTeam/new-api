import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useTopupInfo } from './use-topup-info'

const mockGetTopupInfo = vi.fn()

vi.mock('../api', () => ({
  getTopupInfo: (...args: unknown[]) => mockGetTopupInfo(...args),
}))

vi.mock('../lib', () => ({
  generatePresetAmounts: (minAmount: number) =>
    [1, 5, 10].map((m) => ({ value: minAmount * m })),
  mergePresetAmounts: (amounts: number[], discounts: Record<number, number>) =>
    amounts.map((a) => ({ value: a, discount: discounts[a] || 1.0 })),
  getMinTopupAmount: (info: { min_topup?: number } | null) =>
    info?.min_topup || 1,
}))

describe('useTopupInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading state', () => {
    mockGetTopupInfo.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useTopupInfo())
    expect(result.current.loading).toBe(true)
    expect(result.current.topupInfo).toBe(null)
  })

  it('fetches topup info on mount and processes data', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        enable_stripe_topup: false,
        pay_methods: [{ name: 'Alipay', type: 'alipay' }],
        min_topup: 5,
        stripe_min_topup: 10,
        amount_options: [10, 50, 100],
        discount: { '50': 0.9 },
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.topupInfo).not.toBeNull()
    expect(result.current.topupInfo!.enable_online_topup).toBe(true)
    expect(result.current.presetAmounts.length).toBeGreaterThan(0)
  })

  it('generates default presets when amount_options is empty', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [],
        min_topup: 2,
        stripe_min_topup: 5,
        amount_options: [],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.presetAmounts).toEqual([
      { value: 2 },
      { value: 10 },
      { value: 20 },
    ])
  })

  it('handles failed response (success=false)', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.topupInfo).toBe(null)
  })

  it('handles API exception', async () => {
    mockGetTopupInfo.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.topupInfo).toBe(null)
  })

  it('refetch re-fetches data', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: false,
        pay_methods: [],
        min_topup: 1,
        stripe_min_topup: 1,
        amount_options: [],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(mockGetTopupInfo).toHaveBeenCalledTimes(1)

    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [],
        min_topup: 10,
        stripe_min_topup: 20,
        amount_options: [50],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockGetTopupInfo).toHaveBeenCalledTimes(2)
    expect(result.current.topupInfo!.enable_online_topup).toBe(true)
  })

  it('parses pay_methods correctly (filters out waffo type)', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [
          { name: 'Alipay', type: 'alipay' },
          { name: 'Waffo', type: 'waffo' },
          { name: 'Stripe', type: 'stripe' },
        ],
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    const methods = result.current.topupInfo!.pay_methods
    expect(methods.find((m) => m.type === 'waffo')).toBeUndefined()
    expect(methods.find((m) => m.type === 'alipay')).toBeDefined()
  })

  it('parses pay_methods from JSON string', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: JSON.stringify([{ name: 'Alipay', type: 'alipay' }]),
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.topupInfo!.pay_methods).toHaveLength(1)
  })

  it('parses discount from JSON string', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [],
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [10, 50],
        discount: '{"50": 0.8}',
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.topupInfo!.discount).toEqual({ 50: 0.8 })
  })

  it('handles invalid discount JSON gracefully', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [],
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [],
        discount: 'not-json',
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.topupInfo!.discount).toEqual({})
  })

  it('parses creem products correctly', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [],
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [],
        discount: {},
        creem_products: [
          { name: 'Basic', productId: 'prod_1', price: 9.99, quota: 100, currency: 'USD' },
          { name: '', productId: 'prod_2', price: 5, quota: 50, currency: 'EUR' },
        ],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    // Second product has empty name so should be filtered out
    expect(result.current.topupInfo!.creem_products).toHaveLength(1)
    expect(result.current.topupInfo!.creem_products![0].name).toBe('Basic')
  })

  it('parses waffo pay methods correctly', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [],
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [
          { name: 'Bank Transfer', payMethodType: 'bank', payMethodName: 'transfer' },
          { name: '', payMethodType: 'card' },
        ],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    // Second method has empty name so filtered
    expect(result.current.topupInfo!.waffo_pay_methods).toHaveLength(1)
    expect(result.current.topupInfo!.waffo_pay_methods![0].name).toBe('Bank Transfer')
  })

  it('handles null data in response', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: null,
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.topupInfo).toBe(null)
  })

  it('uses stripe_min_topup for stripe payment methods with 0 min_topup', async () => {
    mockGetTopupInfo.mockResolvedValue({
      success: true,
      data: {
        enable_online_topup: true,
        pay_methods: [{ name: 'Stripe', type: 'stripe', min_topup: 0 }],
        min_topup: 1,
        stripe_min_topup: 15,
        amount_options: [],
        discount: {},
        creem_products: [],
        waffo_pay_methods: [],
      },
    })

    const { result } = renderHook(() => useTopupInfo())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.topupInfo!.pay_methods[0].min_topup).toBe(15)
  })
})
