import { safeJsonParse, safeJsonParseWithValidation, tryJsonParse } from './json-parser'

describe('safeJsonParse', () => {
  test('parses valid JSON string', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 })
  })

  test('parses valid JSON array', () => {
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3])
  })

  test('parses JSON with surrounding whitespace', () => {
    expect(safeJsonParse('  {"key":"value"}  ')).toEqual({ key: 'value' })
  })

  test('returns null for undefined input', () => {
    expect(safeJsonParse(undefined)).toBe(null)
  })

  test('returns null for null input', () => {
    expect(safeJsonParse(null)).toBe(null)
  })

  test('returns null for empty string', () => {
    expect(safeJsonParse('')).toBe(null)
  })

  test('returns null for whitespace-only string', () => {
    expect(safeJsonParse('   ')).toBe(null)
  })

  test('returns fallback for undefined input', () => {
    expect(safeJsonParse(undefined, { fallback: {} })).toEqual({})
  })

  test('returns fallback for null input', () => {
    expect(safeJsonParse(null, { fallback: [] })).toEqual([])
  })

  test('returns fallback for empty string', () => {
    expect(safeJsonParse('', { fallback: 'default' })).toBe('default')
  })

  test('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('{invalid}', { fallback: { x: 1 }, silent: true })).toEqual({ x: 1 })
  })

  test('returns null when invalid JSON and no fallback', () => {
    expect(safeJsonParse('{bad json}', { silent: true })).toBe(null)
  })

  test('parses primitive JSON values', () => {
    expect(safeJsonParse('42')).toBe(42)
    expect(safeJsonParse('"hello"')).toBe('hello')
    expect(safeJsonParse('true')).toBe(true)
    expect(safeJsonParse('null')).toBe(null)
  })

  test('parses nested objects', () => {
    const json = '{"a":{"b":{"c":3}}}'
    expect(safeJsonParse(json)).toEqual({ a: { b: { c: 3 } } })
  })
})

describe('safeJsonParseWithValidation', () => {
  const isStringRecord = (data: unknown): data is Record<string, string> =>
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    Object.values(data as Record<string, unknown>).every((v) => typeof v === 'string')

  test('returns parsed data when valid JSON passes validator', () => {
    const result = safeJsonParseWithValidation('{"a":"b"}', {
      fallback: {},
      validator: isStringRecord,
      silent: true,
    })
    expect(result).toEqual({ a: 'b' })
  })

  test('returns fallback when valid JSON fails validator', () => {
    const result = safeJsonParseWithValidation('{"a":123}', {
      fallback: { default: 'val' },
      validator: isStringRecord,
      silent: true,
    })
    expect(result).toEqual({ default: 'val' })
  })

  test('returns fallback for invalid JSON', () => {
    const result = safeJsonParseWithValidation('{bad}', {
      fallback: { x: 'y' },
      validator: isStringRecord,
      silent: true,
    })
    expect(result).toEqual({ x: 'y' })
  })

  test('returns fallback for empty input', () => {
    const result = safeJsonParseWithValidation('', {
      fallback: { empty: 'true' },
      validator: isStringRecord,
      silent: true,
    })
    expect(result).toEqual({ empty: 'true' })
  })

  test('returns fallback for null input', () => {
    const result = safeJsonParseWithValidation(null, {
      fallback: { n: 'null' },
      validator: isStringRecord,
      silent: true,
    })
    expect(result).toEqual({ n: 'null' })
  })

  test('returns fallback for undefined input', () => {
    const result = safeJsonParseWithValidation(undefined, {
      fallback: {},
      validator: isStringRecord,
      silent: true,
    })
    expect(result).toEqual({})
  })

  test('works with array validator', () => {
    const isNumArray = (data: unknown): data is number[] =>
      Array.isArray(data) && data.every((n) => typeof n === 'number')

    const result = safeJsonParseWithValidation('[1,2,3]', {
      fallback: [],
      validator: isNumArray,
      silent: true,
    })
    expect(result).toEqual([1, 2, 3])
  })

  test('returns fallback when array validator fails on mixed types', () => {
    const isNumArray = (data: unknown): data is number[] =>
      Array.isArray(data) && data.every((n) => typeof n === 'number')

    const result = safeJsonParseWithValidation('[1,"two",3]', {
      fallback: [0],
      validator: isNumArray,
      silent: true,
    })
    expect(result).toEqual([0])
  })
})

describe('tryJsonParse', () => {
  test('returns success with parsed data for valid JSON object', () => {
    const result = tryJsonParse('{"key":"value"}')
    expect(result).toEqual({ success: true, data: { key: 'value' } })
  })

  test('returns success with parsed data for valid JSON array', () => {
    const result = tryJsonParse('[1,2,3]')
    expect(result).toEqual({ success: true, data: [1, 2, 3] })
  })

  test('returns success for JSON primitives', () => {
    expect(tryJsonParse('42')).toEqual({ success: true, data: 42 })
    expect(tryJsonParse('"str"')).toEqual({ success: true, data: 'str' })
    expect(tryJsonParse('true')).toEqual({ success: true, data: true })
    expect(tryJsonParse('null')).toEqual({ success: true, data: null })
  })

  test('trims whitespace before parsing', () => {
    const result = tryJsonParse('  {"a":1}  ')
    expect(result).toEqual({ success: true, data: { a: 1 } })
  })

  test('returns error for empty string', () => {
    const result = tryJsonParse('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Empty value')
    }
  })

  test('returns error for whitespace-only string', () => {
    const result = tryJsonParse('   ')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Empty value')
    }
  })

  test('returns error for null input', () => {
    const result = tryJsonParse(null)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Empty value')
    }
  })

  test('returns error for undefined input', () => {
    const result = tryJsonParse(undefined)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Empty value')
    }
  })

  test('returns error with message for invalid JSON', () => {
    const result = tryJsonParse('{invalid}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  test('returns error for trailing comma', () => {
    const result = tryJsonParse('{"a":1,}')
    expect(result.success).toBe(false)
  })
})
