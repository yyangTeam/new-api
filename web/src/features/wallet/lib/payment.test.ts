import {
  isStripePayment,
  isWaffoPancakePayment,
  getDefaultPaymentType,
  getMinTopupAmount,
  generatePresetAmounts,
  mergePresetAmounts,
} from './payment'
import type { TopupInfo } from '../types'

describe('isStripePayment', () => {
  test('returns true for stripe', () => {
    expect(isStripePayment('stripe')).toBe(true)
  })

  test('returns false for alipay', () => {
    expect(isStripePayment('alipay')).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isStripePayment('')).toBe(false)
  })
})

describe('isWaffoPancakePayment', () => {
  test('returns true for waffo_pancake', () => {
    expect(isWaffoPancakePayment('waffo_pancake')).toBe(true)
  })

  test('returns false for waffo', () => {
    expect(isWaffoPancakePayment('waffo')).toBe(false)
  })

  test('returns false for stripe', () => {
    expect(isWaffoPancakePayment('stripe')).toBe(false)
  })
})

describe('getDefaultPaymentType', () => {
  test('returns default alipay for null topupInfo', () => {
    expect(getDefaultPaymentType(null)).toBe('alipay')
  })

  test('returns first pay_method type when available', () => {
    const info = {
      pay_methods: [{ name: 'WeChat', type: 'wxpay' }],
    } as TopupInfo
    expect(getDefaultPaymentType(info)).toBe('wxpay')
  })

  test('returns stripe when enable_stripe_topup is true', () => {
    const info = {
      pay_methods: [],
      enable_stripe_topup: true,
    } as unknown as TopupInfo
    expect(getDefaultPaymentType(info)).toBe('stripe')
  })

  test('returns waffo when enable_waffo_topup is true', () => {
    const info = {
      pay_methods: [],
      enable_waffo_topup: true,
    } as unknown as TopupInfo
    expect(getDefaultPaymentType(info)).toBe('waffo')
  })

  test('returns waffo_pancake when enable_waffo_pancake_topup is true', () => {
    const info = {
      pay_methods: [],
      enable_waffo_pancake_topup: true,
    } as unknown as TopupInfo
    expect(getDefaultPaymentType(info)).toBe('waffo_pancake')
  })

  test('returns default when no payment methods enabled', () => {
    const info = { pay_methods: [] } as unknown as TopupInfo
    expect(getDefaultPaymentType(info)).toBe('alipay')
  })
})

describe('getMinTopupAmount', () => {
  test('returns default 1 for null topupInfo', () => {
    expect(getMinTopupAmount(null)).toBe(1)
  })

  test('returns min_topup when enable_online_topup is true', () => {
    const info = {
      enable_online_topup: true,
      min_topup: 5,
    } as TopupInfo
    expect(getMinTopupAmount(info)).toBe(5)
  })

  test('returns stripe_min_topup when enable_stripe_topup is true', () => {
    const info = {
      enable_stripe_topup: true,
      stripe_min_topup: 10,
    } as unknown as TopupInfo
    expect(getMinTopupAmount(info)).toBe(10)
  })

  test('returns waffo_min_topup when enable_waffo_topup is true', () => {
    const info = {
      enable_waffo_topup: true,
      waffo_min_topup: 3,
    } as unknown as TopupInfo
    expect(getMinTopupAmount(info)).toBe(3)
  })

  test('returns default when waffo_min_topup is 0', () => {
    const info = {
      enable_waffo_topup: true,
      waffo_min_topup: 0,
    } as unknown as TopupInfo
    expect(getMinTopupAmount(info)).toBe(1)
  })

  test('returns waffo_pancake_min_topup when enabled', () => {
    const info = {
      enable_waffo_pancake_topup: true,
      waffo_pancake_min_topup: 7,
    } as unknown as TopupInfo
    expect(getMinTopupAmount(info)).toBe(7)
  })

  test('returns default when no topup method enabled', () => {
    const info = {} as unknown as TopupInfo
    expect(getMinTopupAmount(info)).toBe(1)
  })
})

describe('generatePresetAmounts', () => {
  test('generates preset amounts from min amount', () => {
    const result = generatePresetAmounts(1)
    expect(result).toEqual([
      { value: 1 },
      { value: 5 },
      { value: 10 },
      { value: 30 },
      { value: 50 },
      { value: 100 },
      { value: 300 },
      { value: 500 },
    ])
  })

  test('scales by min amount', () => {
    const result = generatePresetAmounts(2)
    expect(result[0].value).toBe(2)
    expect(result[1].value).toBe(10)
    expect(result[7].value).toBe(1000)
  })
})

describe('mergePresetAmounts', () => {
  test('returns empty array for empty amountOptions', () => {
    expect(mergePresetAmounts([], {})).toEqual([])
  })

  test('returns empty array for null amountOptions', () => {
    expect(mergePresetAmounts(null as unknown as number[], {})).toEqual([])
  })

  test('merges amounts with matching discounts', () => {
    const result = mergePresetAmounts([10, 50, 100], { 50: 0.9, 100: 0.8 })
    expect(result).toEqual([
      { value: 10, discount: 1.0 },
      { value: 50, discount: 0.9 },
      { value: 100, discount: 0.8 },
    ])
  })

  test('defaults to 1.0 discount when not in discounts map', () => {
    const result = mergePresetAmounts([25], {})
    expect(result).toEqual([{ value: 25, discount: 1.0 }])
  })
})
