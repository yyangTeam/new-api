import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  getAllLogs,
  getUserLogs,
  getLogStats,
  getUserLogStats,
  getUserInfo,
  getAllMidjourneyLogs,
  getUserMidjourneyLogs,
  getAllTaskLogs,
  getUserTaskLogs,
} from '@/features/usage-logs/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock('@/features/usage-logs/lib/utils', () => ({
  buildQueryParams: vi.fn((params: Record<string, unknown>) => {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') sp.append(k, String(v))
    })
    return sp
  }),
}))

import { api } from '@/lib/api'

const mockGet = api.get as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usage-logs/api', () => {
  describe('getAllLogs', () => {
    it('fetches all logs with default params', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: { items: [], total: 0 } } })
      const result = await getAllLogs()
      expect(mockGet).toHaveBeenCalled()
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/log')
      expect(callArg).not.toContain('/self')
      expect(result).toEqual({ success: true, data: { items: [], total: 0 } })
    })

    it('fetches all logs with custom params', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getAllLogs({ p: 2, page_size: 50, type: 2 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/log')
    })
  })

  describe('getUserLogs', () => {
    it('fetches user logs from self endpoint', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getUserLogs({ p: 1, page_size: 20 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/log/self')
    })

    it('uses default params', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getUserLogs()
      expect(mockGet).toHaveBeenCalled()
    })
  })

  describe('getLogStats', () => {
    it('fetches admin log stats', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: { quota: 100, rpm: 5, tpm: 10 } } })
      const result = await getLogStats({ type: 2 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/log/stat')
      expect(callArg).not.toContain('/self')
      expect(result).toEqual({ success: true, data: { quota: 100, rpm: 5, tpm: 10 } })
    })

    it('uses default params', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getLogStats()
      expect(mockGet).toHaveBeenCalled()
    })
  })

  describe('getUserLogStats', () => {
    it('fetches user log stats from self endpoint', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getUserLogStats({ type: 2 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/log/self/stat')
    })

    it('uses default params', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getUserLogStats()
      expect(mockGet).toHaveBeenCalled()
    })
  })

  describe('getUserInfo', () => {
    it('fetches user info', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { id: 1, username: 'admin' } },
      })
      const result = await getUserInfo(1)
      expect(mockGet).toHaveBeenCalledWith('/api/user/1')
      expect(result).toEqual({ success: true, data: { id: 1, username: 'admin' } })
    })
  })

  describe('getAllMidjourneyLogs', () => {
    it('fetches admin midjourney logs', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getAllMidjourneyLogs({ p: 1, page_size: 20 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/mj')
      expect(callArg).not.toContain('/self')
    })
  })

  describe('getUserMidjourneyLogs', () => {
    it('fetches user midjourney logs from self endpoint', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getUserMidjourneyLogs({ p: 1, page_size: 20 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/mj/self')
    })
  })

  describe('getAllTaskLogs', () => {
    it('fetches admin task logs', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getAllTaskLogs({ p: 1, page_size: 10 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/task')
      expect(callArg).not.toContain('/self')
    })
  })

  describe('getUserTaskLogs', () => {
    it('fetches user task logs from self endpoint', async () => {
      mockGet.mockResolvedValue({ data: { success: true } })
      await getUserTaskLogs({ p: 1, page_size: 10 })
      const callArg = mockGet.mock.calls[0][0] as string
      expect(callArg).toContain('/api/task/self')
    })
  })
})
