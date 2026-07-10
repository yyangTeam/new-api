import { formatJsonForTextarea, normalizeJsonString, validateJsonString } from './utils'

describe('formatJsonForTextarea', () => {
  test('pretty-prints valid JSON', () => {
    expect(formatJsonForTextarea('{"a":1,"b":2}')).toBe('{\n  "a": 1,\n  "b": 2\n}')
  })

  test('pretty-prints valid JSON array', () => {
    expect(formatJsonForTextarea('[1,2,3]')).toBe('[\n  1,\n  2,\n  3\n]')
  })

  test('returns empty string for empty input', () => {
    expect(formatJsonForTextarea('')).toBe('')
  })

  test('returns empty string for whitespace-only input', () => {
    expect(formatJsonForTextarea('   ')).toBe('')
  })

  test('returns original string for invalid JSON', () => {
    expect(formatJsonForTextarea('{bad}')).toBe('{bad}')
  })

  test('handles already formatted JSON', () => {
    const formatted = '{\n  "a": 1\n}'
    expect(formatJsonForTextarea(formatted)).toBe(formatted)
  })
})

describe('normalizeJsonString', () => {
  test('compacts valid JSON', () => {
    expect(normalizeJsonString('{ "a" : 1 , "b" : 2 }')).toBe('{"a":1,"b":2}')
  })

  test('normalizes already compact JSON', () => {
    expect(normalizeJsonString('{"a":1}')).toBe('{"a":1}')
  })

  test('normalizes pretty-printed JSON', () => {
    expect(normalizeJsonString('{\n  "a": 1\n}')).toBe('{"a":1}')
  })

  test('returns empty string for empty input', () => {
    expect(normalizeJsonString('')).toBe('')
  })

  test('returns empty string for whitespace-only input', () => {
    expect(normalizeJsonString('   ')).toBe('')
  })

  test('returns trimmed input for invalid JSON', () => {
    expect(normalizeJsonString('  {bad}  ')).toBe('{bad}')
  })
})

describe('validateJsonString', () => {
  test('valid JSON returns valid true', () => {
    const result = validateJsonString('{"a":1}')
    expect(result.valid).toBe(true)
  })

  test('valid JSON array returns valid true', () => {
    const result = validateJsonString('[1,2,3]')
    expect(result.valid).toBe(true)
  })

  test('empty string is valid by default (allowEmpty)', () => {
    const result = validateJsonString('')
    expect(result.valid).toBe(true)
  })

  test('whitespace-only is valid by default', () => {
    const result = validateJsonString('   ')
    expect(result.valid).toBe(true)
  })

  test('empty string is invalid when allowEmpty is false', () => {
    const result = validateJsonString('', { allowEmpty: false })
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Value is required')
    expect(result.error?.type).toBe('required')
  })

  test('invalid JSON returns valid false with syntax error', () => {
    const result = validateJsonString('{bad json}')
    expect(result.valid).toBe(false)
    expect(result.error?.type).toBe('syntax')
    expect(typeof result.message).toBe('string')
  })

  test('passes predicate check', () => {
    const result = validateJsonString('{"key":"val"}', {
      predicate: (v) => typeof v === 'object' && v !== null,
    })
    expect(result.valid).toBe(true)
  })

  test('fails predicate check', () => {
    const result = validateJsonString('"just a string"', {
      predicate: (v) => typeof v === 'object' && v !== null,
    })
    expect(result.valid).toBe(false)
    expect(result.error?.type).toBe('structure')
    expect(result.message).toBe('JSON structure is invalid')
  })

  test('uses custom predicate message', () => {
    const result = validateJsonString('"string"', {
      predicate: (v) => Array.isArray(v),
      predicateMessage: 'Must be an array',
    })
    expect(result.valid).toBe(false)
    expect(result.message).toBe('Must be an array')
  })

  test('trailing comma produces syntax error', () => {
    const result = validateJsonString('{"a":1,}')
    expect(result.valid).toBe(false)
    expect(result.error?.type).toBe('syntax')
  })
})
