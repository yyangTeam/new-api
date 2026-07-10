import {
  dateToUnixTimestamp,
  toStartOfDay,
  getStartOfDay,
  getEndOfDay,
  getNormalizedDateRange,
  getRollingDateRange,
  computeTimeRange,
  formatDate,
  formatDateTimeObject,
  formatChartTime,
  addTimeToDate,
} from './time'

describe('dateToUnixTimestamp', () => {
  test('converts a Date to Unix seconds', () => {
    const date = new Date('2024-01-01T00:00:00.000Z')
    expect(dateToUnixTimestamp(date)).toBe(1704067200)
  })

  test('truncates milliseconds', () => {
    const date = new Date('2024-01-01T00:00:00.999Z')
    expect(dateToUnixTimestamp(date)).toBe(1704067200)
  })
})

describe('toStartOfDay', () => {
  test('sets time to midnight in local timezone', () => {
    const date = new Date(2024, 0, 15, 14, 30, 45)
    const tsSec = Math.floor(date.getTime() / 1000)
    const startTs = toStartOfDay(tsSec)
    const startDate = new Date(startTs * 1000)
    expect(startDate.getHours()).toBe(0)
    expect(startDate.getMinutes()).toBe(0)
    expect(startDate.getSeconds()).toBe(0)
  })

  test('preserves the date', () => {
    const date = new Date(2024, 5, 20, 18, 0, 0)
    const tsSec = Math.floor(date.getTime() / 1000)
    const startDate = new Date(toStartOfDay(tsSec) * 1000)
    expect(startDate.getFullYear()).toBe(2024)
    expect(startDate.getMonth()).toBe(5)
    expect(startDate.getDate()).toBe(20)
  })
})

