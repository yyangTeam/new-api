import { formatTokens, formatShare, formatReleaseDate } from './format'

describe('formatTokens', () => {
  test('returns "0" for 0', () => {
    expect(formatTokens(0)).toBe('0')
  })

  test('returns "0" for negative values', () => {
    expect(formatTokens(-100)).toBe('0')
  })

  test('returns "0" for NaN', () => {
    expect(formatTokens(NaN)).toBe('0')
  })

  test('formats small values with toLocaleString', () => {
    const result = formatTokens(500)
    expect(result).toBe('500')
  })

  test('formats thousands with K suffix and 1 decimal for <10K', () => {
    expect(formatTokens(1500)).toBe('1.5K')
  })

  test('formats thousands with 0 decimals for >=10K', () => {
    expect(formatTokens(15000)).toBe('15K')
  })

  test('formats millions with M suffix and 2 decimals for <10M', () => {
    expect(formatTokens(1500000)).toBe('1.50M')
  })

  test('formats millions with 1 decimal for >=10M', () => {
    expect(formatTokens(15000000)).toBe('15.0M')
  })

  test('formats billions with B suffix and 2 decimals for <10B', () => {
    expect(formatTokens(1500000000)).toBe('1.50B')
  })

  test('formats billions with 1 decimal for >=10B', () => {
    expect(formatTokens(15000000000)).toBe('15.0B')
  })

  test('formats trillions with T suffix', () => {
    expect(formatTokens(1500000000000)).toBe('1.50T')
  })
})

describe('formatShare', () => {
  test('returns "0%" for 0', () => {
    expect(formatShare(0)).toBe('0%')
  })

  test('returns "0%" for negative', () => {
    expect(formatShare(-0.5)).toBe('0%')
  })

  test('returns "0%" for NaN', () => {
    expect(formatShare(NaN)).toBe('0%')
  })

  test('returns "<0.1%" for very small shares', () => {
    expect(formatShare(0.0005)).toBe('<0.1%')
  })

  test('formats small shares with 2 decimals', () => {
    expect(formatShare(0.005)).toBe('0.50%')
  })

  test('formats larger shares with 1 decimal', () => {
    expect(formatShare(0.15)).toBe('15.0%')
  })

  test('formats 1.0 as 100%', () => {
    expect(formatShare(1.0)).toBe('100.0%')
  })
})

describe('formatReleaseDate', () => {
  test('formats valid ISO date', () => {
    const result = formatReleaseDate('2025-10-12')
    expect(result).toMatch(/Oct/)
    expect(result).toMatch(/12/)
    expect(result).toMatch(/2025/)
  })

  test('returns original string for invalid date', () => {
    expect(formatReleaseDate('not-a-date')).toBe('not-a-date')
  })

  test('handles full ISO datetime', () => {
    const result = formatReleaseDate('2025-03-15T10:30:00Z')
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2025/)
  })
})
