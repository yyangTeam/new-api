import { describe, it, expect, vi } from 'vitest'

vi.mock('../components/columns/common-logs-columns', () => ({
  useCommonLogsColumns: vi.fn(() => []),
}))
vi.mock('../components/columns/drawing-logs-columns', () => ({
  useDrawingLogsColumns: vi.fn(() => []),
}))
vi.mock('../components/columns/task-logs-columns', () => ({
  useTaskLogsColumns: vi.fn(() => []),
}))
vi.mock('../api', () => ({
  getAllLogs: vi.fn(),
  getUserLogs: vi.fn(),
  getAllMidjourneyLogs: vi.fn(),
  getUserMidjourneyLogs: vi.fn(),
  getAllTaskLogs: vi.fn(),
  getUserTaskLogs: vi.fn(),
}))

import {
  parseLogOther,
  getTimeColor,
  formatModelName,
  formatDuration,
  getParamOverrideActionLabel,
  parseAuditLine,
  isViolationFeeLog,
  buildSearchParams,
  getLogCategoryLabel,
  isDisplayableLogType,
  isTimingLogType,
  getLogTypeConfig,
  isPerCallBilling,
  getDefaultTimeRange,
  buildQueryParams,
  buildBaseParams,
  buildApiParams,
  fetchLogsByCategory,
  createStatusMapper,
  mjTaskTypeMapper,
  mjStatusMapper,
  taskActionMapper,
  taskStatusMapper,
  taskPlatformMapper,
  useColumnsByCategory,
} from './index'

describe('usage-logs/lib/index exports', () => {
  it('exports format utilities', () => {
    expect(typeof parseLogOther).toBe('function')
    expect(typeof getTimeColor).toBe('function')
    expect(typeof formatModelName).toBe('function')
    expect(typeof formatDuration).toBe('function')
    expect(typeof getParamOverrideActionLabel).toBe('function')
    expect(typeof parseAuditLine).toBe('function')
    expect(typeof isViolationFeeLog).toBe('function')
  })

  it('exports filter utilities', () => {
    expect(typeof buildSearchParams).toBe('function')
    expect(typeof getLogCategoryLabel).toBe('function')
  })

  it('exports general utilities', () => {
    expect(typeof isDisplayableLogType).toBe('function')
    expect(typeof isTimingLogType).toBe('function')
    expect(typeof getLogTypeConfig).toBe('function')
    expect(typeof isPerCallBilling).toBe('function')
    expect(typeof getDefaultTimeRange).toBe('function')
    expect(typeof buildQueryParams).toBe('function')
    expect(typeof buildBaseParams).toBe('function')
    expect(typeof buildApiParams).toBe('function')
    expect(typeof fetchLogsByCategory).toBe('function')
  })

  it('exports status mapper utilities', () => {
    expect(typeof createStatusMapper).toBe('function')
    expect(mjTaskTypeMapper).toBeDefined()
    expect(mjStatusMapper).toBeDefined()
    expect(taskActionMapper).toBeDefined()
    expect(taskStatusMapper).toBeDefined()
    expect(taskPlatformMapper).toBeDefined()
  })

  it('exports column utilities', () => {
    expect(typeof useColumnsByCategory).toBe('function')
  })
})
