import { getHomePageContent } from '@/features/home/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/lib/api'

describe('getHomePageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('calls api.get with correct endpoint and returns data', async () => {
    const mockResponse = {
      data: { success: true, data: '# Welcome' },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getHomePageContent()

    expect(api.get).toHaveBeenCalledWith('/api/home_page_content')
    expect(result).toEqual(mockResponse.data)
  })

  test('returns response without data field', async () => {
    const mockResponse = {
      data: { success: true, message: 'empty' },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getHomePageContent()
    expect(result.data).toBeUndefined()
  })

  test('propagates errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Timeout'))
    await expect(getHomePageContent()).rejects.toThrow('Timeout')
  })
})
