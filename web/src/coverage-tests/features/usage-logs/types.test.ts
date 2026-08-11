import { describe, it, expect } from 'vitest'

import { USAGE_BILLING_PATH } from '@/features/usage-logs/types'
import type {
  LogCategory,
  CommonFilters,
  CommonLogFilters,
  DrawingLogFilters,
  TaskLogFilters,
  LogOtherData,
  LogStatistics,
  MidjourneyLog,
  TaskLog,
  GetLogsParams,
  GetLogsResponse,
  GetLogStatsParams,
  GetLogStatsResponse,
  GetMidjourneyLogsParams,
  GetTaskLogsParams,
  FetchLogsConfig,
  UserInfo,
  ChannelAffinityInfo,
  ToolSurchargeItem,
} from '@/features/usage-logs/types'

describe('usage-logs/types', () => {
  describe('USAGE_BILLING_PATH', () => {
    it('has LOCAL path', () => {
      expect(USAGE_BILLING_PATH.LOCAL).toBe('local')
    })

    it('has UPSTREAM path', () => {
      expect(USAGE_BILLING_PATH.UPSTREAM).toBe('upstream')
    })

    it('has OPENAI path', () => {
      expect(USAGE_BILLING_PATH.OPENAI).toBe('billing-usage-openai')
    })

    it('has OPENAI_ESTIMATED path', () => {
      expect(USAGE_BILLING_PATH.OPENAI_ESTIMATED).toBe('billing-usage-openai-estimated')
    })

    it('has ANTHROPIC path', () => {
      expect(USAGE_BILLING_PATH.ANTHROPIC).toBe('billing-usage-anthropic')
    })

    it('has ANTHROPIC_ESTIMATED path', () => {
      expect(USAGE_BILLING_PATH.ANTHROPIC_ESTIMATED).toBe('billing-usage-anthropic-estimated')
    })

    it('has GEMINI path', () => {
      expect(USAGE_BILLING_PATH.GEMINI).toBe('billing-usage-gemini')
    })

    it('has GEMINI_ESTIMATED path', () => {
      expect(USAGE_BILLING_PATH.GEMINI_ESTIMATED).toBe('billing-usage-gemini-estimated')
    })
  })

  describe('Type structure verification', () => {
    it('LogCategory accepts valid values', () => {
      const categories: LogCategory[] = ['common', 'drawing', 'task']
      expect(categories).toHaveLength(3)
    })

    it('CommonFilters structure', () => {
      const filters: CommonFilters = {
        startTime: new Date(),
        endTime: new Date(),
        channel: '5',
      }
      expect(filters.startTime).toBeInstanceOf(Date)
      expect(filters.channel).toBe('5')
    })

    it('CommonLogFilters extends CommonFilters', () => {
      const filters: CommonLogFilters = {
        model: 'gpt-4',
        token: 'test',
        group: 'default',
        username: 'admin',
        requestId: 'req-1',
        upstreamRequestId: 'up-1',
      }
      expect(filters.model).toBe('gpt-4')
    })

    it('DrawingLogFilters extends CommonFilters', () => {
      const filters: DrawingLogFilters = {
        mjId: 'mj-123',
      }
      expect(filters.mjId).toBe('mj-123')
    })

    it('TaskLogFilters extends CommonFilters', () => {
      const filters: TaskLogFilters = {
        taskId: 'task-456',
      }
      expect(filters.taskId).toBe('task-456')
    })

    it('LogStatistics structure', () => {
      const stats: LogStatistics = { quota: 100, rpm: 5, tpm: 50 }
      expect(stats.quota).toBe(100)
    })

    it('ChannelAffinityInfo structure', () => {
      const info: ChannelAffinityInfo = {
        rule_name: 'test',
        selected_group: 'default',
      }
      expect(info.rule_name).toBe('test')
    })

    it('ToolSurchargeItem structure', () => {
      const item: ToolSurchargeItem = {
        name: 'web_search',
        count: 3,
        price: 0.005,
      }
      expect(item.name).toBe('web_search')
    })

    it('LogOtherData structure', () => {
      const data: LogOtherData = {
        model_ratio: 1.5,
        completion_ratio: 2.0,
        frt: 250,
        ws: true,
        audio: false,
      }
      expect(data.model_ratio).toBe(1.5)
      expect(data.ws).toBe(true)
    })

    it('MidjourneyLog structure', () => {
      const log: MidjourneyLog = {
        id: 1,
        user_id: 10,
        channel_id: 5,
        code: 1,
        mj_id: 'mj-abc',
        action: 'IMAGINE',
        submit_time: 1700000000000,
        progress: '100%',
        prompt: 'a cat',
        status: 'SUCCESS',
      }
      expect(log.action).toBe('IMAGINE')
    })

    it('TaskLog structure', () => {
      const log: TaskLog = {
        id: 1,
        user_id: 10,
        platform: 'suno',
        task_id: 'task-123',
        action: 'MUSIC',
        channel_id: 5,
        submit_time: 1700000000,
        status: 'SUCCESS',
      }
      expect(log.platform).toBe('suno')
    })

    it('GetLogsParams structure', () => {
      const params: GetLogsParams = {
        p: 1,
        page_size: 20,
        type: 2,
        model_name: 'gpt-4',
      }
      expect(params.p).toBe(1)
    })

    it('GetLogsResponse structure', () => {
      const response: GetLogsResponse = {
        success: true,
        data: { items: [], total: 0, page: 1, page_size: 20 },
      }
      expect(response.success).toBe(true)
    })

    it('GetLogStatsParams structure', () => {
      const params: GetLogStatsParams = { type: 2 }
      expect(params.type).toBe(2)
    })

    it('GetLogStatsResponse structure', () => {
      const response: GetLogStatsResponse = {
        success: true,
        data: { quota: 100, rpm: 5, tpm: 10 },
      }
      expect(response.data?.quota).toBe(100)
    })

    it('GetMidjourneyLogsParams structure', () => {
      const params: GetMidjourneyLogsParams = {
        p: 1,
        page_size: 20,
        mj_id: 'test',
      }
      expect(params.mj_id).toBe('test')
    })

    it('GetTaskLogsParams structure', () => {
      const params: GetTaskLogsParams = {
        p: 1,
        page_size: 10,
        task_id: 'task-1',
      }
      expect(params.task_id).toBe('task-1')
    })

    it('FetchLogsConfig structure', () => {
      const config: FetchLogsConfig = {
        logCategory: 'common',
        isAdmin: true,
        page: 1,
        pageSize: 20,
        searchParams: {},
        columnFilters: [],
      }
      expect(config.logCategory).toBe('common')
    })

    it('UserInfo structure', () => {
      const user: UserInfo = {
        id: 1,
        username: 'admin',
        quota: 10000,
        used_quota: 5000,
        request_count: 100,
      }
      expect(user.username).toBe('admin')
    })
  })
})
