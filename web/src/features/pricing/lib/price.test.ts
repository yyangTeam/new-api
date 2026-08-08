import {
  stripTrailingZeros,
  formatPrice,
  formatGroupPrice,
  formatFixedPrice,
  formatRequestPrice,
} from './price'
import type { PricingModel } from '../types'

vi.mock('@/lib/currency', () => ({
  formatCurrencyFromUSD: (value: number, _opts?: unknown) => {
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

describe('stripTrailingZeros', () => {
  test('strips trailing zeros from decimal', () => {
    expect(stripTrailingZeros('$1.2300')).toBe('$1.23')
  })

  test('strips all trailing zeros leaving integer', () => {
    expect(stripTrailingZeros('$5.000')).toBe('$5')
  })

  test('handles no trailing zeros', () => {
    expect(stripTrailingZeros('$3.14')).toBe('$3.14')
  })

  test('handles integer without decimal point', () => {
    expect(stripTrailingZeros('$10')).toBe('$10')
  })

  test('preserves k suffix', () => {
    expect(stripTrailingZeros('$1.50k')).toBe('$1.5k')
  })

  test('returns input unchanged when no match', () => {
    expect(stripTrailingZeros('abc')).toBe('abc')
  })

  test('handles negative numbers', () => {
    expect(stripTrailingZeros('$-1.200')).toBe('$-1.2')
  })

  test('handles zero', () => {
    expect(stripTrailingZeros('$0.00')).toBe('$0')
  })

  test('handles symbol prefix like yen', () => {
    expect(stripTrailingZeros('¥1.500')).toBe('¥1.5')
  })

  test('handles number with commas', () => {
    expect(stripTrailingZeros('$1,234.500')).toBe('$1234.5')
  })
})

describe('formatPrice', () => {
  test('returns dash for request quota type', () => {
    const model = makeModel({ quota_type: 1 })
    expect(formatPrice(model, 'input', 'M')).toBe('-')
  })

  test('formats input price', () => {
    const model = makeModel({ model_ratio: 1, completion_ratio: 2 })
    const result = formatPrice(model, 'input', 'M')
    expect(result).toBe('$2')
  })

  test('formats output price with completion ratio', () => {
    const model = makeModel({ model_ratio: 1, completion_ratio: 3 })
    const result = formatPrice(model, 'output', 'M')
    expect(result).toBe('$6')
  })

  test('returns dash (NaN) for cache price when cache_ratio is null', () => {
    const model = makeModel({ cache_ratio: null })
    const result = formatPrice(model, 'cache', 'M')
    expect(result).toBe('-')
  })

  test('formats cache price when cache_ratio is set', () => {
    const model = makeModel({ model_ratio: 1, cache_ratio: 0.5 })
    const result = formatPrice(model, 'cache', 'M')
    expect(result).toBe('$1')
  })

  test('uses K divisor for token unit', () => {
    const model = makeModel({ model_ratio: 1 })
    const result = formatPrice(model, 'input', 'K')
    expect(result).toBe('$0.002')
  })

  test('uses minimum group ratio from enable_groups', () => {
    const model = makeModel({
      model_ratio: 1,
      enable_groups: ['a', 'b'],
      group_ratio: { a: 2, b: 0.5 },
    })
    const result = formatPrice(model, 'input', 'M')
    expect(result).toBe('$1')
  })

  test('defaults group ratio to 1 when no groups match', () => {
    const model = makeModel({
      model_ratio: 1,
      enable_groups: [],
      group_ratio: {},
    })
    const result = formatPrice(model, 'input', 'M')
    expect(result).toBe('$2')
  })
})

describe('formatGroupPrice', () => {
  test('returns dash for request quota type', () => {
    const model = makeModel({ quota_type: 1 })
    expect(
      formatGroupPrice(model, 'default', 'input', 'M', false, 1, 1, {})
    ).toBe('-')
  })

  test('uses specified group ratio', () => {
    const model = makeModel({ model_ratio: 1 })
    const result = formatGroupPrice(model, 'premium', 'input', 'M', false, 1, 1, {
      premium: 2,
    })
    expect(result).toBe('$4')
  })

  test('defaults to ratio 1 when group not found', () => {
    const model = makeModel({ model_ratio: 1 })
    const result = formatGroupPrice(model, 'missing', 'input', 'M', false, 1, 1, {})
    expect(result).toBe('$2')
  })
})

describe('formatFixedPrice', () => {
  test('returns dash for token quota type', () => {
    const model = makeModel({ quota_type: 0 })
    expect(formatFixedPrice(model, 'default', false, 1, 1, {})).toBe('-')
  })

  test('formats fixed price with group ratio', () => {
    const model = makeModel({ quota_type: 1, model_price: 5 })
    const result = formatFixedPrice(model, 'premium', false, 1, 1, {
      premium: 2,
    })
    expect(result).toBe('$10')
  })

  test('defaults model_price to 0 when undefined', () => {
    const model = makeModel({ quota_type: 1, model_price: undefined })
    const result = formatFixedPrice(model, 'default', false, 1, 1, { default: 1 })
    expect(result).toBe('$0')
  })

  test('applies recharge rate when showWithRecharge is true', () => {
    const model = makeModel({ quota_type: 1, model_price: 10 })
    const result = formatFixedPrice(model, 'default', true, 2, 4, { default: 1 })
    expect(result).toBe('$5')
  })
})

describe('formatRequestPrice', () => {
  test('returns dash for token quota type', () => {
    const model = makeModel({ quota_type: 0 })
    expect(formatRequestPrice(model)).toBe('-')
  })

  test('formats request price with minimum group ratio', () => {
    const model = makeModel({
      quota_type: 1,
      model_price: 10,
      enable_groups: ['a', 'b'],
      group_ratio: { a: 2, b: 0.5 },
    })
    const result = formatRequestPrice(model)
    expect(result).toBe('$5')
  })

  test('uses ratio 1 when enable_groups is empty', () => {
    const model = makeModel({
      quota_type: 1,
      model_price: 10,
      enable_groups: [],
    })
    const result = formatRequestPrice(model)
    expect(result).toBe('$10')
  })

  test('applies recharge rate', () => {
    const model = makeModel({
      quota_type: 1,
      model_price: 10,
      enable_groups: ['default'],
      group_ratio: { default: 1 },
    })
    const result = formatRequestPrice(model, true, 4, 2)
    expect(result).toBe('$20')
  })
})
