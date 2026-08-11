import { buildSetupPayload, getSetupStatus, submitSetup } from '@/features/setup/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { api } from '@/lib/api'

describe('setup api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSetupStatus', () => {
    test('fetches setup status with cache-busting param', async () => {
      const mockData = { success: true, data: { status: false, root_init: false, database_type: 'sqlite' } }
      vi.mocked(api.get).mockResolvedValue({ data: mockData })

      const result = await getSetupStatus()

      expect(api.get).toHaveBeenCalledWith('/api/setup', {
        params: { t: expect.any(Number) },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('submitSetup', () => {
    test('posts setup payload', async () => {
      const mockData = { success: true }
      vi.mocked(api.post).mockResolvedValue({ data: mockData })

      const payload = { username: 'admin', password: 'test1234' }
      const result = await submitSetup(payload)

      expect(api.post).toHaveBeenCalledWith('/api/setup', payload)
      expect(result).toEqual(mockData)
    })
  })

  describe('buildSetupPayload', () => {
    const baseValues = {
      username: 'admin',
      password: 'password123',
      confirmPassword: 'password123',
      usageMode: 'external' as const,
    }

    test('includes credentials when root is not initialized', () => {
      const payload = buildSetupPayload(baseValues, false)
      expect(payload).toEqual({
        username: 'admin',
        password: 'password123',
        confirmPassword: 'password123',
        SelfUseModeEnabled: false,
        DemoSiteEnabled: false,
      })
    })

    test('excludes credentials when root is initialized', () => {
      const payload = buildSetupPayload(baseValues, true)
      expect(payload).toEqual({
        SelfUseModeEnabled: false,
        DemoSiteEnabled: false,
      })
      expect(payload).not.toHaveProperty('username')
      expect(payload).not.toHaveProperty('password')
    })

    test('sets SelfUseModeEnabled for self mode', () => {
      const values = { ...baseValues, usageMode: 'self' as const }
      const payload = buildSetupPayload(values, false)
      expect(payload.SelfUseModeEnabled).toBe(true)
      expect(payload.DemoSiteEnabled).toBe(false)
    })

    test('sets DemoSiteEnabled for demo mode', () => {
      const values = { ...baseValues, usageMode: 'demo' as const }
      const payload = buildSetupPayload(values, false)
      expect(payload.SelfUseModeEnabled).toBe(false)
      expect(payload.DemoSiteEnabled).toBe(true)
    })

    test('sets neither flag for external mode', () => {
      const payload = buildSetupPayload(baseValues, false)
      expect(payload.SelfUseModeEnabled).toBe(false)
      expect(payload.DemoSiteEnabled).toBe(false)
    })
  })
})
