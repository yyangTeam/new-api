import {
  stripTrailingZeros,
  formatPrice,
  formatGroupPrice,
  formatFixedPrice,
  formatRequestPrice,
} from './price'
import type { PricingModel } from '../types'

vi.mock('@/lib/currency', () => ({
  formatCurrencyFromUSD: (value: number) => {
    if (!Number.isFinite(value)) return '$NaN'
    return `$${value.toFixed(4)}`
  },
}))

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 2,
    enable_groups: ['default'],
    ...overrides,
  }
}

describe('price - branch coverage', () => {
  describe('stripTrailingZeros', () => {
    test('strips trailing zeros from decimal', () => {
      expect(stripTrailingZeros('$1.0000')).toBe('$1')
    })

    test('strips trailing zeros keeping significant digits', () => {
      expect(stripTrailingZeros('$1.2300')).toBe('$1.23')
    })

    test('handles no decimal', () => {
      expect(stripTrailingZeros('$100')).toBe('$100')
    })

    test('handles zero value', () => {
      expect(stripTrailingZeros('$0.0000')).toBe('$0')
    })

    test('returns original for non-matching pattern', () => {
      expect(stripTrailingZeros('free')).toBe('free')
    })

    test('handles k suffix', () => {
      expect(stripTrailingZeros('$1.50k')).toBe('$1.5k')
    })

    test('handles negative numbers', () => {
      expect(stripTrailingZeros('$-1.5000')).toBe('$-1.5')
    })

    test('handles number with commas', () => {
      expect(stripTrailingZeros('$1,234.5000')).toBe('$1234.5')
    })
  })

  describe('formatPrice', () => {
    test('returns - for request-based model', () => {
      const model = createModel({ quota_type: 1 })
      expect(formatPrice(model, 'input', 'M')).toBe('-')
    })

    test('formats input price', () => {
      const model = createModel({ model_ratio: 1 })
      const result = formatPrice(model, 'input', 'M')
      expect(result).toContain('$')
    })

    test('formats output price with completion ratio', () => {
      const model = createModel({ model_ratio: 1, completion_ratio: 3 })
      const result = formatPrice(model, 'output', 'M')
      expect(result).toContain('$')
    })

    test('formats cache price', () => {
      const model = createModel({ cache_ratio: 0.5 })
      const result = formatPrice(model, 'cache', 'M')
      expect(result).toContain('$')
    })

    test('returns NaN format for cache when cache_ratio is null', () => {
      const model = createModel({ cache_ratio: null })
      const result = formatPrice(model, 'cache', 'M')
      expect(result).toBe('$NaN')
    })

    test('formats create_cache price', () => {
      const model = createModel({ create_cache_ratio: 1.25 })
      const result = formatPrice(model, 'create_cache', 'M')
      expect(result).toContain('$')
    })

    test('returns NaN format for create_cache when ratio is null', () => {
      const model = createModel({ create_cache_ratio: null })
      const result = formatPrice(model, 'create_cache', 'M')
      expect(result).toBe('$NaN')
    })

    test('formats image price', () => {
      const model = createModel({ image_ratio: 2 })
      const result = formatPrice(model, 'image', 'M')
      expect(result).toContain('$')
    })

    test('returns NaN format for image when ratio is null', () => {
      const model = createModel({ image_ratio: null })
      const result = formatPrice(model, 'image', 'M')
      expect(result).toBe('$NaN')
    })

    test('formats audio_input price', () => {
      const model = createModel({ audio_ratio: 1.5 })
      const result = formatPrice(model, 'audio_input', 'M')
      expect(result).toContain('$')
    })

    test('returns NaN format for audio_input when ratio is null', () => {
      const model = createModel({ audio_ratio: null })
      const result = formatPrice(model, 'audio_input', 'M')
      expect(result).toBe('$NaN')
    })

    test('formats audio_output price', () => {
      const model = createModel({ audio_ratio: 1.5, audio_completion_ratio: 2 })
      const result = formatPrice(model, 'audio_output', 'M')
      expect(result).toContain('$')
    })

    test('returns NaN format for audio_output when audio_ratio is null', () => {
      const model = createModel({ audio_ratio: null, audio_completion_ratio: 2 })
      const result = formatPrice(model, 'audio_output', 'M')
      expect(result).toBe('$NaN')
    })

    test('returns NaN format for audio_output when audio_completion_ratio is null', () => {
      const model = createModel({ audio_ratio: 1.5, audio_completion_ratio: null })
      const result = formatPrice(model, 'audio_output', 'M')
      expect(result).toBe('$NaN')
    })

    test('applies K token unit divisor', () => {
      const model = createModel({ model_ratio: 1 })
      const priceM = formatPrice(model, 'input', 'M')
      const priceK = formatPrice(model, 'input', 'K')
      // K price should be smaller (divided by 1000 more)
      expect(priceM).not.toBe(priceK)
    })

    test('applies recharge rate when showWithRecharge is true', () => {
      const model = createModel({ model_ratio: 1 })
      const normal = formatPrice(model, 'input', 'M', false)
      const recharge = formatPrice(model, 'input', 'M', true, 0.5, 1)
      expect(normal).not.toBe(recharge)
    })

    test('uses selected group ratio', () => {
      const model = createModel({
        enable_groups: ['default', 'premium'],
        group_ratio: { default: 1, premium: 0.5 },
      })
      const defaultPrice = formatPrice(model, 'input', 'M', false, 1, 1, 'default')
      const premiumPrice = formatPrice(model, 'input', 'M', false, 1, 1, 'premium')
      expect(defaultPrice).not.toBe(premiumPrice)
    })
  })

  describe('formatGroupPrice', () => {
    test('returns - for request-based model', () => {
      const model = createModel({ quota_type: 1 })
      expect(
        formatGroupPrice(model, 'default', 'input', 'M', false, 1, 1, { default: 1 })
      ).toBe('-')
    })

    test('uses configured group ratio', () => {
      const model = createModel()
      const result = formatGroupPrice(
        model,
        'premium',
        'input',
        'M',
        false,
        1,
        1,
        { premium: 0.5 }
      )
      expect(result).toContain('$')
    })
  })

  describe('formatFixedPrice', () => {
    test('returns - for token-based model', () => {
      const model = createModel({ quota_type: 0 })
      expect(
        formatFixedPrice(model, 'default', false, 1, 1, { default: 1 })
      ).toBe('-')
    })

    test('formats request price', () => {
      const model = createModel({ quota_type: 1, model_price: 0.01 })
      const result = formatFixedPrice(model, 'default', false, 1, 1, {
        default: 1,
      })
      expect(result).toContain('$')
    })

    test('applies group ratio to fixed price', () => {
      const model = createModel({ quota_type: 1, model_price: 0.01 })
      const price1 = formatFixedPrice(model, 'default', false, 1, 1, { default: 1 })
      const price2 = formatFixedPrice(model, 'premium', false, 1, 1, { premium: 2 })
      expect(price1).not.toBe(price2)
    })

    test('handles undefined model_price', () => {
      const model = createModel({ quota_type: 1, model_price: undefined })
      const result = formatFixedPrice(model, 'default', false, 1, 1, { default: 1 })
      expect(result).toContain('$')
    })
  })

  describe('formatRequestPrice', () => {
    test('returns - for token-based model', () => {
      const model = createModel({ quota_type: 0 })
      expect(formatRequestPrice(model)).toBe('-')
    })

    test('formats request price with default params', () => {
      const model = createModel({ quota_type: 1, model_price: 0.01 })
      const result = formatRequestPrice(model)
      expect(result).toContain('$')
    })

    test('applies recharge rate', () => {
      const model = createModel({ quota_type: 1, model_price: 0.01 })
      const normal = formatRequestPrice(model, false)
      const recharge = formatRequestPrice(model, true, 0.5, 1)
      expect(normal).not.toBe(recharge)
    })

    test('uses selected group ratio', () => {
      const model = createModel({
        quota_type: 1,
        model_price: 0.01,
        enable_groups: ['default', 'premium'],
        group_ratio: { default: 1, premium: 0.5 },
      })
      const defaultPrice = formatRequestPrice(model, false, 1, 1, 'default')
      const premiumPrice = formatRequestPrice(model, false, 1, 1, 'premium')
      expect(defaultPrice).not.toBe(premiumPrice)
    })
  })
})
