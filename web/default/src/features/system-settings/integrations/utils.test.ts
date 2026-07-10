import {
  removeTrailingSlash,
  formatJsonForEditor,
  normalizeJsonForComparison,
  isValidJson,
  getJsonError,
} from './utils'

describe('removeTrailingSlash', () => {
  test('removes single trailing slash', () => {
    expect(removeTrailingSlash('https://example.com/')).toBe('https://example.com')
  })

  test('removes multiple trailing slashes', () => {
    expect(removeTrailingSlash('https://example.com///')).toBe('https://example.com')
  })

  test('leaves URLs without trailing slash unchanged', () => {
    expect(removeTrailingSlash('https://example.com')).toBe('https://example.com')
  })

  test('returns empty string for empty input', () => {
    expect(removeTrailingSlash('')).toBe('')
  })

  test('returns empty string for whitespace-only input', () => {
    expect(removeTrailingSlash('   ')).toBe('')
  })

  test('trims whitespace before processing', () => {
    expect(removeTrailingSlash('  https://example.com/  ')).toBe('https://example.com')
  })

  test('does not remove internal slashes', () => {
    expect(removeTrailingSlash('https://example.com/api/v1')).toBe('https://example.com/api/v1')
  })

  test('handles root slash only', () => {
    expect(removeTrailingSlash('/')).toBe('')
  })
})

describe('formatJsonForEditor', () => {
  test('pretty-prints valid JSON', () => {
    expect(formatJsonForEditor('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  test('returns empty string for empty input', () => {
    expect(formatJsonForEditor('')).toBe('')
  })

  test('returns empty string for whitespace-only input', () => {
    expect(formatJsonForEditor('   ')).toBe('')
  })

  test('returns trimmed input for invalid JSON', () => {
    expect(formatJsonForEditor('  {bad}  ')).toBe('{bad}')
  })

  test('handles JSON arrays', () => {
    expect(formatJsonForEditor('[1,2]')).toBe('[\n  1,\n  2\n]')
  })
})

describe('normalizeJsonForComparison', () => {
  test('compacts JSON into single line', () => {
    expect(normalizeJsonForComparison('{ "a" : 1 }')).toBe('{"a":1}')
  })

  test('normalizes pretty-printed JSON', () => {
    expect(normalizeJsonForComparison('{\n  "a": 1\n}')).toBe('{"a":1}')
  })

  test('returns empty string for empty input', () => {
    expect(normalizeJsonForComparison('')).toBe('')
  })

  test('returns empty string for whitespace-only input', () => {
    expect(normalizeJsonForComparison('   ')).toBe('')
  })

  test('returns trimmed input for invalid JSON', () => {
    expect(normalizeJsonForComparison('  not-json  ')).toBe('not-json')
  })

  test('two equivalent JSONs normalize to the same string', () => {
    const a = normalizeJsonForComparison('{"b":2,"a":1}')
    const b = normalizeJsonForComparison('{"b":2, "a": 1}')
    expect(a).toBe(b)
  })
})

describe('isValidJson', () => {
  test('returns true for valid JSON object', () => {
    expect(isValidJson('{"a":1}')).toBe(true)
  })

  test('returns true for valid JSON array', () => {
    expect(isValidJson('[1,2,3]')).toBe(true)
  })

  test('returns true for valid JSON primitives', () => {
    expect(isValidJson('"hello"')).toBe(true)
    expect(isValidJson('42')).toBe(true)
    expect(isValidJson('true')).toBe(true)
    expect(isValidJson('null')).toBe(true)
  })

  test('returns true for empty string', () => {
    expect(isValidJson('')).toBe(true)
  })

  test('returns true for whitespace-only string', () => {
    expect(isValidJson('   ')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(isValidJson('{bad}')).toBe(false)
  })

  test('returns false for trailing comma', () => {
    expect(isValidJson('{"a":1,}')).toBe(false)
  })

  test('passes predicate check', () => {
    expect(isValidJson('{"a":1}', (v) => typeof v === 'object')).toBe(true)
  })

  test('fails predicate check', () => {
    expect(isValidJson('"string"', (v) => Array.isArray(v))).toBe(false)
  })

  test('predicate not called for empty input', () => {
    const predicate = vi.fn(() => false)
    expect(isValidJson('', predicate)).toBe(true)
    expect(predicate).not.toHaveBeenCalled()
  })
})

describe('getJsonError', () => {
  test('returns null for valid JSON', () => {
    expect(getJsonError('{"a":1}')).toBeNull()
  })

  test('returns null for empty input', () => {
    expect(getJsonError('')).toBeNull()
  })

  test('returns null for whitespace-only input', () => {
    expect(getJsonError('   ')).toBeNull()
  })

  test('returns error string for invalid JSON', () => {
    const error = getJsonError('{bad}')
    expect(error).not.toBeNull()
    expect(typeof error).toBe('string')
  })

  test('returns null when predicate passes', () => {
    expect(getJsonError('[1,2]', (v) => Array.isArray(v))).toBeNull()
  })

  test('returns structure error when predicate fails', () => {
    const error = getJsonError('"string"', (v) => Array.isArray(v))
    expect(error).toBe('JSON structure is invalid')
  })

  test('predicate not called for empty input', () => {
    const predicate = vi.fn(() => false)
    expect(getJsonError('', predicate)).toBeNull()
    expect(predicate).not.toHaveBeenCalled()
  })
})
