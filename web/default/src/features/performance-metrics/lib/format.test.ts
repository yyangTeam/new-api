import {
  formatThroughput,
  formatLatency,
  formatUptimePct,
  getSuccessRateLevel,
  getSuccessRateTextClass,
  getSuccessRateDotClass,
  getSuccessRateColor,
} from './format'

describe('formatThroughput', () => {
  test('returns dash for 0', () => {
    expect(formatThroughput(0)).toBe('—')
  })

  test('returns dash for negative', () => {
    expect(formatThroughput(-5)).toBe('—')
  })

  test('returns dash for NaN', () => {
    expect(formatThroughput(NaN)).toBe('—')
  })

  test('returns dash for Infinity', () => {
    expect(formatThroughput(Infinity)).toBe('—')
  })

  test('formats small values with 2 decimal places', () => {
    expect(formatThroughput(5.123)).toBe('5.12 t/s')
  })

  test('formats values >= 10 with 1 decimal place', () => {
    expect(formatThroughput(15.67)).toBe('15.7 t/s')
  })

  test('formats values >= 1000 in K', () => {
    expect(formatThroughput(1500)).toBe('1.5K t/s')
  })
})

describe('formatLatency', () => {
  test('returns dash for 0', () => {
    expect(formatLatency(0)).toBe('—')
  })

  test('returns dash for negative', () => {
    expect(formatLatency(-10)).toBe('—')
  })

  test('returns dash for NaN', () => {
    expect(formatLatency(NaN)).toBe('—')
  })

  test('formats milliseconds', () => {
    expect(formatLatency(150)).toBe('150ms')
  })

  test('formats seconds for values >= 1000', () => {
    expect(formatLatency(1500)).toBe('1.50s')
  })

  test('rounds millisecond values', () => {
    expect(formatLatency(99.7)).toBe('100ms')
  })
})

describe('formatUptimePct', () => {
  test('returns dash for NaN', () => {
    expect(formatUptimePct(NaN)).toBe('—')
  })

  test('formats percentage with 2 decimal places', () => {
    expect(formatUptimePct(99.999)).toBe('100.00%')
  })

  test('formats 0 percent', () => {
    expect(formatUptimePct(0)).toBe('0.00%')
  })
})

describe('getSuccessRateLevel', () => {
  test('returns "excellent" for 100', () => {
    expect(getSuccessRateLevel(100)).toBe('excellent')
  })

  test('returns "good" for 95', () => {
    expect(getSuccessRateLevel(95)).toBe('good')
  })

  test('returns "good" for 90', () => {
    expect(getSuccessRateLevel(90)).toBe('good')
  })

  test('returns "warning" for 80', () => {
    expect(getSuccessRateLevel(80)).toBe('warning')
  })

  test('returns "warning" for 70', () => {
    expect(getSuccessRateLevel(70)).toBe('warning')
  })

  test('returns "critical" for 69', () => {
    expect(getSuccessRateLevel(69)).toBe('critical')
  })

  test('returns "critical" for 0', () => {
    expect(getSuccessRateLevel(0)).toBe('critical')
  })

  test('returns "unknown" for NaN', () => {
    expect(getSuccessRateLevel(NaN)).toBe('unknown')
  })

  test('returns "unknown" for Infinity', () => {
    expect(getSuccessRateLevel(Infinity)).toBe('unknown')
  })
})

describe('getSuccessRateTextClass', () => {
  test('returns emerald-600 class for excellent', () => {
    expect(getSuccessRateTextClass(100)).toContain('text-emerald-600')
  })

  test('returns amber class for warning', () => {
    expect(getSuccessRateTextClass(75)).toContain('text-amber-600')
  })

  test('returns red class for critical', () => {
    expect(getSuccessRateTextClass(50)).toContain('text-red-600')
  })

  test('returns muted class for unknown', () => {
    expect(getSuccessRateTextClass(NaN)).toContain('text-muted-foreground')
  })
})

describe('getSuccessRateDotClass', () => {
  test('returns emerald-500 for excellent', () => {
    expect(getSuccessRateDotClass(100)).toBe('bg-emerald-500')
  })

  test('returns amber-500 for warning', () => {
    expect(getSuccessRateDotClass(75)).toBe('bg-amber-500')
  })

  test('returns red-500 for critical', () => {
    expect(getSuccessRateDotClass(50)).toBe('bg-red-500')
  })
})

describe('getSuccessRateColor', () => {
  test('returns emerald hex for excellent', () => {
    expect(getSuccessRateColor(100)).toBe('#10b981')
  })

  test('returns lighter emerald hex for good', () => {
    expect(getSuccessRateColor(95)).toBe('#34d399')
  })

  test('returns amber hex for warning', () => {
    expect(getSuccessRateColor(75)).toBe('#f59e0b')
  })

  test('returns red hex for critical', () => {
    expect(getSuccessRateColor(50)).toBe('#ef4444')
  })

  test('returns gray hex for unknown', () => {
    expect(getSuccessRateColor(NaN)).toBe('#9ca3af')
  })
})
