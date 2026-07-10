import {
  hasPricingValue,
  getModeLabel,
  getModeVariant,
  getPriceSummary,
  getSnapshotSignature,
} from './model-pricing-snapshots'
import type { ModelPricingSnapshot } from './model-pricing-snapshots'

describe('hasPricingValue', () => {
  test('returns true for non-empty string', () => {
    expect(hasPricingValue('1.5')).toBe(true)
    expect(hasPricingValue('0')).toBe(true)
    expect(hasPricingValue('abc')).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(hasPricingValue('')).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(hasPricingValue(undefined)).toBe(false)
  })
})

describe('getModeLabel', () => {
  test('returns Per-request for per-request mode', () => {
    expect(getModeLabel('per-request')).toBe('Per-request')
  })

  test('returns Expression for tiered_expr mode', () => {
    expect(getModeLabel('tiered_expr')).toBe('Expression')
  })

  test('returns Per-token for per-token mode', () => {
    expect(getModeLabel('per-token')).toBe('Per-token')
  })

  test('returns Per-token for undefined', () => {
    expect(getModeLabel(undefined)).toBe('Per-token')
  })

  test('returns Per-token for unknown mode', () => {
    expect(getModeLabel('unknown')).toBe('Per-token')
  })

  test('returns Per-token for empty string', () => {
    expect(getModeLabel('')).toBe('Per-token')
  })
})

describe('getModeVariant', () => {
  test('returns warning for per-request mode', () => {
    expect(getModeVariant('per-request')).toBe('warning')
  })

  test('returns info for tiered_expr mode', () => {
    expect(getModeVariant('tiered_expr')).toBe('info')
  })

  test('returns success for per-token mode', () => {
    expect(getModeVariant('per-token')).toBe('success')
  })

  test('returns success for undefined', () => {
    expect(getModeVariant(undefined)).toBe('success')
  })

  test('returns success for unknown mode', () => {
    expect(getModeVariant('anything')).toBe('success')
  })
})

describe('getPriceSummary', () => {
  const t = (key: string) => key

  test('returns expression summary for tiered_expr mode with tiers', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'tiered_expr',
      billingExpr: 'tier(a) + tier(b)',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('Tiered pricing · 2 tiers')
  })

  test('returns expression pricing for tiered_expr without tiers', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'tiered_expr',
      billingExpr: 'some_expr',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('Expression pricing')
  })

  test('returns per-request price summary', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'per-request',
      price: '0.5',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('$0.5 / request')
  })

  test('returns Unset price for per-request without price', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'per-request',
      price: '',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('Unset price')
  })

  test('returns Unset price for per-token without ratio', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'per-token',
      ratio: '',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('Unset price')
  })

  test('returns input price for per-token with ratio only', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'per-token',
      ratio: '1',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('Input $2')
  })

  test('returns input price with extras count', () => {
    const row: ModelPricingSnapshot = {
      name: 'model',
      billingMode: 'per-token',
      ratio: '1',
      completionRatio: '2',
      cacheRatio: '0.5',
      hasConflict: false,
    }
    const result = getPriceSummary(row, t)
    expect(result).toBe('Input $2 · 2 extras')
  })
})

describe('getSnapshotSignature', () => {
  test('returns empty string for undefined', () => {
    expect(getSnapshotSignature(undefined)).toBe('')
  })

  test('returns JSON signature with all fields', () => {
    const snapshot: ModelPricingSnapshot = {
      name: 'gpt-4',
      price: '0.03',
      ratio: '15',
      cacheRatio: '0.5',
      createCacheRatio: '',
      completionRatio: '2',
      imageRatio: '',
      audioRatio: '',
      audioCompletionRatio: '',
      billingMode: 'per-token',
      billingExpr: '',
      requestRuleExpr: '',
      hasConflict: false,
    }
    const result = getSnapshotSignature(snapshot)
    const parsed = JSON.parse(result)
    expect(parsed.price).toBe('0.03')
    expect(parsed.ratio).toBe('15')
    expect(parsed.cacheRatio).toBe('0.5')
    expect(parsed.completionRatio).toBe('2')
    expect(parsed.billingMode).toBe('per-token')
  })

  test('defaults missing fields to empty strings', () => {
    const snapshot: ModelPricingSnapshot = {
      name: 'test',
      hasConflict: false,
    }
    const result = getSnapshotSignature(snapshot)
    const parsed = JSON.parse(result)
    expect(parsed.price).toBe('')
    expect(parsed.ratio).toBe('')
    expect(parsed.cacheRatio).toBe('')
    expect(parsed.createCacheRatio).toBe('')
    expect(parsed.completionRatio).toBe('')
    expect(parsed.imageRatio).toBe('')
    expect(parsed.audioRatio).toBe('')
    expect(parsed.audioCompletionRatio).toBe('')
    expect(parsed.billingMode).toBe('per-token')
    expect(parsed.billingExpr).toBe('')
    expect(parsed.requestRuleExpr).toBe('')
  })

  test('produces same signature for equivalent snapshots', () => {
    const snapshot1: ModelPricingSnapshot = {
      name: 'model-a',
      ratio: '1',
      billingMode: 'per-token',
      hasConflict: false,
    }
    const snapshot2: ModelPricingSnapshot = {
      name: 'model-b',
      ratio: '1',
      billingMode: 'per-token',
      hasConflict: true,
    }
    expect(getSnapshotSignature(snapshot1)).toBe(getSnapshotSignature(snapshot2))
  })

  test('produces different signatures for different ratios', () => {
    const snapshot1: ModelPricingSnapshot = {
      name: 'model',
      ratio: '1',
      hasConflict: false,
    }
    const snapshot2: ModelPricingSnapshot = {
      name: 'model',
      ratio: '2',
      hasConflict: false,
    }
    expect(getSnapshotSignature(snapshot1)).not.toBe(getSnapshotSignature(snapshot2))
  })
})
