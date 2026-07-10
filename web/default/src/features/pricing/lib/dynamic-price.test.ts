import {
  isDynamicPricingModel,
  getDynamicDisplayGroupRatio,
  formatDynamicUnitPrice,
  getDynamicPricingTiers,
  hasDynamicRequestRules,
  getDynamicPriceEntries,
  getDynamicPricingSummary,
} from './dynamic-price'
import type { PricingModel } from '../types'

vi.mock('@/lib/currency', () => ({
  formatBillingCurrencyFromUSD: (value: number, _opts?: unknown) => {
    if (value == null || Number.isNaN(value)) return '-'
    return `$${value}`
  },
}))

function makeModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 2,
    enable_groups: ['default'],
    group_ratio: { default: 1 },
    ...overrides,
  }
}

describe('isDynamicPricingModel', () => {
  test('returns true for tiered_expr with billing_expr', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20)',
    })
    expect(isDynamicPricingModel(model)).toBe(true)
  })

  test('returns false when billing_mode is not tiered_expr', () => {
    const model = makeModel({ billing_mode: 'fixed' })
    expect(isDynamicPricingModel(model)).toBe(false)
  })

  test('returns false when billing_expr is empty', () => {
    const model = makeModel({ billing_mode: 'tiered_expr', billing_expr: '' })
    expect(isDynamicPricingModel(model)).toBe(false)
  })

  test('returns false when billing_expr is undefined', () => {
    const model = makeModel({ billing_mode: 'tiered_expr' })
    expect(isDynamicPricingModel(model)).toBe(false)
  })

  test('returns false when billing_mode is undefined', () => {
    const model = makeModel()
    expect(isDynamicPricingModel(model)).toBe(false)
  })
})

describe('getDynamicDisplayGroupRatio', () => {
  test('returns minimum ratio from enabled groups', () => {
    const model = makeModel({
      enable_groups: ['a', 'b', 'c'],
      group_ratio: { a: 2, b: 0.5, c: 1.5 },
    })
    expect(getDynamicDisplayGroupRatio(model)).toBe(0.5)
  })

  test('returns 1 when enable_groups is empty', () => {
    const model = makeModel({ enable_groups: [], group_ratio: { a: 0.5 } })
    expect(getDynamicDisplayGroupRatio(model)).toBe(1)
  })

  test('returns 1 when no group has a defined ratio', () => {
    const model = makeModel({
      enable_groups: ['x'],
      group_ratio: { a: 0.5 },
    })
    expect(getDynamicDisplayGroupRatio(model)).toBe(1)
  })

  test('returns 1 when group_ratio is undefined', () => {
    const model = makeModel({
      enable_groups: ['a'],
      group_ratio: undefined,
    })
    expect(getDynamicDisplayGroupRatio(model)).toBe(1)
  })

  test('returns 1 when enable_groups is not an array', () => {
    const model = makeModel({
      enable_groups: 'not-an-array' as unknown as string[],
      group_ratio: { a: 0.5 },
    })
    expect(getDynamicDisplayGroupRatio(model)).toBe(1)
  })

  test('handles single group', () => {
    const model = makeModel({
      enable_groups: ['a'],
      group_ratio: { a: 3 },
    })
    expect(getDynamicDisplayGroupRatio(model)).toBe(3)
  })
})

describe('formatDynamicUnitPrice', () => {
  test('formats price with default options', () => {
    const result = formatDynamicUnitPrice(10, { tokenUnit: 'M' })
    expect(result).toBe('$10')
  })

  test('applies groupRatioMultiplier', () => {
    const result = formatDynamicUnitPrice(10, {
      tokenUnit: 'M',
      groupRatioMultiplier: 2,
    })
    expect(result).toBe('$20')
  })

  test('applies K token unit divisor', () => {
    const result = formatDynamicUnitPrice(10000, { tokenUnit: 'K' })
    expect(result).toBe('$10')
  })

  test('applies recharge price conversion', () => {
    const result = formatDynamicUnitPrice(10, {
      tokenUnit: 'M',
      showRechargePrice: true,
      priceRate: 7,
      usdExchangeRate: 1,
    })
    expect(result).toBe('$70')
  })

  test('does not apply recharge when showRechargePrice is false', () => {
    const result = formatDynamicUnitPrice(10, {
      tokenUnit: 'M',
      showRechargePrice: false,
      priceRate: 7,
      usdExchangeRate: 1,
    })
    expect(result).toBe('$10')
  })
})

describe('getDynamicPricingTiers', () => {
  test('returns tiers for a valid dynamic pricing model', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20)',
    })
    const tiers = getDynamicPricingTiers(model)
    expect(tiers).toHaveLength(1)
    expect(tiers[0].label).toBe('base')
  })

  test('returns empty array for non-dynamic model', () => {
    const model = makeModel({ billing_mode: 'fixed' })
    expect(getDynamicPricingTiers(model)).toEqual([])
  })

  test('returns empty array when billing_expr is empty', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: '',
    })
    expect(getDynamicPricingTiers(model)).toEqual([])
  })

  test('parses multi-tier expression', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr:
        'p >= 128000 ? tier("large", p * 30 + c * 60) : tier("small", p * 15 + c * 30)',
    })
    const tiers = getDynamicPricingTiers(model)
    expect(tiers).toHaveLength(2)
    expect(tiers[0].label).toBe('large')
    expect(tiers[1].label).toBe('small')
  })
})

