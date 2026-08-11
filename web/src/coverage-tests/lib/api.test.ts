import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('@/lib/http-client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

vi.mock('@/lib/auth-session', () => ({
  applyAuthBundle: vi.fn(),
  applyAuthRotation: vi.fn(),
  bootstrapAuthentication: vi.fn(),
  clearAuthenticatedClientState: vi.fn(),
  clearAuthentication: vi.fn(),
  getCommonHeaders: vi.fn(),
  getFreshAuthHeaders: vi.fn(),
  isAuthBundle: vi.fn(),
  refreshAuthentication: vi.fn(),
  AuthRotationError: class extends Error {},
}))

import {
  getSelf,
  getUserModels,
  getUserGroups,
  getStatus,
  getNotice,
  get2FAStatus,
  setup2FA,
  enable2FA,
  disable2FA,
  regenerate2FABackupCodes,
} from '@/lib/api'

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSelf', () => {
    it('calls GET /api/user/self with skipErrorHandler', async () => {
      mockGet.mockResolvedValue({ data: { id: 1, username: 'test' } })
      const result = await getSelf()
      expect(mockGet).toHaveBeenCalledWith('/api/user/self', { skipErrorHandler: true })
      expect(result).toEqual({ id: 1, username: 'test' })
    })
  })

  describe('getUserModels', () => {
    it('calls GET /api/user/models', async () => {
      mockGet.mockResolvedValue({ data: { success: true, data: ['gpt-4'] } })
      const result = await getUserModels()
      expect(mockGet).toHaveBeenCalledWith('/api/user/models')
      expect(result).toEqual({ success: true, data: ['gpt-4'] })
    })
  })

  describe('getUserGroups', () => {
    it('calls GET /api/user/self/groups', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: { default: { desc: 'Default', ratio: 1 } } },
      })
      const result = await getUserGroups()
      expect(mockGet).toHaveBeenCalledWith('/api/user/self/groups')
      expect(result.success).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('calls GET /api/status and extracts data.data', async () => {
      mockGet.mockResolvedValue({
        data: { data: { system_name: 'Test' } },
      })
      const result = await getStatus()
      expect(mockGet).toHaveBeenCalledWith('/api/status')
      expect(result).toEqual({ system_name: 'Test' })
    })
  })

  describe('getNotice', () => {
    it('calls GET /api/notice', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: 'Hello' },
      })
      const result = await getNotice()
      expect(mockGet).toHaveBeenCalledWith('/api/notice')
      expect(result).toEqual({ success: true, data: 'Hello' })
    })
  })

  describe('get2FAStatus', () => {
    it('calls GET /api/user/2fa/status', async () => {
      mockGet.mockResolvedValue({ data: { enabled: true } })
      const result = await get2FAStatus()
      expect(mockGet).toHaveBeenCalledWith('/api/user/2fa/status')
      expect(result).toEqual({ enabled: true })
    })
  })

  describe('setup2FA', () => {
    it('calls POST /api/user/2fa/setup', async () => {
      mockPost.mockResolvedValue({ data: { qr: 'data:...' } })
      const result = await setup2FA()
      expect(mockPost).toHaveBeenCalledWith('/api/user/2fa/setup')
      expect(result).toEqual({ qr: 'data:...' })
    })
  })

  describe('enable2FA', () => {
    it('calls POST /api/user/2fa/enable with code and acceptAuthRotation', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })
      const result = await enable2FA('123456')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/2fa/enable',
        { code: '123456' },
        { acceptAuthRotation: true }
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('disable2FA', () => {
    it('calls POST /api/user/2fa/disable with code and acceptAuthRotation', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })
      const result = await disable2FA('654321')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/2fa/disable',
        { code: '654321' },
        { acceptAuthRotation: true }
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('regenerate2FABackupCodes', () => {
    it('calls POST /api/user/2fa/backup_codes with code', async () => {
      mockPost.mockResolvedValue({ data: { codes: ['abc', 'def'] } })
      const result = await regenerate2FABackupCodes('111111')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/2fa/backup_codes',
        { code: '111111' },
        { acceptAuthRotation: true }
      )
      expect(result).toEqual({ codes: ['abc', 'def'] })
    })
  })
})
