import { getOptionValue } from './use-system-options'

describe('getOptionValue', () => {
  const defaults = {
    siteName: 'My Site',
    maxTokens: 4096,
    enableFeature: false,
    tags: ['default'],
  }

  test('returns defaults when options is undefined', () => {
    const result = getOptionValue(undefined, defaults)
    expect(result).toEqual(defaults)
  })

  test('returns defaults when options array is empty', () => {
    const result = getOptionValue([], defaults)
    expect(result).toEqual(defaults)
  })

  test('parses string values correctly', () => {
    const options = [{ key: 'siteName', value: 'New Site' }]
    const result = getOptionValue(options, defaults)
    expect(result.siteName).toBe('New Site')
  })

  test('parses number values correctly', () => {
    const options = [{ key: 'maxTokens', value: '8192' }]
    const result = getOptionValue(options, defaults)
    expect(result.maxTokens).toBe(8192)
  })

  test('parses boolean true from "true" string', () => {
    const options = [{ key: 'enableFeature', value: 'true' }]
    const result = getOptionValue(options, defaults)
    expect(result.enableFeature).toBe(true)
  })

  test('parses boolean true from "1" string', () => {
    const options = [{ key: 'enableFeature', value: '1' }]
    const result = getOptionValue(options, defaults)
    expect(result.enableFeature).toBe(true)
  })

  test('parses boolean false from "false" string', () => {
    const options = [{ key: 'enableFeature', value: 'false' }]
    const result = getOptionValue(options, defaults)
    expect(result.enableFeature).toBe(false)
  })

  test('parses boolean false from "0" string', () => {
    const options = [{ key: 'enableFeature', value: '0' }]
    const result = getOptionValue(options, defaults)
    expect(result.enableFeature).toBe(false)
  })

  test('parses array values from JSON', () => {
    const options = [{ key: 'tags', value: '["tag1","tag2"]' }]
    const result = getOptionValue(options, defaults)
    expect(result.tags).toEqual(['tag1', 'tag2'])
  })

  test('falls back to default for invalid number string', () => {
    const options = [{ key: 'maxTokens', value: 'not-a-number' }]
    const result = getOptionValue(options, defaults)
    expect(result.maxTokens).toBe(4096)
  })

  test('falls back to default for empty number string', () => {
    const options = [{ key: 'maxTokens', value: '  ' }]
    const result = getOptionValue(options, defaults)
    expect(result.maxTokens).toBe(4096)
  })

  test('falls back to default for invalid JSON array', () => {
    const options = [{ key: 'tags', value: 'not-json' }]
    const result = getOptionValue(options, defaults)
    expect(result.tags).toEqual(['default'])
  })

  test('falls back to default when JSON is not an array', () => {
    const options = [{ key: 'tags', value: '{"key":"value"}' }]
    const result = getOptionValue(options, defaults)
    expect(result.tags).toEqual(['default'])
  })

  test('falls back to default when array element types mismatch', () => {
    const options = [{ key: 'tags', value: '[1, 2, 3]' }]
    const result = getOptionValue(options, defaults)
    expect(result.tags).toEqual(['default'])
  })

  test('ignores keys not in defaults', () => {
    const options = [{ key: 'unknownKey', value: 'some value' }]
    const result = getOptionValue(options, defaults)
    expect(result).toEqual(defaults)
    expect('unknownKey' in result).toBe(false)
  })

  test('handles multiple options at once', () => {
    const options = [
      { key: 'siteName', value: 'Updated' },
      { key: 'maxTokens', value: '2048' },
      { key: 'enableFeature', value: 'true' },
    ]
    const result = getOptionValue(options, defaults)
    expect(result.siteName).toBe('Updated')
    expect(result.maxTokens).toBe(2048)
    expect(result.enableFeature).toBe(true)
    expect(result.tags).toEqual(['default'])
  })

  test('parses zero number correctly', () => {
    const options = [{ key: 'maxTokens', value: '0' }]
    const result = getOptionValue(options, defaults)
    expect(result.maxTokens).toBe(0)
  })

  test('parses negative number correctly', () => {
    const options = [{ key: 'maxTokens', value: '-10' }]
    const result = getOptionValue(options, defaults)
    expect(result.maxTokens).toBe(-10)
  })

  test('parses empty array JSON correctly', () => {
    const options = [{ key: 'tags', value: '[]' }]
    const result = getOptionValue(options, defaults)
    expect(result.tags).toEqual([])
  })

  test('accepts array with correct element types when default has typed elements', () => {
    const options = [{ key: 'tags', value: '["a","b","c"]' }]
    const result = getOptionValue(options, defaults)
    expect(result.tags).toEqual(['a', 'b', 'c'])
  })

  test('does not mutate the defaults object', () => {
    const originalDefaults = { ...defaults, tags: [...defaults.tags] }
    const options = [{ key: 'siteName', value: 'Changed' }]
    getOptionValue(options, defaults)
    expect(defaults).toEqual(originalDefaults)
  })
})
