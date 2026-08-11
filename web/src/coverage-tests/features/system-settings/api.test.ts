import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '@/lib/api'
import {
  getSystemOptions,
  updateSystemOption,
  confirmPaymentCompliance,
  startLogCleanupTask,
  getCurrentLogCleanupTask,
  getSystemTask,
  listSystemTasks,
  resetModelRatios,
  getUpstreamChannels,
  fetchUpstreamRatios,
} from '@/features/system-settings/api'

const mockApi = vi.mocked(api)

describe('system-settings API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSystemOptions', () => {
    it('calls GET /api/option/ and returns data', async () => {
      const mockData = { success: true, message: '', data: [{ key: 'k', value: 'v' }] }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getSystemOptions()
      expect(mockApi.get).toHaveBeenCalledWith('/api/option/')
      expect(result).toEqual(mockData)
    })
  })

  describe('updateSystemOption', () => {
    it('calls PUT /api/option/ with request body', async () => {
      const mockData = { success: true, message: 'Updated' }
      mockApi.put.mockResolvedValue({ data: mockData })

      const result = await updateSystemOption({ key: 'TestKey', value: 'TestVal' })
      expect(mockApi.put).toHaveBeenCalledWith('/api/option/', {
        key: 'TestKey',
        value: 'TestVal',
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('confirmPaymentCompliance', () => {
    it('calls POST /api/option/payment_compliance', async () => {
      const mockData = { success: true, message: '', data: { confirmed: true } }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await confirmPaymentCompliance()
      expect(mockApi.post).toHaveBeenCalledWith('/api/option/payment_compliance', {
        confirmed: true,
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('startLogCleanupTask', () => {
    it('calls POST /api/system-task/log-cleanup with target_timestamp param', async () => {
      const mockData = { success: true, message: '', data: { task_id: 'abc' } }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await startLogCleanupTask(1700000000)
      expect(mockApi.post).toHaveBeenCalledWith(
        '/api/system-task/log-cleanup',
        null,
        { params: { target_timestamp: 1700000000 } }
      )
      expect(result).toEqual(mockData)
    })
  })

  describe('getCurrentLogCleanupTask', () => {
    it('calls GET /api/system-task/current with type param', async () => {
      const mockData = { success: true, message: '', data: null }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getCurrentLogCleanupTask()
      expect(mockApi.get).toHaveBeenCalledWith('/api/system-task/current', {
        params: { type: 'log_cleanup' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('getSystemTask', () => {
    it('calls GET /api/system-task/:taskId', async () => {
      const mockData = { success: true, message: '', data: { task_id: 'xyz' } }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getSystemTask('xyz')
      expect(mockApi.get).toHaveBeenCalledWith('/api/system-task/xyz')
      expect(result).toEqual(mockData)
    })
  })

  describe('listSystemTasks', () => {
    it('calls GET /api/system-task/list with default limit', async () => {
      const mockData = { success: true, message: '', data: [] }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await listSystemTasks()
      expect(mockApi.get).toHaveBeenCalledWith('/api/system-task/list', {
        params: { limit: 20 },
      })
      expect(result).toEqual(mockData)
    })

    it('calls GET /api/system-task/list with custom limit', async () => {
      const mockData = { success: true, message: '', data: [] }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await listSystemTasks(50)
      expect(mockApi.get).toHaveBeenCalledWith('/api/system-task/list', {
        params: { limit: 50 },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('resetModelRatios', () => {
    it('calls POST /api/option/rest_model_ratio', async () => {
      const mockData = { success: true, message: 'Reset done' }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await resetModelRatios()
      expect(mockApi.post).toHaveBeenCalledWith('/api/option/rest_model_ratio')
      expect(result).toEqual(mockData)
    })
  })

  describe('getUpstreamChannels', () => {
    it('calls GET /api/ratio_sync/channels', async () => {
      const mockData = { success: true, message: '', data: [] }
      mockApi.get.mockResolvedValue({ data: mockData })

      const result = await getUpstreamChannels()
      expect(mockApi.get).toHaveBeenCalledWith('/api/ratio_sync/channels')
      expect(result).toEqual(mockData)
    })
  })

  describe('fetchUpstreamRatios', () => {
    it('calls POST /api/ratio_sync/fetch with request body', async () => {
      const request = {
        upstreams: [{ id: 1, name: 'test', base_url: 'http://x', endpoint: '/api' }],
        timeout: 30,
      }
      const mockData = {
        success: true,
        message: '',
        data: { differences: {}, test_results: [] },
      }
      mockApi.post.mockResolvedValue({ data: mockData })

      const result = await fetchUpstreamRatios(request)
      expect(mockApi.post).toHaveBeenCalledWith('/api/ratio_sync/fetch', request)
      expect(result).toEqual(mockData)
    })
  })
})
