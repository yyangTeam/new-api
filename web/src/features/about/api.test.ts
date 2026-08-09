import { getAboutContent } from './api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/lib/api'

describe('getAboutContent', () => {
  test('calls api.get with correct endpoint and returns data', async () => {
    const mockResponse = {
      data: { success: true, message: 'ok', data: '# About Us' },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getAboutContent()

    expect(api.get).toHaveBeenCalledWith('/api/about')
    expect(result).toEqual(mockResponse.data)
  })

  test('returns response with empty data field', async () => {
    const mockResponse = {
      data: { success: true, message: 'ok', data: '' },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getAboutContent()
    expect(result.data).toBe('')
  })

  test('propagates errors from api.get', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    await expect(getAboutContent()).rejects.toThrow('Network error')
  })
})
