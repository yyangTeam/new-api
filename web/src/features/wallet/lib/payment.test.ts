import {
  isStripePayment,
  isWaffoPayment,
  isWaffoPancakePayment,
  getDefaultPaymentType,
  getMinTopupAmount,
  generatePresetAmounts,
  mergePresetAmounts,
  submitPaymentForm,
  dispatchSelectedPayment,
} from './payment'
import type { TopupInfo, PaymentMethod } from '../types'

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

describe('isWaffoPayment', () => {
  test('returns true for waffo', () => {
    expect(isWaffoPayment('waffo')).toBe(true)
  })

  test('returns false for waffo_pancake', () => {
    expect(isWaffoPayment('waffo_pancake')).toBe(false)
  })

  test('returns false for stripe', () => {
    expect(isWaffoPayment('stripe')).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isWaffoPayment('')).toBe(false)
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

describe('submitPaymentForm', () => {
  test('creates and submits a form', () => {
    const mockSubmit = vi.fn()
    const mockAppend = vi.fn()
    const mockRemove = vi.fn()

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'form') {
        el.submit = mockSubmit
      }
      return el
    })
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppend)
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemove)

    submitPaymentForm('http://pay.com', { key1: 'val1', key2: 'val2' })

    expect(mockAppend).toHaveBeenCalled()
    expect(mockSubmit).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})

describe('dispatchSelectedPayment', () => {
  const processors = {
    regular: vi.fn().mockResolvedValue(true),
    waffo: vi.fn().mockResolvedValue(true),
    waffoPancake: vi.fn().mockResolvedValue(true),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('dispatches waffo payment with method index', async () => {
    const method: PaymentMethod = { name: 'Waffo', type: 'waffo' }
    const result = await dispatchSelectedPayment(method, 100, 2, processors)

    expect(result).toBe(true)
    expect(processors.waffo).toHaveBeenCalledWith(100, 2)
  })

  test('returns false for waffo when waffoMethodIndex is null', async () => {
    const method: PaymentMethod = { name: 'Waffo', type: 'waffo' }
    const result = await dispatchSelectedPayment(method, 100, null, processors)

    expect(result).toBe(false)
    expect(processors.waffo).not.toHaveBeenCalled()
  })

  test('dispatches waffo pancake payment', async () => {
    const method: PaymentMethod = { name: 'Waffo Pancake', type: 'waffo_pancake' }
    const result = await dispatchSelectedPayment(method, 200, null, processors)

    expect(result).toBe(true)
    expect(processors.waffoPancake).toHaveBeenCalledWith(200)
  })

  test('dispatches regular payment for other types', async () => {
    const method: PaymentMethod = { name: 'Alipay', type: 'alipay' }
    const result = await dispatchSelectedPayment(method, 50, null, processors)

    expect(result).toBe(true)
    expect(processors.regular).toHaveBeenCalledWith(50, 'alipay')
  })

  test('dispatches regular payment for stripe type', async () => {
    const method: PaymentMethod = { name: 'Stripe', type: 'stripe' }
    const result = await dispatchSelectedPayment(method, 75, null, processors)

    expect(result).toBe(true)
    expect(processors.regular).toHaveBeenCalledWith(75, 'stripe')
  })
})
