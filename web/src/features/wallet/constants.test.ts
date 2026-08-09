import { describe, it, expect } from 'vitest'

import {
  DEFAULT_PRESET_MULTIPLIERS,
  PAYMENT_TYPES,
  DEFAULT_PAYMENT_TYPE,
  PAYMENT_ICON_COLORS,
  DEFAULT_DISCOUNT_RATE,
  DEFAULT_MIN_TOPUP,
} from './constants'

describe('DEFAULT_PRESET_MULTIPLIERS', () => {
  it('has 8 multiplier values', () => {
    expect(DEFAULT_PRESET_MULTIPLIERS).toHaveLength(8)
  })

  it('starts at 1 and ends at 500', () => {
    expect(DEFAULT_PRESET_MULTIPLIERS[0]).toBe(1)
    expect(DEFAULT_PRESET_MULTIPLIERS[7]).toBe(500)
  })

  it('contains expected values', () => {
    expect(DEFAULT_PRESET_MULTIPLIERS).toEqual([1, 5, 10, 30, 50, 100, 300, 500])
  })
})

describe('PAYMENT_TYPES', () => {
  it('has all payment types defined', () => {
    expect(PAYMENT_TYPES.ALIPAY).toBe('alipay')
    expect(PAYMENT_TYPES.WECHAT).toBe('wxpay')
    expect(PAYMENT_TYPES.STRIPE).toBe('stripe')
    expect(PAYMENT_TYPES.CREEM).toBe('creem')
    expect(PAYMENT_TYPES.WAFFO).toBe('waffo')
    expect(PAYMENT_TYPES.WAFFO_PANCAKE).toBe('waffo_pancake')
  })
})

describe('DEFAULT_PAYMENT_TYPE', () => {
  it('is alipay', () => {
    expect(DEFAULT_PAYMENT_TYPE).toBe('alipay')
  })
})

describe('PAYMENT_ICON_COLORS', () => {
  it('has colors for all payment types', () => {
    expect(PAYMENT_ICON_COLORS[PAYMENT_TYPES.ALIPAY]).toBe('#1677FF')
    expect(PAYMENT_ICON_COLORS[PAYMENT_TYPES.WECHAT]).toBe('#07C160')
    expect(PAYMENT_ICON_COLORS[PAYMENT_TYPES.STRIPE]).toBe('#635BFF')
    expect(PAYMENT_ICON_COLORS[PAYMENT_TYPES.CREEM]).toBe('#6366F1')
    expect(PAYMENT_ICON_COLORS[PAYMENT_TYPES.WAFFO]).toBe('#2563EB')
    expect(PAYMENT_ICON_COLORS[PAYMENT_TYPES.WAFFO_PANCAKE]).toBe('#F97316')
  })
})

describe('DEFAULT_DISCOUNT_RATE', () => {
  it('is 1.0', () => {
    expect(DEFAULT_DISCOUNT_RATE).toBe(1.0)
  })
})

describe('DEFAULT_MIN_TOPUP', () => {
  it('is 1', () => {
    expect(DEFAULT_MIN_TOPUP).toBe(1)
  })
})
