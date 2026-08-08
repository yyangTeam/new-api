import {
  createModelPricingSchema,
  hasValue,
  toNumberOrNull,
  createInitialLaneState,
  buildPreviewRows,
  EMPTY_LANE_PRICES,
  EMPTY_LANE_ENABLED,
} from './model-pricing-core'

import type { ModelPricingFormValues, LaneKey } from './model-pricing-core'

const t = (key: string) => key

describe('createModelPricingSchema', () => {
  const schema = createModelPricingSchema(t)

  test('accepts valid data with name only', () => {
    const result = schema.safeParse({ name: 'gpt-4' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('gpt-4')
    }
  })

  test('accepts valid data with all fields', () => {
    const result = schema.safeParse({
      name: 'gpt-4',
      price: '0.03',
      ratio: '15',
      cacheRatio: '0.1',
      createCacheRatio: '1.25',
      completionRatio: '2',
      imageRatio: '1.5',
      audioRatio: '3',
      audioCompletionRatio: '5',
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty name', () => {
    const result = schema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Model name is required')
    }
  })

  test('rejects missing name', () => {
    const result = schema.safeParse({})
    expect(result.success).toBe(false)
  })

  test('accepts undefined optional fields', () => {
    const result = schema.safeParse({ name: 'test-model' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.price).toBeUndefined()
      expect(result.data.ratio).toBeUndefined()
      expect(result.data.completionRatio).toBeUndefined()
    }
  })

  test('rejects non-string name', () => {
    const result = schema.safeParse({ name: 123 })
    expect(result.success).toBe(false)
  })

  test('uses t function for error messages', () => {
    const customT = (key: string) => `TRANSLATED: ${key}`
    const customSchema = createModelPricingSchema(customT)
    const result = customSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'TRANSLATED: Model name is required'
      )
    }
  })
})

