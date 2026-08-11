import { getUserAgreement, getPrivacyPolicy } from '@/features/legal/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/lib/api'

describe('getUserAgreement', () => {
  test('calls api.get with correct endpoint and returns data', async () => {
    const mockResponse = {
      data: { success: true, message: 'ok', data: '# Agreement' },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getUserAgreement()

    expect(api.get).toHaveBeenCalledWith('/api/user-agreement')
    expect(result).toEqual(mockResponse.data)
  })

  test('propagates errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
    await expect(getUserAgreement()).rejects.toThrow('Network error')
  })
})

describe('getPrivacyPolicy', () => {
  test('calls api.get with correct endpoint and returns data', async () => {
    const mockResponse = {
      data: { success: true, message: 'ok', data: '# Privacy' },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const result = await getPrivacyPolicy()

    expect(api.get).toHaveBeenCalledWith('/api/privacy-policy')
    expect(result).toEqual(mockResponse.data)
  })

  test('propagates errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Timeout'))
    await expect(getPrivacyPolicy()).rejects.toThrow('Timeout')
  })
})
