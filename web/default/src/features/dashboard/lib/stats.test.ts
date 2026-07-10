import { safeDivide, calculateDashboardStats } from './stats'

describe('safeDivide', () => {
  test('divides two numbers with default precision', () => {
    expect(safeDivide(10, 3)).toBe(3.333)
  })

  test('divides evenly', () => {
    expect(safeDivide(10, 2)).toBe(5)
  })

  test('returns 0 for division by zero', () => {
    expect(safeDivide(10, 0)).toBe(0)
  })

  test('returns 0 for NaN result', () => {
    expect(safeDivide(0, 0)).toBe(0)
  })

  test('returns 0 for Infinity result', () => {
    expect(safeDivide(1, 0)).toBe(0)
  })

  test('respects custom precision', () => {
    expect(safeDivide(10, 3, 1)).toBe(3.3)
  })

  test('handles precision 0', () => {
    expect(safeDivide(10, 3, 0)).toBe(3)
  })

  test('handles negative numbers', () => {
    expect(safeDivide(-10, 3)).toBe(-3.333)
  })
})

describe('calculateDashboardStats', () => {
  test('returns zeros for empty array', () => {
    expect(calculateDashboardStats([])).toEqual({
      totalQuota: 0,
      totalCount: 0,
      totalTokens: 0,
    })
  })

  test('sums up quota, count, and tokens', () => {
    const data = [
      { created_at: 1, quota: 100, count: 5, token_used: 1000 },
      { created_at: 2, quota: 200, count: 10, token_used: 2000 },
    ]
    expect(calculateDashboardStats(data)).toEqual({
      totalQuota: 300,
      totalCount: 15,
      totalTokens: 3000,
    })
  })

  test('handles missing fields', () => {
    const data = [{ created_at: 1 }, { created_at: 2, quota: 50 }]
    expect(calculateDashboardStats(data)).toEqual({
      totalQuota: 50,
      totalCount: 0,
      totalTokens: 0,
    })
  })

  test('handles string values via Number coercion', () => {
    const data = [
      {
        created_at: 1,
        quota: '100' as unknown as number,
        count: '5' as unknown as number,
        token_used: '500' as unknown as number,
      },
    ]
    expect(calculateDashboardStats(data)).toEqual({
      totalQuota: 100,
      totalCount: 5,
      totalTokens: 500,
    })
  })
})
