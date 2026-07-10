import type { UptimeDayPoint } from './mock-stats'
import { aggregateUptime, formatTokenVolume, formatRateLimit } from './mock-stats'

describe('aggregateUptime', () => {
  test('returns zeros for empty array', () => {
    const result = aggregateUptime([])
    expect(result).toEqual({ uptime_pct: 0, incidents: 0, outage_minutes: 0 })
  })

  test('aggregates a single day with no incidents', () => {
    const points: UptimeDayPoint[] = [
      { date: '2025-01-01', uptime_pct: 100, incidents: 0, outage_minutes: 0 },
    ]
    const result = aggregateUptime(points)
    expect(result.incidents).toBe(0)
    expect(result.outage_minutes).toBe(0)
    expect(result.uptime_pct).toBe(100)
  })

  test('aggregates multiple days with incidents', () => {
    const points: UptimeDayPoint[] = [
      { date: '2025-01-01', uptime_pct: 99, incidents: 1, outage_minutes: 10 },
      { date: '2025-01-02', uptime_pct: 100, incidents: 0, outage_minutes: 0 },
      { date: '2025-01-03', uptime_pct: 98, incidents: 2, outage_minutes: 20 },
    ]
    const result = aggregateUptime(points)
    expect(result.incidents).toBe(3)
    expect(result.outage_minutes).toBe(30)
    expect(result.uptime_pct).toBeGreaterThan(99)
    expect(result.uptime_pct).toBeLessThanOrEqual(100)
  })

  test('computes uptime from outage minutes', () => {
    const points: UptimeDayPoint[] = [
      { date: '2025-01-01', uptime_pct: 99, incidents: 1, outage_minutes: 1440 },
    ]
    const result = aggregateUptime(points)
    expect(result.uptime_pct).toBe(0)
  })
})

describe('formatTokenVolume', () => {
  test('returns "0" for zero', () => {
    expect(formatTokenVolume(0)).toBe('0')
  })

  test('returns "0" for negative numbers', () => {
    expect(formatTokenVolume(-100)).toBe('0')
  })

  test('returns "0" for NaN', () => {
    expect(formatTokenVolume(NaN)).toBe('0')
  })

  test('returns "0" for Infinity', () => {
    expect(formatTokenVolume(Infinity)).toBe('0')
  })

  test('formats small numbers as-is', () => {
    expect(formatTokenVolume(500)).toBe('500')
  })

  test('formats thousands with K suffix', () => {
    expect(formatTokenVolume(1500)).toBe('1.5K')
  })

  test('formats millions with M suffix', () => {
    expect(formatTokenVolume(2500000)).toBe('2.5M')
  })

  test('formats billions with B suffix', () => {
    expect(formatTokenVolume(3200000000)).toBe('3.2B')
  })
})

describe('formatRateLimit', () => {
  test('returns dash for zero', () => {
    expect(formatRateLimit(0)).toBe('—')
  })

  test('returns dash for negative values', () => {
    expect(formatRateLimit(-5)).toBe('—')
  })

  test('formats small values with locale string', () => {
    expect(formatRateLimit(500)).toBe('500')
  })

  test('formats thousands with K suffix', () => {
    const result = formatRateLimit(5000)
    expect(result).toBe('5.0K')
  })

  test('formats ten-thousands with K suffix (no decimal)', () => {
    const result = formatRateLimit(50000)
    expect(result).toBe('50K')
  })

  test('formats millions with M suffix', () => {
    expect(formatRateLimit(1000000)).toBe('1.0M')
  })

  test('formats 2.5M correctly', () => {
    expect(formatRateLimit(2500000)).toBe('2.5M')
  })
})
