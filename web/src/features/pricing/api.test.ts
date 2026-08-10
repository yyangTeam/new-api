import { describe, test, expect, vi, beforeEach } from 'vitest'

import { getPricing } from './api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/lib/api'

const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPricing', () => {
  test('calls api.get with /api/pricing', async () => {
    const mockData = {
      success: true,
      data: [{ model_name: 'gpt-4', model_ratio: 30 }],
      vendors: [],
      group_ratio: {},
      usable_group: {},
      supported_endpoint: {},
      auto_groups: [],
    }
    mockApi.get.mockResolvedValue({ data: mockData })
    const result = await getPricing()
    expect(mockApi.get).toHaveBeenCalledWith('/api/pricing')
    expect(result).toEqual(mockData)
  })

  test('returns response data directly', async () => {
    mockApi.get.mockResolvedValue({ data: { success: false, message: 'Error' } })
    const result = await getPricing()
    expect(result).toEqual({ success: false, message: 'Error' })
  })
})
