import {
  collectInvalidStatusCodeEntries,
  collectDisallowedStatusCodeRedirects,
  collectNewDisallowedStatusCodeRedirects,
} from './status-code-risk-guard'

describe('collectInvalidStatusCodeEntries', () => {
  test('returns empty array for empty/whitespace input', () => {
    expect(collectInvalidStatusCodeEntries('')).toEqual([])
    expect(collectInvalidStatusCodeEntries('  ')).toEqual([])
  })

  test('returns empty array for invalid JSON', () => {
    expect(collectInvalidStatusCodeEntries('{bad}')).toEqual([])
  })

  test('returns empty array for non-object JSON', () => {
    expect(collectInvalidStatusCodeEntries('["array"]')).toEqual([])
    expect(collectInvalidStatusCodeEntries('null')).toEqual([])
  })

  test('returns empty array for all valid entries', () => {
    const mapping = JSON.stringify({ '400': 500, '404': 200, '500': 502 })
    expect(collectInvalidStatusCodeEntries(mapping)).toEqual([])
  })

  test('detects invalid source status codes', () => {
    const mapping = JSON.stringify({ '99': 200, '600': 200 })
    expect(collectInvalidStatusCodeEntries(mapping)).toEqual(['99 → 200', '600 → 200'])
  })

  test('detects invalid target status codes', () => {
    const mapping = JSON.stringify({ '400': 99, '500': 600 })
    expect(collectInvalidStatusCodeEntries(mapping)).toEqual(['400 → 99', '500 → 600'])
  })

  test('detects non-numeric keys', () => {
    const mapping = JSON.stringify({ 'abc': 200 })
    expect(collectInvalidStatusCodeEntries(mapping)).toEqual(['abc → 200'])
  })

  test('accepts string target values that are valid status codes', () => {
    const mapping = JSON.stringify({ '400': '500' })
    expect(collectInvalidStatusCodeEntries(mapping)).toEqual([])
  })

  test('detects invalid string target values', () => {
    const mapping = JSON.stringify({ '400': 'abc' })
    expect(collectInvalidStatusCodeEntries(mapping)).toEqual(['400 → abc'])
  })
})

describe('collectDisallowedStatusCodeRedirects', () => {
  test('returns empty array for empty/whitespace input', () => {
    expect(collectDisallowedStatusCodeRedirects('')).toEqual([])
    expect(collectDisallowedStatusCodeRedirects('  ')).toEqual([])
  })

  test('returns empty array for invalid JSON', () => {
    expect(collectDisallowedStatusCodeRedirects('{bad}')).toEqual([])
  })

  test('returns empty array for non-object JSON', () => {
    expect(collectDisallowedStatusCodeRedirects('["array"]')).toEqual([])
  })

  test('returns empty array when no non-redirectable codes are mapped', () => {
    const mapping = JSON.stringify({ '400': 500, '404': 200 })
    expect(collectDisallowedStatusCodeRedirects(mapping)).toEqual([])
  })

  test('detects disallowed redirect for 504', () => {
    const mapping = JSON.stringify({ '504': 500 })
    expect(collectDisallowedStatusCodeRedirects(mapping)).toEqual(['504 -> 500'])
  })

  test('detects disallowed redirect for 524', () => {
    const mapping = JSON.stringify({ '524': 200 })
    expect(collectDisallowedStatusCodeRedirects(mapping)).toEqual(['524 -> 200'])
  })

  test('allows identity mapping for non-redirectable codes', () => {
    const mapping = JSON.stringify({ '504': 504, '524': 524 })
    expect(collectDisallowedStatusCodeRedirects(mapping)).toEqual([])
  })

  test('skips entries with invalid codes', () => {
    const mapping = JSON.stringify({ '504': 'invalid', 'abc': 200 })
    expect(collectDisallowedStatusCodeRedirects(mapping)).toEqual([])
  })

  test('returns sorted and deduplicated results', () => {
    const mapping = JSON.stringify({ '524': 200, '504': 500 })
    const result = collectDisallowedStatusCodeRedirects(mapping)
    expect(result).toEqual(['504 -> 500', '524 -> 200'])
  })
})

describe('collectNewDisallowedStatusCodeRedirects', () => {
  test('returns empty array when current has no risky mappings', () => {
    const original = JSON.stringify({ '504': 500 })
    const current = JSON.stringify({ '400': 200 })
    expect(collectNewDisallowedStatusCodeRedirects(original, current)).toEqual([])
  })

  test('returns empty array when all risky mappings already existed', () => {
    const original = JSON.stringify({ '504': 500 })
    const current = JSON.stringify({ '504': 500 })
    expect(collectNewDisallowedStatusCodeRedirects(original, current)).toEqual([])
  })

  test('returns newly added risky mappings', () => {
    const original = JSON.stringify({ '504': 500 })
    const current = JSON.stringify({ '504': 500, '524': 200 })
    expect(collectNewDisallowedStatusCodeRedirects(original, current)).toEqual(['524 -> 200'])
  })

  test('returns all risky mappings when original has none', () => {
    const original = JSON.stringify({ '400': 200 })
    const current = JSON.stringify({ '504': 500, '524': 200 })
    expect(collectNewDisallowedStatusCodeRedirects(original, current)).toEqual([
      '504 -> 500',
      '524 -> 200',
    ])
  })

  test('handles empty original string', () => {
    const current = JSON.stringify({ '504': 500 })
    expect(collectNewDisallowedStatusCodeRedirects('', current)).toEqual(['504 -> 500'])
  })

  test('handles empty current string', () => {
    const original = JSON.stringify({ '504': 500 })
    expect(collectNewDisallowedStatusCodeRedirects(original, '')).toEqual([])
  })

  test('detects changed target for non-redirectable code', () => {
    const original = JSON.stringify({ '504': 500 })
    const current = JSON.stringify({ '504': 502 })
    expect(collectNewDisallowedStatusCodeRedirects(original, current)).toEqual(['504 -> 502'])
  })
})
