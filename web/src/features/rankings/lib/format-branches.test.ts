import {
  formatTokens,
  formatShare,
  formatReleaseDate,
} from './format'

describe('rankings format - branch coverage', () => {
  describe('formatTokens', () => {
    test('returns 0 for 0', () => {
      expect(formatTokens(0)).toBe('0')
    })

    test('returns 0 for negative', () => {
      expect(formatTokens(-100)).toBe('0')
    })

    test('returns 0 for NaN', () => {
      expect(formatTokens(NaN)).toBe('0')
    })

    test('returns 0 for Infinity', () => {
      expect(formatTokens(Infinity)).toBe('0')
    })

    test('formats trillions', () => {
      expect(formatTokens(2_500_000_000_000)).toBe('2.50T')
    })

    test('formats large billions (>= 10B) with 1 decimal', () => {
      expect(formatTokens(15_000_000_000)).toBe('15.0B')
    })

    test('formats small billions (< 10B) with 2 decimals', () => {
      expect(formatTokens(2_500_000_000)).toBe('2.50B')
    })

    test('formats large millions (>= 10M) with 1 decimal', () => {
      expect(formatTokens(42_000_000)).toBe('42.0M')
    })

    test('formats small millions (< 10M) with 2 decimals', () => {
      expect(formatTokens(1_500_000)).toBe('1.50M')
    })

    test('formats large thousands (>= 10K) with 0 decimals', () => {
      expect(formatTokens(50_000)).toBe('50K')
    })

    test('formats small thousands (< 10K) with 1 decimal', () => {
      expect(formatTokens(5_500)).toBe('5.5K')
    })

    test('formats small numbers with locale string', () => {
      expect(formatTokens(500)).toBe('500')
    })
  })

  describe('formatShare', () => {
    test('returns 0% for 0', () => {
      expect(formatShare(0)).toBe('0%')
    })

    test('returns 0% for negative', () => {
      expect(formatShare(-0.1)).toBe('0%')
    })

    test('returns 0% for NaN', () => {
      expect(formatShare(NaN)).toBe('0%')
    })

    test('returns <0.1% for very small share', () => {
      expect(formatShare(0.0005)).toBe('<0.1%')
    })

    test('formats small share with 2 decimals', () => {
      expect(formatShare(0.005)).toBe('0.50%')
    })

    test('formats larger share with 1 decimal', () => {
      expect(formatShare(0.15)).toBe('15.0%')
    })

    test('formats 1 as 100.0%', () => {
      expect(formatShare(1)).toBe('100.0%')
    })

    test('boundary: share exactly 0.01', () => {
      expect(formatShare(0.01)).toBe('1.0%')
    })

    test('boundary: share just under 0.001', () => {
      expect(formatShare(0.0009)).toBe('<0.1%')
    })
  })

  describe('formatReleaseDate', () => {
    test('formats valid ISO date', () => {
      const result = formatReleaseDate('2025-10-12')
      // Just verify it doesn't return the raw string
      expect(result).not.toBe('2025-10-12')
      expect(result).toContain('2025')
    })

    test('returns raw string for invalid date', () => {
      expect(formatReleaseDate('not-a-date')).toBe('not-a-date')
    })

    test('returns raw string for empty string', () => {
      // Date.parse('') returns NaN
      expect(formatReleaseDate('')).toBe('')
    })
  })
})
