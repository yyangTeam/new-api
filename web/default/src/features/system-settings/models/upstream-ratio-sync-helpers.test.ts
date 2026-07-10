import {
  RATIO_SYNC_FIELDS,
  SYNC_FIELD_ORDER,
  NUMERIC_SYNC_FIELDS,
  getSyncFieldLabel,
  getOrderedRatioTypes,
  getPreferredSyncField,
  isSelectableUpstreamValue,
} from './upstream-ratio-sync-helpers'
import type { RatioDifferenceEntry } from './upstream-ratio-sync-helpers'
import type { RatioType } from '../types'

describe('RATIO_SYNC_FIELDS', () => {
  test('contains expected ratio fields', () => {
    expect(RATIO_SYNC_FIELDS).toContain('model_ratio')
    expect(RATIO_SYNC_FIELDS).toContain('completion_ratio')
    expect(RATIO_SYNC_FIELDS).toContain('cache_ratio')
    expect(RATIO_SYNC_FIELDS).toContain('create_cache_ratio')
    expect(RATIO_SYNC_FIELDS).toContain('image_ratio')
    expect(RATIO_SYNC_FIELDS).toContain('audio_ratio')
    expect(RATIO_SYNC_FIELDS).toContain('audio_completion_ratio')
  })
})

describe('SYNC_FIELD_ORDER', () => {
  test('includes all RATIO_SYNC_FIELDS plus model_price and billing_mode and billing_expr', () => {
    for (const field of RATIO_SYNC_FIELDS) {
      expect(SYNC_FIELD_ORDER).toContain(field)
    }
    expect(SYNC_FIELD_ORDER).toContain('model_price')
    expect(SYNC_FIELD_ORDER).toContain('billing_mode')
    expect(SYNC_FIELD_ORDER).toContain('billing_expr')
  })
})

describe('NUMERIC_SYNC_FIELDS', () => {
  test('contains ratio fields and model_price', () => {
    expect(NUMERIC_SYNC_FIELDS.has('model_ratio')).toBe(true)
    expect(NUMERIC_SYNC_FIELDS.has('model_price')).toBe(true)
    expect(NUMERIC_SYNC_FIELDS.has('completion_ratio')).toBe(true)
  })

  test('does not contain billing_mode or billing_expr', () => {
    expect(NUMERIC_SYNC_FIELDS.has('billing_mode')).toBe(false)
    expect(NUMERIC_SYNC_FIELDS.has('billing_expr')).toBe(false)
  })
})

describe('getSyncFieldLabel', () => {
  const t = (key: string) => key

  test('returns translated label for known ratio type', () => {
    expect(getSyncFieldLabel('model_ratio', t)).toBe('Model ratio')
    expect(getSyncFieldLabel('completion_ratio', t)).toBe('Completion ratio')
    expect(getSyncFieldLabel('model_price', t)).toBe('Fixed price')
    expect(getSyncFieldLabel('billing_expr', t)).toBe('Expression billing')
  })

  test('returns raw value for unknown ratio type', () => {
    expect(getSyncFieldLabel('unknown_field', t)).toBe('unknown_field')
  })
})

describe('getOrderedRatioTypes', () => {
  test('orders types according to SYNC_FIELD_ORDER', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      completion_ratio: { current: 1, upstreams: {}, confidence: {} },
      model_ratio: { current: 2, upstreams: {}, confidence: {} },
    }
    const result = getOrderedRatioTypes(ratioTypes)
    expect(result).toEqual(['model_ratio', 'completion_ratio'])
  })

  test('appends unknown types after known ones', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: {}, confidence: {} },
      billing_expr: { current: 'expr', upstreams: {}, confidence: {} },
    }
    const result = getOrderedRatioTypes(ratioTypes)
    expect(result[0]).toBe('model_ratio')
    expect(result).toContain('billing_expr')
  })

  test('returns all types when no filter', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: {}, confidence: {} },
      completion_ratio: { current: 2, upstreams: {}, confidence: {} },
    }
    expect(getOrderedRatioTypes(ratioTypes).length).toBe(2)
  })

  test('returns all types when filter is __all__', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: {}, confidence: {} },
      completion_ratio: { current: 2, upstreams: {}, confidence: {} },
    }
    expect(getOrderedRatioTypes(ratioTypes, '__all__').length).toBe(2)
  })

  test('filters to single type when filter specified', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: {}, confidence: {} },
      completion_ratio: { current: 2, upstreams: {}, confidence: {} },
      cache_ratio: { current: 3, upstreams: {}, confidence: {} },
    }
    const result = getOrderedRatioTypes(ratioTypes, 'cache_ratio')
    expect(result).toEqual(['cache_ratio'])
  })

  test('returns empty when filter does not match', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: {}, confidence: {} },
    }
    const result = getOrderedRatioTypes(ratioTypes, 'cache_ratio')
    expect(result).toEqual([])
  })
})

describe('getPreferredSyncField', () => {
  test('returns billing_expr when upstream has non-same billing_expr value', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: { src: 2 }, confidence: { src: true } },
      billing_expr: { current: 'old', upstreams: { src: 'new_expr' }, confidence: { src: true } },
    }
    const result = getPreferredSyncField(ratioTypes, 'model_ratio', 'src')
    expect(result).toBe('billing_expr')
  })

  test('returns original ratioType when billing_expr upstream is same', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: { src: 2 }, confidence: { src: true } },
      billing_expr: { current: 'expr', upstreams: { src: 'same' }, confidence: { src: true } },
    }
    const result = getPreferredSyncField(ratioTypes, 'model_ratio', 'src')
    expect(result).toBe('model_ratio')
  })

  test('returns original ratioType when billing_expr is not present', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: { src: 2 }, confidence: { src: true } },
    }
    const result = getPreferredSyncField(ratioTypes, 'model_ratio', 'src')
    expect(result).toBe('model_ratio')
  })

  test('returns billing_expr itself when ratioType is billing_expr', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      billing_expr: { current: 'old', upstreams: { src: 'new' }, confidence: { src: true } },
    }
    const result = getPreferredSyncField(ratioTypes, 'billing_expr', 'src')
    expect(result).toBe('billing_expr')
  })

  test('returns original when billing_expr upstream is null for source', () => {
    const ratioTypes: Partial<Record<RatioType, RatioDifferenceEntry>> = {
      model_ratio: { current: 1, upstreams: { src: 2 }, confidence: { src: true } },
      billing_expr: { current: 'expr', upstreams: { other: 'val' }, confidence: { other: true } },
    }
    const result = getPreferredSyncField(ratioTypes, 'model_ratio', 'src')
    expect(result).toBe('model_ratio')
  })
})

describe('isSelectableUpstreamValue', () => {
  test('returns true for numbers', () => {
    expect(isSelectableUpstreamValue(0)).toBe(true)
    expect(isSelectableUpstreamValue(42)).toBe(true)
    expect(isSelectableUpstreamValue(-1)).toBe(true)
  })

  test('returns true for strings', () => {
    expect(isSelectableUpstreamValue('value')).toBe(true)
    expect(isSelectableUpstreamValue('')).toBe(true)
  })

  test('returns false for same', () => {
    expect(isSelectableUpstreamValue('same')).toBe(false)
  })

  test('returns false for null', () => {
    expect(isSelectableUpstreamValue(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isSelectableUpstreamValue(undefined)).toBe(false)
  })
})
