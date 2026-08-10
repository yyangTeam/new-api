import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import {
  getCacheStats,
  clearAllCache,
  clearRuleCache,
  getAffinityUsageCache,
} from './api'

const mockApi = vi.mocked(api)

describe('channel-affinity API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCacheStats', () => {
    it('calls GET /api/option/channel_affinity_cache', async () => {
      const mockData = {
        success: true,
        data: {
          enabled: true,
          total: 100,
          unknown: 5,
          by_rule_name: { rule1: 50, rule2: 45 },
          cache_capacity: 1000,
          cache_algo: 'lru',
        },
      }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getCacheStats()
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/option/channel_affinity_cache',
        { disableDuplicate: true }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('clearAllCache', () => {
    it('calls DELETE /api/option/channel_affinity_cache with all=true', async () => {
      const mockData = { success: true, message: 'cleared' }
      mockApi.delete.mockResolvedValue({ data: mockData })

      const result = await clearAllCache()
      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/option/channel_affinity_cache',
        { params: { all: true } }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('clearRuleCache', () => {
    it('calls DELETE /api/option/channel_affinity_cache with rule_name', async () => {
      const mockData = { success: true, message: 'rule cleared' }
      mockApi.delete.mockResolvedValue({ data: mockData })

      const result = await clearRuleCache('my-rule')
      expect(mockApi.delete).toHaveBeenCalledWith(
        '/api/option/channel_affinity_cache',
        { params: { rule_name: 'my-rule' } }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('getAffinityUsageCache', () => {
    it('calls GET /api/log/channel_affinity_usage_cache with params', async () => {
      const mockData = { success: true, data: { entries: [] } }
      mockApi.get.mockResolvedValue({ data: mockData })

      const params = {
        rule_name: 'test-rule',
        using_group: 'group1',
        key_hint: 'hint',
        key_fp: 'fingerprint',
      }

      const result = await getAffinityUsageCache(params)
      expect(mockApi.get).toHaveBeenCalledWith(
        '/api/log/channel_affinity_usage_cache',
        { params, disableDuplicate: true }
      )
      expect(result).toEqual(mockData)
    })
  })
})
