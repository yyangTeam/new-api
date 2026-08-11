import { describe, it, expect } from 'vitest'

import {
  PREFILL_GROUP_TYPES,
  PREFILL_GROUP_TYPE_META,
  DEFAULT_FORM_VALUES,
  parseStringItems,
  parseEndpointKeys,
  serializeEndpointItems,
} from '@/features/models/components/prefill-group-shared'

describe('PREFILL_GROUP_TYPES', () => {
  it('has 3 group types', () => {
    expect(PREFILL_GROUP_TYPES).toHaveLength(3)
  })

  it('includes model, tag, and endpoint types', () => {
    const values = PREFILL_GROUP_TYPES.map((t) => t.value)
    expect(values).toEqual(['model', 'tag', 'endpoint'])
  })
})

describe('PREFILL_GROUP_TYPE_META', () => {
  it('has metadata for model type', () => {
    expect(PREFILL_GROUP_TYPE_META.model).toEqual({
      label: 'Model Group',
      badge: 'blue',
    })
  })

  it('has metadata for tag type', () => {
    expect(PREFILL_GROUP_TYPE_META.tag).toEqual({
      label: 'Tag Group',
      badge: 'purple',
    })
  })

  it('has metadata for endpoint type', () => {
    expect(PREFILL_GROUP_TYPE_META.endpoint).toEqual({
      label: 'Endpoint Group',
      badge: 'cyan',
    })
  })
})

describe('DEFAULT_FORM_VALUES', () => {
  it('has correct defaults', () => {
    expect(DEFAULT_FORM_VALUES).toEqual({
      name: '',
      description: '',
      type: 'model',
      items: [],
    })
  })
})

describe('parseStringItems', () => {
  it('returns empty array for null/undefined', () => {
    expect(parseStringItems(undefined as any)).toEqual([])
    expect(parseStringItems(null as any)).toEqual([])
  })

  it('returns array directly when items is already an array', () => {
    expect(parseStringItems(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('trims whitespace from array items', () => {
    expect(parseStringItems([' a ', ' b '])).toEqual(['a', 'b'])
  })

  it('filters empty strings from array', () => {
    expect(parseStringItems(['a', '', 'b', '  '])).toEqual(['a', 'b'])
  })

  it('handles non-string items in array gracefully', () => {
    expect(parseStringItems([123 as any, 'a'])).toEqual(['a'])
  })

  it('parses JSON array string', () => {
    expect(parseStringItems('["model1", "model2"]')).toEqual(['model1', 'model2'])
  })

  it('splits by newline/comma when not valid JSON', () => {
    expect(parseStringItems('model1,model2,model3')).toEqual([
      'model1',
      'model2',
      'model3',
    ])
  })

  it('splits by newline', () => {
    expect(parseStringItems('model1\nmodel2\nmodel3')).toEqual([
      'model1',
      'model2',
      'model3',
    ])
  })

  it('trims and filters when splitting', () => {
    expect(parseStringItems(' a , , b ')).toEqual(['a', 'b'])
  })

  it('returns empty array for empty string', () => {
    expect(parseStringItems('')).toEqual([])
  })

  it('handles JSON array with non-string values', () => {
    expect(parseStringItems('[1, "a", null]')).toEqual(['a'])
  })

  it('falls back to comma/newline split for non-array JSON', () => {
    expect(parseStringItems('{"key": "value"}')).toEqual([])
  })
})

describe('parseEndpointKeys', () => {
  it('returns empty array for null/undefined', () => {
    expect(parseEndpointKeys(undefined as any)).toEqual([])
    expect(parseEndpointKeys(null as any)).toEqual([])
  })

  it('parses JSON array of strings', () => {
    expect(parseEndpointKeys('["ep1", "ep2"]')).toEqual(['ep1', 'ep2'])
  })

  it('parses array of objects with name property', () => {
    const items = JSON.stringify([
      { name: 'endpoint1', path: '/v1' },
      { name: 'endpoint2', path: '/v2' },
    ])
    expect(parseEndpointKeys(items)).toEqual(['endpoint1', 'endpoint2'])
  })

  it('parses JSON object keys', () => {
    expect(parseEndpointKeys('{"chat": "/v1/chat", "embed": "/v1/embed"}')).toEqual([
      'chat',
      'embed',
    ])
  })

  it('handles non-JSON string gracefully', () => {
    expect(parseEndpointKeys('invalid json')).toEqual([])
  })

  it('handles array items directly (non-string)', () => {
    expect(parseEndpointKeys(['ep1', 'ep2'])).toEqual(['ep1', 'ep2'])
  })

  it('filters empty values', () => {
    expect(parseEndpointKeys('["ep1", "", "ep2"]')).toEqual(['ep1', 'ep2'])
  })

  it('returns empty for empty string', () => {
    expect(parseEndpointKeys('')).toEqual([])
  })
})

describe('serializeEndpointItems', () => {
  it('returns empty string for null/undefined', () => {
    expect(serializeEndpointItems(undefined as any)).toBe('')
    expect(serializeEndpointItems(null as any)).toBe('')
  })

  it('returns string as-is when items is a string', () => {
    expect(serializeEndpointItems('{"key": "value"}')).toBe('{"key": "value"}')
  })

  it('serializes array to JSON', () => {
    const result = serializeEndpointItems(['a', 'b'])
    expect(JSON.parse(result)).toEqual(['a', 'b'])
  })

  it('returns empty string for empty string input', () => {
    expect(serializeEndpointItems('')).toBe('')
  })
})
