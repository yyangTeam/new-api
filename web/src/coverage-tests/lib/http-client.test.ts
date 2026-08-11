import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth-session', () => ({
  applyAuthRotation: vi.fn(),
  clearAuthentication: vi.fn(),
  refreshAuthentication: vi.fn(),
}))

vi.mock('@/lib/server-error-message', () => ({
  getServerErrorMessageKey: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({
      auth: { accessToken: 'test-token', session: { sid: 'session-1' } },
    })),
  },
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

describe('http-client', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('exports api instance', async () => {
    const { api } = await import('@/lib/http-client')
    expect(api).toBeDefined()
    expect(typeof api.get).toBe('function')
    expect(typeof api.post).toBe('function')
    expect(typeof api.put).toBe('function')
    expect(typeof api.delete).toBe('function')
  })

  it('api has baseURL set to empty string', async () => {
    const { api } = await import('@/lib/http-client')
    expect(api.defaults.baseURL).toBe('')
  })

  it('api has withCredentials set to true', async () => {
    const { api } = await import('@/lib/http-client')
    expect(api.defaults.withCredentials).toBe(true)
  })

  it('api has Cache-Control no-store header', async () => {
    const { api } = await import('@/lib/http-client')
    expect(api.defaults.headers['Cache-Control']).toBe('no-store')
  })
})
