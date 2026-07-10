import {
  DASHBOARD_CHART_PREFERENCES_STORAGE_KEY,
  TIME_GRANULARITY_STORAGE_KEY,
} from '@/features/dashboard/constants'

import { cleanFilters, getDefaultDays, buildQueryParams } from './filters'

beforeEach(() => {
  localStorage.clear()
})

describe('cleanFilters', () => {
  test('removes undefined values', () => {
    const result = cleanFilters({ a: 'hello', b: undefined })
    expect(result).toEqual({ a: 'hello' })
  })

  test('removes null values', () => {
    const result = cleanFilters({ a: 'hello', b: null })
    expect(result).toEqual({ a: 'hello' })
  })

  test('removes empty string values', () => {
    const result = cleanFilters({ a: 'hello', b: '' })
    expect(result).toEqual({ a: 'hello' })
  })

  test('trims string values', () => {
    const result = cleanFilters({ a: '  hello  ' })
    expect(result).toEqual({ a: 'hello' })
  })

  test('removes whitespace-only string values', () => {
    const result = cleanFilters({ a: '   ' })
    expect(result).toEqual({})
  })

  test('preserves non-string non-null values', () => {
    const result = cleanFilters({ a: 42, b: true, c: false, d: 0 })
    expect(result).toEqual({ a: 42, b: true, c: false, d: 0 })
  })

  test('returns empty object for all-undefined input', () => {
    const result = cleanFilters({ a: undefined, b: null })
    expect(result).toEqual({})
  })
})

describe('getDefaultDays', () => {
  test('returns saved preferences defaultTimeRangeDays when no granularity', () => {
    const result = getDefaultDays()
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThan(0)
  })

  test('returns 1 for hour granularity', () => {
    const result = getDefaultDays('hour')
    expect(result).toBe(1)
  })

  test('returns 7 for day granularity', () => {
    const result = getDefaultDays('day')
    expect(result).toBe(7)
  })

  test('returns 30 for week granularity', () => {
    const result = getDefaultDays('week')
    expect(result).toBe(30)
  })
})

describe('buildQueryParams', () => {
  test('builds params with time range', () => {
    const timeRange = {
      start_timestamp: 1000,
      end_timestamp: 2000,
    }
    const result = buildQueryParams(timeRange)
    expect(result.start_timestamp).toBe(1000)
    expect(result.end_timestamp).toBe(2000)
    expect(typeof result.default_time).toBe('string')
  })

  test('includes username when provided in filters', () => {
    const timeRange = {
      start_timestamp: 1000,
      end_timestamp: 2000,
    }
    const result = buildQueryParams(timeRange, { username: 'admin' })
    expect(result.username).toBe('admin')
  })

  test('does not include username when not provided', () => {
    const timeRange = {
      start_timestamp: 1000,
      end_timestamp: 2000,
    }
    const result = buildQueryParams(timeRange)
    expect(result.username).toBeUndefined()
  })

  test('does not include username when empty', () => {
    const timeRange = {
      start_timestamp: 1000,
      end_timestamp: 2000,
    }
    const result = buildQueryParams(timeRange, { username: '' })
    expect(result.username).toBeUndefined()
  })

  test('uses time_granularity from filters when provided', () => {
    const timeRange = {
      start_timestamp: 1000,
      end_timestamp: 2000,
    }
    const result = buildQueryParams(timeRange, {
      time_granularity: 'day',
    })
    expect(result.default_time).toBe('day')
  })
})
