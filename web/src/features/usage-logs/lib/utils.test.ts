import {
  isDisplayableLogType,
  isTimingLogType,
  getLogTypeConfig,
  isPerCallBilling,
  getDefaultTimeRange,
  buildQueryParams,
  buildBaseParams,
  buildApiParams,
} from './utils'

describe('isDisplayableLogType', () => {
  test('returns true for type 0 (Unknown)', () => {
    expect(isDisplayableLogType(0)).toBe(true)
  })

  test('returns true for type 2 (Consume)', () => {
    expect(isDisplayableLogType(2)).toBe(true)
  })

  test('returns true for type 5 (Error)', () => {
    expect(isDisplayableLogType(5)).toBe(true)
  })

  test('returns true for type 6 (Refund)', () => {
    expect(isDisplayableLogType(6)).toBe(true)
  })

  test('returns false for type 1 (Top-up)', () => {
    expect(isDisplayableLogType(1)).toBe(false)
  })

  test('returns false for type 3 (Manage)', () => {
    expect(isDisplayableLogType(3)).toBe(false)
  })

  test('returns false for type 7 (Login)', () => {
    expect(isDisplayableLogType(7)).toBe(false)
  })
})

describe('isTimingLogType', () => {
  test('returns true for type 2 (Consume)', () => {
    expect(isTimingLogType(2)).toBe(true)
  })

  test('returns true for type 5 (Error)', () => {
    expect(isTimingLogType(5)).toBe(true)
  })

  test('returns false for type 0', () => {
    expect(isTimingLogType(0)).toBe(false)
  })

  test('returns false for type 1', () => {
    expect(isTimingLogType(1)).toBe(false)
  })
})

describe('getLogTypeConfig', () => {
  test('returns config for type 2', () => {
    const config = getLogTypeConfig(2)
    expect(config.value).toBe(2)
    expect(config.label).toBe('Consume')
  })

  test('returns first element for unknown type', () => {
    const config = getLogTypeConfig(99)
    expect(config.value).toBe(0)
    expect(config.label).toBe('Unknown')
  })
})

describe('isPerCallBilling', () => {
  test('returns true when modelPrice is positive', () => {
    expect(isPerCallBilling(0.5)).toBe(true)
  })

  test('returns false when modelPrice is 0', () => {
    expect(isPerCallBilling(0)).toBe(false)
  })

  test('returns false when modelPrice is undefined', () => {
    expect(isPerCallBilling(undefined)).toBe(false)
  })

  test('returns false when modelPrice is negative', () => {
    expect(isPerCallBilling(-1)).toBe(false)
  })
})

describe('getDefaultTimeRange', () => {
  test('returns start and end dates', () => {
    const { start, end } = getDefaultTimeRange()
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)
  })

  test('start is beginning of today', () => {
    const { start } = getDefaultTimeRange()
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
  })

  test('end is roughly 1 hour from now', () => {
    const before = Date.now()
    const { end } = getDefaultTimeRange()
    const after = Date.now()
    const expectedMin = before + 3600 * 1000
    const expectedMax = after + 3600 * 1000
    expect(end.getTime()).toBeGreaterThanOrEqual(expectedMin)
    expect(end.getTime()).toBeLessThanOrEqual(expectedMax)
  })
})

describe('buildQueryParams', () => {
  test('builds URLSearchParams from record', () => {
    const result = buildQueryParams({ page: 1, size: 10 })
    expect(result.get('page')).toBe('1')
    expect(result.get('size')).toBe('10')
  })

  test('keeps 0 as valid value', () => {
    const result = buildQueryParams({ type: 0 })
    expect(result.get('type')).toBe('0')
  })

  test('filters out undefined', () => {
    const result = buildQueryParams({ a: 'val', b: undefined })
    expect(result.get('a')).toBe('val')
    expect(result.has('b')).toBe(false)
  })

  test('filters out null', () => {
    const result = buildQueryParams({ a: 'val', b: null })
    expect(result.get('a')).toBe('val')
    expect(result.has('b')).toBe(false)
  })

  test('filters out empty string', () => {
    const result = buildQueryParams({ a: 'val', b: '' })
    expect(result.get('a')).toBe('val')
    expect(result.has('b')).toBe(false)
  })
})

describe('buildBaseParams', () => {
  test('builds base params with page and pageSize', () => {
    const result = buildBaseParams({
      page: 2,
      pageSize: 20,
      searchParams: {},
    })
    expect(result.p).toBe(2)
    expect(result.page_size).toBe(20)
  })

  test('includes channel_id when present', () => {
    const result = buildBaseParams({
      page: 1,
      pageSize: 10,
      searchParams: { channel: '42' },
    })
    expect(result.channel_id).toBe('42')
  })

  test('does not include channel_id when absent', () => {
    const result = buildBaseParams({
      page: 1,
      pageSize: 10,
      searchParams: {},
    })
    expect(result.channel_id).toBeUndefined()
  })

  test('includes default time range when no time params', () => {
    const result = buildBaseParams({
      page: 1,
      pageSize: 10,
      searchParams: {},
    })
    expect(result.start_timestamp).toBeDefined()
    expect(result.end_timestamp).toBeDefined()
  })
})

describe('buildApiParams', () => {
  test('builds params for admin with all search params', () => {
    const result = buildApiParams({
      page: 1,
      pageSize: 20,
      searchParams: {
        type: '2',
        model: 'gpt-4',
        token: 'my-token',
        group: 'default',
        channel: '5',
        username: 'admin',
        requestId: 'req-123',
        upstreamRequestId: 'up-456',
      },
      isAdmin: true,
    })

    expect(result.p).toBe(1)
    expect(result.page_size).toBe(20)
    expect(result.type).toBe(2)
    expect(result.model_name).toBe('gpt-4')
    expect(result.token_name).toBe('my-token')
    expect(result.group).toBe('default')
    expect(result.channel).toBe(5)
    expect(result.username).toBe('admin')
    expect(result.request_id).toBe('req-123')
    expect(result.upstream_request_id).toBe('up-456')
  })

  test('excludes admin-only fields for non-admin', () => {
    const result = buildApiParams({
      page: 1,
      pageSize: 10,
      searchParams: {
        channel: '5',
        username: 'admin',
      },
      isAdmin: false,
    })

    expect(result.channel).toBeUndefined()
    expect(result.username).toBeUndefined()
  })

  test('processes type from array with single element', () => {
    const result = buildApiParams({
      page: 1,
      pageSize: 10,
      searchParams: { type: ['2'] },
      isAdmin: false,
    })
    expect(result.type).toBe(2)
  })

  test('overrides with column filters', () => {
    const result = buildApiParams({
      page: 1,
      pageSize: 10,
      searchParams: { model: 'gpt-4' },
      columnFilters: [{ id: 'model_name', value: 'claude-3' }],
      isAdmin: false,
    })
    expect(result.model_name).toBe('claude-3')
  })

  test('ignores empty column filter values', () => {
    const result = buildApiParams({
      page: 1,
      pageSize: 10,
      searchParams: { model: 'gpt-4' },
      columnFilters: [{ id: 'model_name', value: '' }],
      isAdmin: false,
    })
    expect(result.model_name).toBe('gpt-4')
  })
})
