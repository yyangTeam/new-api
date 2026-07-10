import {
  normalizeModelList,
  parseUpstreamUpdateMeta,
} from './upstream-update-utils'

describe('normalizeModelList', () => {
  test('returns unique trimmed non-empty strings', () => {
    expect(normalizeModelList(['gpt-4', 'gpt-3.5', 'gpt-4'])).toEqual([
      'gpt-4',
      'gpt-3.5',
    ])
  })

  test('trims whitespace from model names', () => {
    expect(normalizeModelList(['  gpt-4  ', ' claude-3 '])).toEqual([
      'gpt-4',
      'claude-3',
    ])
  })

  test('filters out empty and falsy values', () => {
    expect(normalizeModelList(['gpt-4', '', null, undefined, 0] as any)).toEqual([
      'gpt-4',
    ])
  })

  test('returns empty array for empty input', () => {
    expect(normalizeModelList([])).toEqual([])
  })

  test('returns empty array for undefined input', () => {
    expect(normalizeModelList(undefined as any)).toEqual([])
  })

  test('converts non-string values to strings', () => {
    expect(normalizeModelList([123, true, 'model'] as any)).toEqual([
      '123',
      'true',
      'model',
    ])
  })

  test('removes duplicates after trimming', () => {
    expect(normalizeModelList(['gpt-4', '  gpt-4  ', 'gpt-4'])).toEqual([
      'gpt-4',
    ])
  })

  test('filters out values that become empty after trim', () => {
    expect(normalizeModelList(['  ', '\t', '\n'])).toEqual([])
  })
})

describe('parseUpstreamUpdateMeta', () => {
  test('parses object settings correctly', () => {
    const settings = {
      upstream_model_update_check_enabled: true,
      upstream_model_update_last_detected_models: ['gpt-4', 'gpt-3.5'],
      upstream_model_update_last_removed_models: ['old-model'],
    }
    const result = parseUpstreamUpdateMeta(settings)
    expect(result.enabled).toBe(true)
    expect(result.pendingAddModels).toEqual(['gpt-4', 'gpt-3.5'])
    expect(result.pendingRemoveModels).toEqual(['old-model'])
  })

  test('parses JSON string settings correctly', () => {
    const settings = JSON.stringify({
      upstream_model_update_check_enabled: true,
      upstream_model_update_last_detected_models: ['model-a'],
      upstream_model_update_last_removed_models: [],
    })
    const result = parseUpstreamUpdateMeta(settings)
    expect(result.enabled).toBe(true)
    expect(result.pendingAddModels).toEqual(['model-a'])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for null input', () => {
    const result = parseUpstreamUpdateMeta(null)
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for undefined input', () => {
    const result = parseUpstreamUpdateMeta(undefined)
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for array input', () => {
    const result = parseUpstreamUpdateMeta([1, 2, 3])
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for invalid JSON string', () => {
    const result = parseUpstreamUpdateMeta('{invalid json}')
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for primitive string that is not JSON', () => {
    const result = parseUpstreamUpdateMeta('hello')
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for numeric input', () => {
    const result = parseUpstreamUpdateMeta(42)
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults for boolean input', () => {
    const result = parseUpstreamUpdateMeta(true)
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('enabled is false when key is missing', () => {
    const result = parseUpstreamUpdateMeta({})
    expect(result.enabled).toBe(false)
  })

  test('enabled is false when value is not true', () => {
    const result = parseUpstreamUpdateMeta({
      upstream_model_update_check_enabled: 'true',
    })
    expect(result.enabled).toBe(false)
  })

  test('enabled is false when value is false', () => {
    const result = parseUpstreamUpdateMeta({
      upstream_model_update_check_enabled: false,
    })
    expect(result.enabled).toBe(false)
  })

  test('handles missing model arrays gracefully', () => {
    const result = parseUpstreamUpdateMeta({
      upstream_model_update_check_enabled: true,
    })
    expect(result.enabled).toBe(true)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('normalizes detected models (dedup, trim, filter)', () => {
    const settings = {
      upstream_model_update_check_enabled: true,
      upstream_model_update_last_detected_models: [
        '  gpt-4  ',
        'gpt-4',
        '',
        'claude-3',
      ],
      upstream_model_update_last_removed_models: [],
    }
    const result = parseUpstreamUpdateMeta(settings)
    expect(result.pendingAddModels).toEqual(['gpt-4', 'claude-3'])
  })

  test('normalizes removed models (dedup, trim, filter)', () => {
    const settings = {
      upstream_model_update_check_enabled: false,
      upstream_model_update_last_detected_models: [],
      upstream_model_update_last_removed_models: [
        'old',
        '  old  ',
        '',
        'removed',
      ],
    }
    const result = parseUpstreamUpdateMeta(settings)
    expect(result.pendingRemoveModels).toEqual(['old', 'removed'])
  })

  test('parses empty JSON string object', () => {
    const result = parseUpstreamUpdateMeta('{}')
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })

  test('returns defaults when JSON string parses to null', () => {
    const result = parseUpstreamUpdateMeta('null')
    expect(result.enabled).toBe(false)
    expect(result.pendingAddModels).toEqual([])
    expect(result.pendingRemoveModels).toEqual([])
  })
})