describe('hasValue', () => {
  test('returns true for non-empty string', () => {
    expect(hasValue('hello')).toBe(true)
  })

  test('returns true for number', () => {
    expect(hasValue(42)).toBe(true)
  })

  test('returns true for zero', () => {
    expect(hasValue(0)).toBe(true)
  })

  test('returns true for true', () => {
    expect(hasValue(true)).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(hasValue('')).toBe(false)
  })

  test('returns false for null', () => {
    expect(hasValue(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(hasValue(undefined)).toBe(false)
  })

  test('returns false for false', () => {
    expect(hasValue(false)).toBe(false)
  })

  test('returns true for object', () => {
    expect(hasValue({})).toBe(true)
  })

  test('returns true for array', () => {
    expect(hasValue([])).toBe(true)
  })
})

describe('toNumberOrNull', () => {
  test('returns number for valid numeric string', () => {
    expect(toNumberOrNull('42')).toBe(42)
  })

  test('returns number for float string', () => {
    expect(toNumberOrNull('3.14')).toBe(3.14)
  })

  test('returns number for actual number', () => {
    expect(toNumberOrNull(42)).toBe(42)
  })

  test('returns 0 for 0', () => {
    expect(toNumberOrNull(0)).toBe(0)
  })

  test('returns null for empty string', () => {
    expect(toNumberOrNull('')).toBeNull()
  })

  test('returns null for null', () => {
    expect(toNumberOrNull(null)).toBeNull()
  })

  test('returns null for undefined', () => {
    expect(toNumberOrNull(undefined)).toBeNull()
  })

  test('returns null for false', () => {
    expect(toNumberOrNull(false)).toBeNull()
  })

  test('returns null for NaN string', () => {
    expect(toNumberOrNull('not-a-number')).toBeNull()
  })

  test('returns null for Infinity', () => {
    expect(toNumberOrNull(Infinity)).toBeNull()
  })

  test('returns null for -Infinity', () => {
    expect(toNumberOrNull(-Infinity)).toBeNull()
  })

  test('returns number for negative numeric string', () => {
    expect(toNumberOrNull('-5')).toBe(-5)
  })
})

describe('createInitialLaneState', () => {
  test('returns empty state for null input', () => {
    const state = createInitialLaneState(null)
    expect(state.promptPrice).toBe('')
    expect(state.prices).toEqual(EMPTY_LANE_PRICES)
    expect(state.enabled).toEqual(EMPTY_LANE_ENABLED)
  })

  test('returns empty state for undefined input', () => {
    const state = createInitialLaneState(undefined)
    expect(state.promptPrice).toBe('')
    expect(state.prices).toEqual(EMPTY_LANE_PRICES)
    expect(state.enabled).toEqual(EMPTY_LANE_ENABLED)
  })

  test('returns empty state when called without arguments', () => {
    const state = createInitialLaneState()
    expect(state.promptPrice).toBe('')
    expect(state.prices).toEqual(EMPTY_LANE_PRICES)
    expect(state.enabled).toEqual(EMPTY_LANE_ENABLED)
  })

  test('computes promptPrice from ratio', () => {
    const state = createInitialLaneState({ name: 'test', ratio: '15' })
    expect(state.promptPrice).toBe('30')
  })

  test('enables lanes that have ratios', () => {
    const state = createInitialLaneState({
      name: 'test',
      ratio: '15',
      completionRatio: '2',
      cacheRatio: '0.5',
    })
    expect(state.enabled.completion).toBe(true)
    expect(state.enabled.cache).toBe(true)
    expect(state.enabled.createCache).toBe(false)
    expect(state.enabled.image).toBe(false)
    expect(state.enabled.audioInput).toBe(false)
    expect(state.enabled.audioOutput).toBe(false)
  })

  test('returns empty prices when ratio is missing', () => {
    const state = createInitialLaneState({ name: 'test' })
    expect(state.promptPrice).toBe('')
    expect(state.prices.completion).toBe('')
  })

  test('computes completion price from ratio and completionRatio', () => {
    const state = createInitialLaneState({
      name: 'test',
      ratio: '15',
      completionRatio: '2',
    })
    expect(state.promptPrice).toBe('30')
    expect(state.prices.completion).toBe('60')
  })

  test('does not return reference to EMPTY objects', () => {
    const state1 = createInitialLaneState(null)
    const state2 = createInitialLaneState(null)
    expect(state1.prices).not.toBe(state2.prices)
    expect(state1.enabled).not.toBe(state2.enabled)
  })
})

describe('buildPreviewRows', () => {
  const emptyValues: ModelPricingFormValues = { name: 'test-model' }
  const emptyPrices: Record<LaneKey, string> = { ...EMPTY_LANE_PRICES }
  const emptyEnabled: Record<LaneKey, boolean> = { ...EMPTY_LANE_ENABLED }

  test('returns tiered_expr rows with combined expression', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'tiered_expr',
      'tier("default", p*2 + c*4)',
      '',
      '',
      emptyPrices,
      emptyEnabled,
      t
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].key).toBe('mode')
    expect(rows[0].value).toBe('tiered_expr')
    expect(rows[1].key).toBe('expr')
    expect(rows[1].value).toBe('tier("default", p*2 + c*4)')
    expect(rows[1].multiline).toBe(true)
  })

  test('returns tiered_expr with combined billing and request rule expression', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'tiered_expr',
      'tier("default", p*2)',
      '(param("test") == true ? 1.5 : 1)',
      '',
      emptyPrices,
      emptyEnabled,
      t
    )
    expect(rows[1].value).toBe(
      '(tier("default", p*2)) * (param("test") == true ? 1.5 : 1)'
    )
  })

  test('returns tiered_expr Empty when billingExpr is empty', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'tiered_expr',
      '',
      '',
      '',
      emptyPrices,
      emptyEnabled,
      t
    )
    expect(rows[1].value).toBe('Empty')
  })

  test('returns per-request rows with price value', () => {
    const values: ModelPricingFormValues = { name: 'test', price: '0.002' }
    const rows = buildPreviewRows(
      values,
      'per-request',
      '',
      '',
      '',
      emptyPrices,
      emptyEnabled,
      t
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe('price')
    expect(rows[0].label).toBe('ModelPrice')
    expect(rows[0].value).toBe('0.002')
  })

  test('returns per-request Empty when price is missing', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'per-request',
      '',
      '',
      '',
      emptyPrices,
      emptyEnabled,
      t
    )
    expect(rows[0].value).toBe('Empty')
  })

  test('returns per-token rows with all lanes', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'per-token',
      '',
      '',
      '30',
      {
        completion: '60',
        cache: '3',
        createCache: '37.5',
        image: '25',
        audioInput: '38.1',
        audioOutput: '151.1',
      },
      {
        completion: true,
        cache: true,
        createCache: true,
        image: true,
        audioInput: true,
        audioOutput: true,
      },
      t
    )
    expect(rows).toHaveLength(7)
    expect(rows[0].key).toBe('inputPrice')
    expect(rows[0].value).toBe('$30')
    expect(rows[1].key).toBe('completion')
    expect(rows[1].value).toBe('$60')
    expect(rows[2].key).toBe('cache')
    expect(rows[2].value).toBe('$3')
    expect(rows[3].key).toBe('createCache')
    expect(rows[3].value).toBe('$37.5')
    expect(rows[4].key).toBe('image')
    expect(rows[4].value).toBe('$25')
    expect(rows[5].key).toBe('audio')
    expect(rows[5].value).toBe('$38.1')
    expect(rows[6].key).toBe('audioCompletion')
    expect(rows[6].value).toBe('$151.1')
  })

  test('returns Empty for disabled per-token lanes', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'per-token',
      '',
      '',
      '30',
      {
        completion: '60',
        cache: '3',
        createCache: '',
        image: '',
        audioInput: '',
        audioOutput: '',
      },
      {
        completion: true,
        cache: false,
        createCache: false,
        image: false,
        audioInput: false,
        audioOutput: false,
      },
      t
    )
    expect(rows[1].value).toBe('$60')
    expect(rows[2].value).toBe('Empty')
    expect(rows[3].value).toBe('Empty')
    expect(rows[4].value).toBe('Empty')
    expect(rows[5].value).toBe('Empty')
    expect(rows[6].value).toBe('Empty')
  })

  test('returns Empty for input price when promptPrice is empty', () => {
    const rows = buildPreviewRows(
      emptyValues,
      'per-token',
      '',
      '',
      '',
      emptyPrices,
      emptyEnabled,
      t
    )
    expect(rows[0].value).toBe('Empty')
  })

  test('uses t function for labels', () => {
    const customT = (key: string) => `[${key}]`
    const rows = buildPreviewRows(
      emptyValues,
      'per-token',
      '',
      '',
      '',
      emptyPrices,
      emptyEnabled,
      customT
    )
    expect(rows[0].label).toBe('[Input price]')
    expect(rows[0].value).toBe('[Empty]')
  })
})
