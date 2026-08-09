import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  isApiSuccess,
  getTopupInfo,
  redeemTopupCode,
  calculateAmount,
  calculateStripeAmount,
  calculateWaffoAmount,
  requestPayment,
  requestStripePayment,
  requestCreemPayment,
  requestWaffoPayment,
  calculateWaffoPancakeAmount,
  requestWaffoPancakePayment,
  getAffiliateCode,
  transferAffiliateQuota,
  getUserBillingHistory,
  getAllBillingHistory,
  completeOrder,
} from './api'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

describe('isApiSuccess', () => {
  it('returns true when success is true', () => {
    expect(isApiSuccess({ success: true })).toBe(true)
  })

  it('returns true when message is "success"', () => {
    expect(isApiSuccess({ message: 'success' })).toBe(true)
  })

  it('returns false when success is false and message is not "success"', () => {
    expect(isApiSuccess({ success: false, message: 'error' })).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(isApiSuccess({})).toBe(false)
  })

  it('returns true when both success and message are set', () => {
    expect(isApiSuccess({ success: true, message: 'success' })).toBe(true)
  })
})

describe('getTopupInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /api/user/topup/info and returns data', async () => {
    const mockData = { success: true, data: { enable_online_topup: true } }
    mockGet.mockResolvedValue({ data: mockData })

    const result = await getTopupInfo()
    expect(mockGet).toHaveBeenCalledWith('/api/user/topup/info')
    expect(result).toEqual(mockData)
  })
})

describe('redeemTopupCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/topup with request', async () => {
    const mockData = { success: true, data: 500 }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await redeemTopupCode({ key: 'ABC123' })
    expect(mockPost).toHaveBeenCalledWith('/api/user/topup', { key: 'ABC123' })
    expect(result).toEqual(mockData)
  })
})

describe('calculateAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/amount with skipBusinessError', async () => {
    const mockData = { success: true, data: '10.50' }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await calculateAmount({ amount: 100 })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/amount',
      { amount: 100 },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('calculateStripeAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/stripe/amount with skipBusinessError', async () => {
    const mockData = { success: true, data: '15.00' }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await calculateStripeAmount({ amount: 200 })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/stripe/amount',
      { amount: 200 },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('calculateWaffoAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/waffo/amount with skipBusinessError', async () => {
    const mockData = { success: true, data: '18.75' }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await calculateWaffoAmount({ amount: 150 })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/waffo/amount',
      { amount: 150 },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('requestPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/pay and returns data with url', async () => {
    const mockData = { success: true, data: { order_id: '123' }, url: 'http://pay.com' }
    mockPost.mockResolvedValue({ data: mockData, url: 'http://pay.com' })

    const result = await requestPayment({ amount: 100, payment_method: 'alipay' })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/pay',
      { amount: 100, payment_method: 'alipay' },
      { skipBusinessError: true }
    )
    expect(result.url).toBe('http://pay.com')
  })

  it('extracts url from response root when data.url is absent', async () => {
    const mockData = { success: true, data: { order_id: '123' } }
    mockPost.mockResolvedValue({ data: mockData, url: 'http://fallback.com' })

    const result = await requestPayment({ amount: 50, payment_method: 'wxpay' })
    expect(result.url).toBe('http://fallback.com')
  })
})

describe('requestStripePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/stripe/pay and returns data', async () => {
    const mockData = { success: true, data: { pay_link: 'https://stripe.com/pay' } }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await requestStripePayment({ amount: 100, payment_method: 'stripe' })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/stripe/pay',
      { amount: 100, payment_method: 'stripe' },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('requestCreemPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/creem/pay and returns data', async () => {
    const mockData = { success: true, data: { checkout_url: 'https://creem.com/checkout' } }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await requestCreemPayment({ product_id: 'prod_1', payment_method: 'creem' })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/creem/pay',
      { product_id: 'prod_1', payment_method: 'creem' },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('requestWaffoPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/waffo/pay and returns data', async () => {
    const mockData = { success: true, data: { payment_url: 'https://waffo.com/pay' } }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await requestWaffoPayment({ amount: 100 })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/waffo/pay',
      { amount: 100 },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('calculateWaffoPancakeAmount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/waffo-pancake/amount', async () => {
    const mockData = { success: true, data: '25.00' }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await calculateWaffoPancakeAmount({ amount: 300 })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/waffo-pancake/amount',
      { amount: 300 },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('requestWaffoPancakePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/waffo-pancake/pay', async () => {
    const mockData = { success: true, data: { checkout_url: 'https://pancake.com' } }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await requestWaffoPancakePayment({ amount: 50 })
    expect(mockPost).toHaveBeenCalledWith(
      '/api/user/waffo-pancake/pay',
      { amount: 50 },
      { skipBusinessError: true }
    )
    expect(result).toEqual(mockData)
  })
})

describe('getAffiliateCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /api/user/aff', async () => {
    const mockData = { success: true, data: 'AFF123' }
    mockGet.mockResolvedValue({ data: mockData })

    const result = await getAffiliateCode()
    expect(mockGet).toHaveBeenCalledWith('/api/user/aff')
    expect(result).toEqual(mockData)
  })
})

describe('transferAffiliateQuota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/aff_transfer', async () => {
    const mockData = { success: true }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await transferAffiliateQuota({ quota: 1000 })
    expect(mockPost).toHaveBeenCalledWith('/api/user/aff_transfer', { quota: 1000 })
    expect(result).toEqual(mockData)
  })
})

describe('getUserBillingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /api/user/topup/self with params', async () => {
    const mockData = { success: true, data: { items: [], total: 0 } }
    mockGet.mockResolvedValue({ data: mockData })

    const result = await getUserBillingHistory(1, 10)
    expect(mockGet).toHaveBeenCalledWith('/api/user/topup/self?p=1&page_size=10')
    expect(result).toEqual(mockData)
  })

  it('appends keyword when provided', async () => {
    const mockData = { success: true, data: { items: [], total: 0 } }
    mockGet.mockResolvedValue({ data: mockData })

    await getUserBillingHistory(2, 20, 'stripe')
    expect(mockGet).toHaveBeenCalledWith('/api/user/topup/self?p=2&page_size=20&keyword=stripe')
  })

  it('does not append keyword when undefined', async () => {
    mockGet.mockResolvedValue({ data: {} })
    await getUserBillingHistory(1, 10, undefined)
    expect(mockGet).toHaveBeenCalledWith('/api/user/topup/self?p=1&page_size=10')
  })
})

describe('getAllBillingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /api/user/topup with params', async () => {
    const mockData = { success: true, data: { items: [], total: 0 } }
    mockGet.mockResolvedValue({ data: mockData })

    const result = await getAllBillingHistory(1, 10)
    expect(mockGet).toHaveBeenCalledWith('/api/user/topup?p=1&page_size=10')
    expect(result).toEqual(mockData)
  })

  it('appends keyword when provided', async () => {
    mockGet.mockResolvedValue({ data: {} })

    await getAllBillingHistory(1, 5, 'alipay')
    expect(mockGet).toHaveBeenCalledWith('/api/user/topup?p=1&page_size=5&keyword=alipay')
  })
})

describe('completeOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /api/user/topup/complete', async () => {
    const mockData = { success: true }
    mockPost.mockResolvedValue({ data: mockData })

    const result = await completeOrder({ trade_no: 'TRADE_001' })
    expect(mockPost).toHaveBeenCalledWith('/api/user/topup/complete', { trade_no: 'TRADE_001' })
    expect(result).toEqual(mockData)
  })
})
