import {
  formatSubscriptionDuration,
  formatSubscriptionResetPeriod,
} from './subscriptionFormat';

const t = (key) => key;

describe('formatSubscriptionDuration', () => {
  test('defaults to 1 month when plan is null', () => {
    expect(formatSubscriptionDuration(null, t)).toBe('1 个月');
  });

  test('defaults to 1 month when plan is empty object', () => {
    expect(formatSubscriptionDuration({}, t)).toBe('1 个月');
  });

  test('formats year duration', () => {
    expect(
      formatSubscriptionDuration({ duration_unit: 'year', duration_value: 2 }, t),
    ).toBe('2 年');
  });

  test('formats month duration', () => {
    expect(
      formatSubscriptionDuration({ duration_unit: 'month', duration_value: 3 }, t),
    ).toBe('3 个月');
  });

  test('formats day duration', () => {
    expect(
      formatSubscriptionDuration({ duration_unit: 'day', duration_value: 7 }, t),
    ).toBe('7 天');
  });

  test('formats hour duration', () => {
    expect(
      formatSubscriptionDuration({ duration_unit: 'hour', duration_value: 24 }, t),
    ).toBe('24 小时');
  });

  test('formats custom duration in days', () => {
    expect(
      formatSubscriptionDuration(
        { duration_unit: 'custom', custom_seconds: 172800 },
        t,
      ),
    ).toBe('2 天');
  });

  test('formats custom duration in hours', () => {
    expect(
      formatSubscriptionDuration(
        { duration_unit: 'custom', custom_seconds: 7200 },
        t,
      ),
    ).toBe('2 小时');
  });

  test('formats custom duration in seconds', () => {
    expect(
      formatSubscriptionDuration(
        { duration_unit: 'custom', custom_seconds: 300 },
        t,
      ),
    ).toBe('300 秒');
  });

  test('formats custom duration of 0 seconds', () => {
    expect(
      formatSubscriptionDuration(
        { duration_unit: 'custom', custom_seconds: 0 },
        t,
      ),
    ).toBe('0 秒');
  });

  test('uses unit string as fallback for unknown unit', () => {
    expect(
      formatSubscriptionDuration(
        { duration_unit: 'quarter', duration_value: 1 },
        t,
      ),
    ).toBe('1 quarter');
  });
});

describe('formatSubscriptionResetPeriod', () => {
  test('returns "不重置" for null plan', () => {
    expect(formatSubscriptionResetPeriod(null, t)).toBe('不重置');
  });

  test('returns "不重置" for empty object', () => {
    expect(formatSubscriptionResetPeriod({}, t)).toBe('不重置');
  });

  test('returns "不重置" for never period', () => {
    expect(
      formatSubscriptionResetPeriod({ quota_reset_period: 'never' }, t),
    ).toBe('不重置');
  });

  test('returns "每天" for daily period', () => {
    expect(
      formatSubscriptionResetPeriod({ quota_reset_period: 'daily' }, t),
    ).toBe('每天');
  });

  test('returns "每周" for weekly period', () => {
    expect(
      formatSubscriptionResetPeriod({ quota_reset_period: 'weekly' }, t),
    ).toBe('每周');
  });

  test('returns "每月" for monthly period', () => {
    expect(
      formatSubscriptionResetPeriod({ quota_reset_period: 'monthly' }, t),
    ).toBe('每月');
  });

  test('formats custom period in days', () => {
    expect(
      formatSubscriptionResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 259200 },
        t,
      ),
    ).toBe('3 天');
  });

  test('formats custom period in hours', () => {
    expect(
      formatSubscriptionResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 10800 },
        t,
      ),
    ).toBe('3 小时');
  });

  test('formats custom period in minutes', () => {
    expect(
      formatSubscriptionResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 300 },
        t,
      ),
    ).toBe('5 分钟');
  });

  test('formats custom period in seconds', () => {
    expect(
      formatSubscriptionResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 45 },
        t,
      ),
    ).toBe('45 秒');
  });

  test('formats custom period of 0 seconds', () => {
    expect(
      formatSubscriptionResetPeriod(
        { quota_reset_period: 'custom', quota_reset_custom_seconds: 0 },
        t,
      ),
    ).toBe('0 秒');
  });

  test('returns "不重置" for unknown period', () => {
    expect(
      formatSubscriptionResetPeriod({ quota_reset_period: 'biweekly' }, t),
    ).toBe('不重置');
  });
});