describe('getStartOfDay', () => {
  test('returns 00:00:00.000 for the given date', () => {
    const date = new Date(2024, 3, 10, 15, 45, 30, 500)
    const result = getStartOfDay(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  test('does not mutate the original date', () => {
    const date = new Date(2024, 3, 10, 15, 45, 30)
    const originalTime = date.getTime()
    getStartOfDay(date)
    expect(date.getTime()).toBe(originalTime)
  })

  test('defaults to current date', () => {
    const result = getStartOfDay()
    const now = new Date()
    expect(result.getFullYear()).toBe(now.getFullYear())
    expect(result.getMonth()).toBe(now.getMonth())
    expect(result.getDate()).toBe(now.getDate())
  })
})

describe('getEndOfDay', () => {
  test('returns 23:59:59.999 for the given date', () => {
    const date = new Date(2024, 3, 10, 8, 0, 0)
    const result = getEndOfDay(date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
    expect(result.getMilliseconds()).toBe(999)
  })

  test('does not mutate the original date', () => {
    const date = new Date(2024, 3, 10, 8, 0, 0)
    const originalTime = date.getTime()
    getEndOfDay(date)
    expect(date.getTime()).toBe(originalTime)
  })
})

describe('getNormalizedDateRange', () => {
  test('returns start at midnight and end at 23:59:59.999', () => {
    const fromDate = new Date(2024, 6, 1, 12, 0, 0)
    const { start, end } = getNormalizedDateRange(7, fromDate)

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)

    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
  })

  test('start is the correct number of days before fromDate', () => {
    const fromDate = new Date(2024, 6, 10, 12, 0, 0)
    const { start } = getNormalizedDateRange(5, fromDate)
    expect(start.getDate()).toBe(5)
    expect(start.getMonth()).toBe(6)
  })

  test('end date matches fromDate calendar date', () => {
    const fromDate = new Date(2024, 6, 10, 15, 0, 0)
    const { end } = getNormalizedDateRange(3, fromDate)
    expect(end.getDate()).toBe(10)
    expect(end.getMonth()).toBe(6)
  })
})

describe('getRollingDateRange', () => {
  test('end matches fromDate exactly', () => {
    const fromDate = new Date(2024, 6, 10, 14, 30, 0)
    const { end } = getRollingDateRange(1, fromDate)
    expect(end.getTime()).toBe(fromDate.getTime())
  })

  test('start is exactly N days before end', () => {
    const fromDate = new Date(2024, 6, 10, 14, 30, 0)
    const { start, end } = getRollingDateRange(2, fromDate)
    const diffMs = end.getTime() - start.getTime()
    expect(diffMs).toBe(2 * 24 * 60 * 60 * 1000)
  })

  test('does not normalize to start/end of day', () => {
    const fromDate = new Date(2024, 6, 10, 14, 30, 45, 123)
    const { start, end } = getRollingDateRange(1, fromDate)
    expect(end.getHours()).toBe(14)
    expect(end.getMinutes()).toBe(30)
    expect(start.getHours()).toBe(14)
    expect(start.getMinutes()).toBe(30)
  })
})

describe('computeTimeRange', () => {
  test('default mode adds 1 hour buffer to end', () => {
    const nowSec = Math.floor(Date.now() / 1000)
    const { start_timestamp, end_timestamp } = computeTimeRange(7)
    expect(end_timestamp).toBeGreaterThanOrEqual(nowSec + 3599)
    expect(end_timestamp).toBeLessThanOrEqual(nowSec + 3601)
    const expectedStart = end_timestamp - 7 * 24 * 3600
    expect(start_timestamp).toBe(expectedStart)
  })

  test('useStartOfDay normalizes to day boundaries', () => {
    const date = new Date(2024, 6, 10, 15, 0, 0)
    const { start_timestamp, end_timestamp } = computeTimeRange(
      3,
      undefined,
      date,
      true
    )
    const endDate = new Date(end_timestamp * 1000)
    expect(endDate.getHours()).toBe(23)
    expect(endDate.getMinutes()).toBe(59)
    expect(endDate.getSeconds()).toBe(59)

    const startDate = new Date(start_timestamp * 1000)
    expect(startDate.getHours()).toBe(0)
    expect(startDate.getMinutes()).toBe(0)
    expect(startDate.getSeconds()).toBe(0)
  })

  test('respects provided start and end dates', () => {
    const startDate = new Date(2024, 0, 1, 0, 0, 0)
    const endDate = new Date(2024, 0, 10, 0, 0, 0)
    const { start_timestamp, end_timestamp } = computeTimeRange(
      30,
      startDate,
      endDate
    )
    expect(start_timestamp).toBe(dateToUnixTimestamp(startDate))
    expect(end_timestamp).toBe(dateToUnixTimestamp(endDate))
  })
})

describe('formatDate', () => {
  test('formats Unix timestamp to YYYY-MM-DD', () => {
    const ts = 1704067200
    const result = formatDate(ts)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('formatDateTimeObject', () => {
  test('formats Date to YYYY-MM-DD HH:mm:ss', () => {
    const date = new Date(2024, 0, 1, 14, 30, 45)
    const result = formatDateTimeObject(date)
    expect(result).toBe('2024-01-01 14:30:45')
  })
})

describe('formatChartTime', () => {
  test('day granularity shows MM-DD', () => {
    const ts = new Date(2024, 6, 15, 10, 0, 0).getTime() / 1000
    const result = formatChartTime(ts, 'day')
    expect(result).toBe('07-15')
  })

  test('hour granularity shows MM-DD HH:00', () => {
    const ts = new Date(2024, 6, 15, 14, 0, 0).getTime() / 1000
    const result = formatChartTime(ts, 'hour')
    expect(result).toBe('07-15 14:00')
  })

  test('week granularity shows range MM-DD - MM-DD', () => {
    const ts = new Date(2024, 6, 15, 0, 0, 0).getTime() / 1000
    const result = formatChartTime(ts, 'week')
    expect(result).toBe('07-15 - 07-21')
  })

  test('defaults to day granularity', () => {
    const ts = new Date(2024, 6, 15, 0, 0, 0).getTime() / 1000
    expect(formatChartTime(ts)).toBe('07-15')
  })
})

describe('addTimeToDate', () => {
  test('returns undefined when all params are zero', () => {
    expect(addTimeToDate(0, 0, 0)).toBeUndefined()
  })

  test('adds months', () => {
    const base = new Date(2024, 0, 15, 12, 0, 0)
    const result = addTimeToDate(2, 0, 0, base)!
    expect(result.getMonth()).toBe(2)
    expect(result.getFullYear()).toBe(2024)
  })

  test('adds days', () => {
    const base = new Date(2024, 0, 15, 12, 0, 0)
    const result = addTimeToDate(0, 10, 0, base)!
    expect(result.getDate()).toBe(25)
  })

  test('adds hours', () => {
    const base = new Date(2024, 0, 15, 12, 0, 0)
    const result = addTimeToDate(0, 0, 5, base)!
    expect(result.getHours()).toBe(17)
  })

  test('adds months, days, and hours combined', () => {
    const base = new Date(2024, 0, 1, 0, 0, 0)
    const result = addTimeToDate(1, 5, 3, base)!
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(6)
    expect(result.getHours()).toBe(3)
  })

  test('does not mutate the base date', () => {
    const base = new Date(2024, 0, 15, 12, 0, 0)
    const originalTime = base.getTime()
    addTimeToDate(1, 1, 1, base)
    expect(base.getTime()).toBe(originalTime)
  })
})