describe('hasDynamicRequestRules', () => {
  test('returns false for non-dynamic model', () => {
    const model = makeModel({ billing_mode: 'fixed' })
    expect(hasDynamicRequestRules(model)).toBe(false)
  })

  test('returns false when no request rules present', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20)',
    })
    expect(hasDynamicRequestRules(model)).toBe(false)
  })

  test('returns true when request rules are present', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr:
        '(tier("base", p * 10 + c * 20)) * (param("stream") == true ? 1.5 : 1)',
    })
    expect(hasDynamicRequestRules(model)).toBe(true)
  })
})

describe('getDynamicPriceEntries', () => {
  test('returns empty array when tier is null', () => {
    expect(getDynamicPriceEntries(null, { tokenUnit: 'M' })).toEqual([])
  })

  test('returns entries for a tier with input and output prices', () => {
    const tier = {
      label: 'base',
      conditions: [],
      inputPrice: 10,
      outputPrice: 20,
    }
    const entries = getDynamicPriceEntries(tier, { tokenUnit: 'M' })
    expect(entries.length).toBeGreaterThanOrEqual(2)
    expect(entries[0].field).toBe('inputPrice')
    expect(entries[1].field).toBe('outputPrice')
  })

  test('excludes entries with zero or negative values', () => {
    const tier = {
      label: 'base',
      conditions: [],
      inputPrice: 10,
      outputPrice: 0,
      cacheReadPrice: -1,
    }
    const entries = getDynamicPriceEntries(tier, { tokenUnit: 'M' })
    const fields = entries.map((e) => e.field)
    expect(fields).toContain('inputPrice')
    expect(fields).not.toContain('outputPrice')
    expect(fields).not.toContain('cacheReadPrice')
  })

  test('sorts primary fields before secondary fields', () => {
    const tier = {
      label: 'base',
      conditions: [],
      inputPrice: 10,
      outputPrice: 20,
      cacheReadPrice: 5,
    }
    const entries = getDynamicPriceEntries(tier, { tokenUnit: 'M' })
    const primaryIdx = entries.findIndex((e) => e.field === 'inputPrice')
    const secondaryIdx = entries.findIndex((e) => e.field === 'cacheReadPrice')
    if (secondaryIdx !== -1) {
      expect(primaryIdx).toBeLessThan(secondaryIdx)
    }
  })
})

describe('getDynamicPricingSummary', () => {
  test('returns null for non-dynamic model', () => {
    const model = makeModel({ billing_mode: 'fixed' })
    expect(getDynamicPricingSummary(model, { tokenUnit: 'M' })).toBeNull()
  })

  test('returns summary for a valid dynamic pricing model', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20)',
    })
    const summary = getDynamicPricingSummary(model, { tokenUnit: 'M' })
    expect(summary).not.toBeNull()
    expect(summary!.tiers).toHaveLength(1)
    expect(summary!.tier).not.toBeNull()
    expect(summary!.tier!.label).toBe('base')
    expect(summary!.tierCount).toBe(1)
    expect(summary!.hasRequestRules).toBe(false)
    expect(summary!.isSpecialExpression).toBe(false)
    expect(summary!.rawExpression).toBe('tier("base", p * 10 + c * 20)')
  })

  test('marks isSpecialExpression when expr exists but no tiers parsed', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'some_unparseable_expr()',
    })
    const summary = getDynamicPricingSummary(model, { tokenUnit: 'M' })
    expect(summary).not.toBeNull()
    expect(summary!.isSpecialExpression).toBe(true)
    expect(summary!.tiers).toHaveLength(0)
  })

  test('separates primary and secondary entries', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20 + cr * 5)',
    })
    const summary = getDynamicPricingSummary(model, { tokenUnit: 'M' })
    expect(summary).not.toBeNull()
    const primaryFields = summary!.primaryEntries.map((e) => e.field)
    const secondaryFields = summary!.secondaryEntries.map((e) => e.field)
    for (const f of primaryFields) {
      expect(f === 'inputPrice' || f === 'outputPrice').toBe(true)
    }
    for (const f of secondaryFields) {
      expect(f !== 'inputPrice' && f !== 'outputPrice').toBe(true)
    }
  })

  test('entries is union of primary and secondary entries', () => {
    const model = makeModel({
      billing_mode: 'tiered_expr',
      billing_expr: 'tier("base", p * 10 + c * 20)',
    })
    const summary = getDynamicPricingSummary(model, { tokenUnit: 'M' })
    expect(summary).not.toBeNull()
    expect(summary!.entries.length).toBe(
      summary!.primaryEntries.length + summary!.secondaryEntries.length
    )
  })
})
