import { formatDuration, formatResetPeriod, formatTimestamp } from './format'

const mockT = ((key: string) => key) as import('i18next').TFunction

describe('formatDuration', () => {
  test('formats months', () => {
    expect(formatDuration({ duration_unit: 'month', duration_value: 3 }, mockT)).toBe(
      '3 months'
    )
  })

  test('formats years', () => {
    expect(formatDuration({ duration_unit: 'year', duration_value: 1 }, mockT)).toBe(
      '1 years'
    )
  })

  test('formats days', () => {
    expect(formatDuration({ duration_unit: 'day', duration_value: 7 }, mockT)).toBe(
      '7 days'
    )
  })

  test('formats hours', () => {
    expect(formatDuration({ duration_unit: 'hour', duration_value: 24 }, mockT)).toBe(
      '24 hours'
    )
  })

  test('formats custom seconds as days', () => {
    expect(
      formatDuration(
        { duration_unit: 'custom', custom_seconds: 172800 },
        mockT
      )
    ).toBe('2 days')
  })

  test('formats custom seconds as hours', () => {
    expect(
      formatDuration(
        { duration_unit: 'custom', custom_seconds: 7200 },
        mockT
      )
    ).toBe('2 hours')
  })

  test('formats custom seconds less than an hour', () => {
    expect(
      formatDuration(
        { duration_unit: 'custom', custom_seconds: 300 },
        mockT
      )
    ).toBe('300 seconds')
  })

  test('defaults to month/1 for empty plan', () => {
    expect(formatDuration({}, mockT)).toBe('1 months')
  })
})

describe('formatResetPeriod', () => {
  test('returns Daily for daily', () => {
    expect(formatResetPeriod({ quota_reset_period: 'daily' }, mockT)).toBe(
      'Daily'
    )
  })

  test('returns Weekly for weekly', () => {
    expect(formatResetPeriod({ quota_reset_period: 'weekly' }, mockT)).toBe(
      'Weekly'
    )
  })

  test('returns Monthly for monthly', () => {
    expect(formatResetPeriod({ quota_reset_period: 'monthly' }, mockT)).toBe(
      'Monthly'
    )
  })

  test('returns No Reset for never', () => {
    expect(formatResetPeriod({ quota_reset_period: 'never' }, mockT)).toBe(
      'No Reset'
    )
  })

  test('returns No Reset for empty plan', () => {
    expect(formatResetPeriod({}, mockT)).toBe('No Reset')
  })

  test('formats custom period in days', () => {
    expect(
      formatResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 172800 },
        mockT
      )
    ).toBe('2 days')
  })

  test('formats custom period in hours', () => {
    expect(
      formatResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 7200 },
        mockT
      )
    ).toBe('2 hours')
  })

  test('formats custom period in minutes', () => {
    expect(
      formatResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 300 },
        mockT
      )
    ).toBe('5 minutes')
  })

  test('formats custom period in seconds', () => {
    expect(
      formatResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 45 },
        mockT
      )
    ).toBe('45 seconds')
  })
})

describe('formatTimestamp', () => {
  test('returns "-" for 0', () => {
    expect(formatTimestamp(0)).toBe('-')
  })

  test('returns "-" for falsy values', () => {
    expect(formatTimestamp(undefined as unknown as number)).toBe('-')
  })

  test('returns formatted date for valid timestamp', () => {
    const result = formatTimestamp(1700000000)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})
