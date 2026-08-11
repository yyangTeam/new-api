import { getRankings } from '@/features/rankings/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/lib/api'

describe('getRankings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls api.get with period param and returns data', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: {
          models: [],
          vendors: [],
          top_movers: [],
          top_droppers: [],
          models_history: { points: [], models: [], buckets: 0 },
          vendor_share_history: { points: [], vendors: [], buckets: 0 },
        },
      },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getRankings('week')

    expect(api.get).toHaveBeenCalledWith('/api/rankings', {
      params: { period: 'week' },
    })
    expect(result).toEqual(mockResponse.data)
  })

  test('passes today period', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: {} } })
    await getRankings('today')
    expect(api.get).toHaveBeenCalledWith('/api/rankings', {
      params: { period: 'today' },
    })
  })

  test('passes month period', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: {} } })
    await getRankings('month')
    expect(api.get).toHaveBeenCalledWith('/api/rankings', {
      params: { period: 'month' },
    })
  })

  test('passes year period', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: {} } })
    await getRankings('year')
    expect(api.get).toHaveBeenCalledWith('/api/rankings', {
      params: { period: 'year' },
    })
  })

  test('propagates errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Server error'))
    await expect(getRankings('week')).rejects.toThrow('Server error')
  })
})
