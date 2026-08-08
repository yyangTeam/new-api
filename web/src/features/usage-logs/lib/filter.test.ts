import { buildSearchParams, getLogCategoryLabel } from './filter'
import type { CommonLogFilters, DrawingLogFilters, TaskLogFilters } from '../types'

describe('buildSearchParams', () => {
  test('builds base params with startTime and endTime', () => {
    const startTime = new Date('2024-01-01T00:00:00Z')
    const endTime = new Date('2024-01-31T23:59:59Z')
    const filters: CommonLogFilters = { startTime, endTime }

    const result = buildSearchParams(filters, 'common')
    expect(result.startTime).toBe(startTime.getTime())
    expect(result.endTime).toBe(endTime.getTime())
  })

  test('includes channel when provided', () => {
    const filters: CommonLogFilters = { channel: '5' }
    const result = buildSearchParams(filters, 'common')
    expect(result.channel).toBe('5')
  })

  test('omits undefined fields', () => {
    const filters: CommonLogFilters = {}
    const result = buildSearchParams(filters, 'common')
    expect(result).toEqual({})
  })

  describe('common category', () => {
    test('includes model filter', () => {
      const filters: CommonLogFilters = { model: 'gpt-4' }
      const result = buildSearchParams(filters, 'common')
      expect(result.model).toBe('gpt-4')
    })

    test('includes token filter', () => {
      const filters: CommonLogFilters = { token: 'my-token' }
      const result = buildSearchParams(filters, 'common')
      expect(result.token).toBe('my-token')
    })

    test('includes group filter', () => {
      const filters: CommonLogFilters = { group: 'default' }
      const result = buildSearchParams(filters, 'common')
      expect(result.group).toBe('default')
    })

    test('includes username filter', () => {
      const filters: CommonLogFilters = { username: 'admin' }
      const result = buildSearchParams(filters, 'common')
      expect(result.username).toBe('admin')
    })

    test('includes requestId filter', () => {
      const filters: CommonLogFilters = { requestId: 'req-123' }
      const result = buildSearchParams(filters, 'common')
      expect(result.requestId).toBe('req-123')
    })

    test('includes upstreamRequestId filter', () => {
      const filters: CommonLogFilters = { upstreamRequestId: 'up-456' }
      const result = buildSearchParams(filters, 'common')
      expect(result.upstreamRequestId).toBe('up-456')
    })

    test('includes all common filters together', () => {
      const filters: CommonLogFilters = {
        model: 'gpt-4',
        token: 'tk',
        group: 'grp',
        username: 'user',
        requestId: 'r1',
        upstreamRequestId: 'u1',
        channel: '3',
      }
      const result = buildSearchParams(filters, 'common')
      expect(result.model).toBe('gpt-4')
      expect(result.token).toBe('tk')
      expect(result.group).toBe('grp')
      expect(result.username).toBe('user')
      expect(result.requestId).toBe('r1')
      expect(result.upstreamRequestId).toBe('u1')
      expect(result.channel).toBe('3')
    })
  })

  describe('drawing category', () => {
    test('includes mjId as filter param', () => {
      const filters: DrawingLogFilters = { mjId: 'mj-123' }
      const result = buildSearchParams(filters, 'drawing')
      expect(result.filter).toBe('mj-123')
    })

    test('omits filter when mjId is undefined', () => {
      const filters: DrawingLogFilters = {}
      const result = buildSearchParams(filters, 'drawing')
      expect(result.filter).toBeUndefined()
    })
  })

  describe('task category', () => {
    test('includes taskId as filter param', () => {
      const filters: TaskLogFilters = { taskId: 'task-456' }
      const result = buildSearchParams(filters, 'task')
      expect(result.filter).toBe('task-456')
    })

    test('omits filter when taskId is undefined', () => {
      const filters: TaskLogFilters = {}
      const result = buildSearchParams(filters, 'task')
      expect(result.filter).toBeUndefined()
    })
  })

  test('returns only base params for unknown category', () => {
    const filters: CommonLogFilters = {
      channel: '1',
      model: 'gpt-4',
    }
    const result = buildSearchParams(filters, 'unknown' as any)
    expect(result.channel).toBe('1')
    expect(result.model).toBeUndefined()
  })
})

describe('getLogCategoryLabel', () => {
  test('returns Common for common category', () => {
    expect(getLogCategoryLabel('common')).toBe('Common')
  })

  test('returns Drawing for drawing category', () => {
    expect(getLogCategoryLabel('drawing')).toBe('Drawing')
  })

  test('returns Task for task category', () => {
    expect(getLogCategoryLabel('task')).toBe('Task')
  })
})
