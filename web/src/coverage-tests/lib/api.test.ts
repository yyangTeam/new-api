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
  resolveAuthentication: vi.fn(),
  AuthRotationError: class extends Error {},
}))

import {
  getSelf,
  getUserModels,
  getUserGroups,
  getStatus,
  getNotice,
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
    it('calls GET /api/notice with Cache-Control override', async () => {
      mockGet.mockResolvedValue({
        data: { success: true, data: 'Hello' },
      })
      const result = await getNotice()
      expect(mockGet).toHaveBeenCalledWith('/api/notice', {
        headers: { 'Cache-Control': null },
      })
      expect(result).toEqual({ success: true, data: 'Hello' })
    })
  })

  describe('disable2FA', () => {
    it('calls POST /api/user/2fa/disable with proof token header', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { notification_warning: false } },
      })
      const result = await disable2FA('654321')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/2fa/disable',
        {},
        expect.objectContaining({
          headers: { 'X-Security-Proof': '654321' },
          acceptAuthRotation: true,
          singleUseAuthorization: true,
        })
      )
      expect(result).toEqual({ notification_warning: false })
    })
  })

  describe('regenerate2FABackupCodes', () => {
    it('calls POST /api/user/2fa/backup_codes with proof token header', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { backup_codes: ['abc', 'def'] } },
      })
      const result = await regenerate2FABackupCodes('111111')
      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/2fa/backup_codes',
        {},
        expect.objectContaining({
          headers: { 'X-Security-Proof': '111111' },
          acceptAuthRotation: true,
          singleUseAuthorization: true,
        })
      )
      expect(result).toEqual({ backup_codes: ['abc', 'def'] })
    })
  })
})
