import {
  formatNumber,
  formatCompactNumber,
  formatPercent,
  formatTokens,
  formatUseTime,
  formatTimestamp,
  formatTimestampToDate,
  formatTimestampForInput,
  parseTimestampFromInput,
  stringToColor,
} from './format'

describe('formatNumber', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatNumber(null)).toBe('-')
    expect(formatNumber(undefined)).toBe('-')
    expect(formatNumber(NaN)).toBe('-')
  })

  test('formats integers without decimals', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(42)).toBe('42')
  })

  test('formats with up to 2 fraction digits', () => {
    expect(formatNumber(3.14159)).toBe('3.14')
    expect(formatNumber(1.5)).toBe('1.5')
  })

  test('formats large numbers with grouping separators', () => {
    const result = formatNumber(1234567, 'en-US')
    expect(result).toBe('1,234,567')
  })

  test('handles negative numbers', () => {
    const result = formatNumber(-99.999, 'en-US')
    expect(result).toBe('-100')
  })
})

describe('formatCompactNumber', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatCompactNumber(null)).toBe('-')
    expect(formatCompactNumber(undefined)).toBe('-')
    expect(formatCompactNumber(NaN)).toBe('-')
  })

  test('formats small numbers without abbreviation', () => {
    expect(formatCompactNumber(5, 'en-US')).toBe('5')
    expect(formatCompactNumber(999, 'en-US')).toBe('999')
  })

  test('abbreviates thousands', () => {
    expect(formatCompactNumber(1500, 'en-US')).toBe('1.5K')
    expect(formatCompactNumber(10000, 'en-US')).toBe('10K')
  })

  test('abbreviates millions', () => {
    expect(formatCompactNumber(2500000, 'en-US')).toBe('2.5M')
  })
})

describe('formatPercent', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatPercent(null)).toBe('-')
    expect(formatPercent(undefined)).toBe('-')
    expect(formatPercent(NaN)).toBe('-')
  })

  test('formats percentage values (input is already percentage scale)', () => {
    const result = formatPercent(50)
    expect(result).toContain('50')
  })

  test('formats zero percent', () => {
    const result = formatPercent(0)
    expect(result).toContain('0')
  })

  test('formats decimal percentages', () => {
    const result = formatPercent(33.33)
    expect(result).toContain('33.33')
  })
})

describe('formatTokens', () => {
  test('returns dash for zero', () => {
    expect(formatTokens(0)).toBe('-')
  })

  test('returns raw count for values under 1000', () => {
    expect(formatTokens(1)).toBe('1')
    expect(formatTokens(999)).toBe('999')
  })

  test('formats thousands with K suffix', () => {
    expect(formatTokens(1000)).toBe('1.0K')
    expect(formatTokens(1500)).toBe('1.5K')
    expect(formatTokens(999999)).toBe('1000.0K')
  })

  test('formats millions with M suffix', () => {
    expect(formatTokens(1000000)).toBe('1.00M')
    expect(formatTokens(2500000)).toBe('2.50M')
  })
})

describe('formatUseTime', () => {
  test('formats seconds below one minute', () => {
    expect(formatUseTime(0.5)).toBe('0.5s')
    expect(formatUseTime(30)).toBe('30.0s')
    expect(formatUseTime(59.9)).toBe('59.9s')
  })

  test('formats minutes and seconds', () => {
    expect(formatUseTime(60)).toBe('1m 0s')
    expect(formatUseTime(90)).toBe('1m 30s')
    expect(formatUseTime(125)).toBe('2m 5s')
  })
})

describe('formatTimestamp', () => {
  test('returns Never for -1', () => {
    expect(formatTimestamp(-1)).toBe('Never')
  })

  test('formats a valid Unix timestamp', () => {
    const ts = 1704067200
    const result = formatTimestamp(ts)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('formatTimestampToDate', () => {
  test('returns dash for falsy, 0, and -1 timestamps', () => {
    expect(formatTimestampToDate(undefined)).toBe('-')
    expect(formatTimestampToDate(0)).toBe('-')
    expect(formatTimestampToDate(-1)).toBe('-')
  })

  test('formats seconds by default', () => {
    const ts = 1704067200
    const result = formatTimestampToDate(ts)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('formats milliseconds when unit specified', () => {
    const tsMs = 1704067200000
    const result = formatTimestampToDate(tsMs, 'milliseconds')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('seconds and milliseconds produce same result for same instant', () => {
    const tsSec = 1704067200
    const tsMs = 1704067200000
    expect(formatTimestampToDate(tsSec, 'seconds')).toBe(
      formatTimestampToDate(tsMs, 'milliseconds')
    )
  })
})

describe('formatTimestampForInput', () => {
  test('returns empty string for -1', () => {
    expect(formatTimestampForInput(-1)).toBe('')
  })

  test('returns YYYY-MM-DDTHH:mm format for a valid timestamp', () => {
    const ts = 1704067200
    const result = formatTimestampForInput(ts)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })
})

describe('parseTimestampFromInput', () => {
  test('returns -1 for empty string', () => {
    expect(parseTimestampFromInput('')).toBe(-1)
  })

  test('parses a valid datetime-local string to Unix timestamp', () => {
    const result = parseTimestampFromInput('2024-01-01T00:00')
    expect(result).toBeGreaterThan(0)
    expect(Number.isInteger(result)).toBe(true)
  })

  test('roundtrips with formatTimestampForInput', () => {
    const original = 1704067200
    const formatted = formatTimestampForInput(original)
    if (formatted !== '') {
      const parsed = parseTimestampFromInput(formatted)
      expect(Math.abs(parsed - original)).toBeLessThanOrEqual(60)
    }
  })
})

describe('stringToColor', () => {
  test('returns gray for empty string', () => {
    expect(stringToColor('')).toBe('gray')
  })

  test('returns an HSL color string', () => {
    const result = stringToColor('hello')
    expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
  })

  test('returns the same color for the same input', () => {
    expect(stringToColor('test')).toBe(stringToColor('test'))
  })

  test('returns different colors for different inputs', () => {
    const a = stringToColor('alpha')
    const b = stringToColor('beta')
    expect(a).not.toBe(b)
  })

  test('hue is in range 0-359', () => {
    const result = stringToColor('some-model-name')
    const match = result.match(/^hsl\((\d+),/)
    expect(match).not.toBeNull()
    const hue = Number(match![1])
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })
})
