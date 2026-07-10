import { formatJsonForEditor, normalizeJsonString } from './utils'

describe('formatJsonForEditor', () => {
  test('pretty-prints valid JSON array', () => {
    expect(formatJsonForEditor('[1,2,3]')).toBe('[\n  1,\n  2,\n  3\n]')
  })

  test('pretty-prints valid JSON object', () => {
    expect(formatJsonForEditor('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  test('returns fallback when value is empty', () => {
    expect(formatJsonForEditor('')).toBe('[]')
  })

  test('returns custom fallback when value is empty', () => {
    expect(formatJsonForEditor('', '{}')).toBe('{}')
  })

  test('returns fallback when value is whitespace only', () => {
    expect(formatJsonForEditor('   ')).toBe('[]')
  })

  test('returns raw value for invalid JSON', () => {
    expect(formatJsonForEditor('not-json')).toBe('not-json')
  })

  test('pretty-prints nested JSON', () => {
    const input = '{"a":{"b":[1,2]}}'
    const result = formatJsonForEditor(input)
    expect(result).toContain('"a"')
    expect(result).toContain('"b"')
    expect(result.split('\n').length).toBeGreaterThan(1)
  })

  test('handles null JSON value', () => {
    expect(formatJsonForEditor('null')).toBe('null')
  })

  test('handles boolean JSON value', () => {
    expect(formatJsonForEditor('true')).toBe('true')
  })

  test('handles number JSON value', () => {
    expect(formatJsonForEditor('42')).toBe('42')
  })
})

describe('normalizeJsonString', () => {
  test('minifies valid JSON array', () => {
    expect(normalizeJsonString('[  1,  2,  3  ]')).toBe('[1,2,3]')
  })

  test('minifies valid JSON object', () => {
    expect(normalizeJsonString('{  "a" : 1  }')).toBe('{"a":1}')
  })

  test('returns fallback when value is empty', () => {
    expect(normalizeJsonString('')).toBe('[]')
  })

  test('returns custom fallback when value is empty', () => {
    expect(normalizeJsonString('', '{}')).toBe('{}')
  })

  test('returns fallback when value is whitespace only', () => {
    expect(normalizeJsonString('   ')).toBe('[]')
  })

  test('returns trimmed value for invalid JSON', () => {
    expect(normalizeJsonString('  not-json  ')).toBe('not-json')
  })

  test('minifies pretty-printed JSON', () => {
    const input = '{\n  "a": 1,\n  "b": [2, 3]\n}'
    expect(normalizeJsonString(input)).toBe('{"a":1,"b":[2,3]}')
  })

  test('handles null JSON value', () => {
    expect(normalizeJsonString('null')).toBe('null')
  })

  test('handles boolean JSON value', () => {
    expect(normalizeJsonString('true')).toBe('true')
  })

  test('handles numeric JSON value', () => {
    expect(normalizeJsonString('  42  ')).toBe('42')
  })

  test('round-trips with formatJsonForEditor', () => {
    const original = '{"key":"value","arr":[1,2,3]}'
    const pretty = formatJsonForEditor(original)
    const minified = normalizeJsonString(pretty)
    expect(minified).toBe(original)
  })
})
