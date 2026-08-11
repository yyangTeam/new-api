import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  getUserProfile,
  updateUserProfile,
  updateUserSettings,
  updateUserLanguage,
  deleteUserAccount,
  generateAccessToken,
  sendEmailVerification,
  bindEmail,
  bindWeChat,
  startTelegramBind,
  getLoginSessions,
  revokeLoginSession,
  revokeOtherLoginSessions,
  getSelfOAuthBindings,
  unbindCustomOAuth,
  getCheckinStatus,
  performCheckin,
} from '@/features/profile/api'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

describe('profile api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserProfile', () => {
    it('fetches user profile', async () => {
      const data = { success: true, data: { id: 1, username: 'test' } }
      mockGet.mockResolvedValue({ data })

      const result = await getUserProfile()

      expect(mockGet).toHaveBeenCalledWith('/api/user/self')
      expect(result).toEqual(data)
    })
  })

  describe('updateUserProfile', () => {
    it('updates profile without password', async () => {
      const data = { success: true }
      mockPut.mockResolvedValue({ data })

      const result = await updateUserProfile({ display_name: 'New Name' })

      expect(mockPut).toHaveBeenCalledWith(
        '/api/user/self',
        { display_name: 'New Name' },
        { acceptAuthRotation: false }
      )
      expect(result).toEqual(data)
    })

    it('updates profile with password sets acceptAuthRotation', async () => {
      const data = { success: true }
      mockPut.mockResolvedValue({ data })

      await updateUserProfile({ password: 'newpass', original_password: 'old' })

      expect(mockPut).toHaveBeenCalledWith(
        '/api/user/self',
        { password: 'newpass', original_password: 'old' },
        { acceptAuthRotation: true }
      )
    })
  })

  describe('updateUserSettings', () => {
    it('updates settings', async () => {
      const data = { success: true }
      mockPut.mockResolvedValue({ data })

      const result = await updateUserSettings({ notify_type: 'email' })

      expect(mockPut).toHaveBeenCalledWith('/api/user/setting', { notify_type: 'email' })
      expect(result).toEqual(data)
    })
  })

  describe('updateUserLanguage', () => {
    it('updates language', async () => {
      const data = { success: true }
      mockPut.mockResolvedValue({ data })

      const result = await updateUserLanguage('zh')

      expect(mockPut).toHaveBeenCalledWith('/api/user/self', { language: 'zh' })
      expect(result).toEqual(data)
    })
  })

  describe('deleteUserAccount', () => {
    it('deletes account without password', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      const result = await deleteUserAccount()

      expect(mockDelete).toHaveBeenCalledWith('/api/user/self', { data: undefined })
      expect(result).toEqual(data)
    })

    it('deletes account with password', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      await deleteUserAccount({ password: 'mypass' })

      expect(mockDelete).toHaveBeenCalledWith('/api/user/self', { data: { password: 'mypass' } })
    })
  })

  describe('generateAccessToken', () => {
    it('generates token', async () => {
      const data = { success: true, data: 'sk-abc123' }
      mockGet.mockResolvedValue({ data })

      const result = await generateAccessToken()

      expect(mockGet).toHaveBeenCalledWith('/api/user/token')
      expect(result).toEqual(data)
    })
  })

  describe('sendEmailVerification', () => {
    it('sends verification without turnstile', async () => {
      const data = { success: true }
      mockGet.mockResolvedValue({ data })

      const result = await sendEmailVerification('test@example.com')

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/api/verification?email=test%40example.com')
      )
      expect(result).toEqual(data)
    })

    it('sends verification with turnstile token', async () => {
      const data = { success: true }
      mockGet.mockResolvedValue({ data })

      await sendEmailVerification('test@example.com', 'turnstile-token')

      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('turnstile=turnstile-token')
      )
    })
  })

  describe('bindEmail', () => {
    it('binds email', async () => {
      const data = { success: true }
      mockPost.mockResolvedValue({ data })

      const result = await bindEmail('test@example.com', '123456')

      expect(mockPost).toHaveBeenCalledWith('/api/oauth/email/bind', {
        email: 'test@example.com',
        code: '123456',
      })
      expect(result).toEqual(data)
    })
  })

  describe('bindWeChat', () => {
    it('binds wechat', async () => {
      const data = { success: true }
      mockPost.mockResolvedValue({ data })

      const result = await bindWeChat('wechat-code')

      expect(mockPost).toHaveBeenCalledWith(
        '/api/oauth/wechat/bind',
        { code: 'wechat-code' },
        { skipBusinessError: true, skipErrorHandler: true }
      )
      expect(result).toEqual(data)
    })
  })

  describe('startTelegramBind', () => {
    it('starts telegram bind flow', async () => {
      const data = { success: true, data: { flow_token: 'ft', callback_url: 'url', expires_at: 123 } }
      mockPost.mockResolvedValue({ data })

      const result = await startTelegramBind()

      expect(mockPost).toHaveBeenCalledWith('/api/oauth/telegram/bind/start')
      expect(result).toEqual(data)
    })
  })

  describe('getLoginSessions', () => {
    it('gets login sessions', async () => {
      const data = { success: true, data: [] }
      mockGet.mockResolvedValue({ data })

      const result = await getLoginSessions()

      expect(mockGet).toHaveBeenCalledWith('/api/user/sessions')
      expect(result).toEqual(data)
    })
  })

  describe('revokeLoginSession', () => {
    it('revokes session by id', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      const result = await revokeLoginSession('session-123')

      expect(mockDelete).toHaveBeenCalledWith('/api/user/sessions/session-123')
      expect(result).toEqual(data)
    })

    it('encodes special characters in session id', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      await revokeLoginSession('id/with/slashes')

      expect(mockDelete).toHaveBeenCalledWith('/api/user/sessions/id%2Fwith%2Fslashes')
    })
  })

  describe('revokeOtherLoginSessions', () => {
    it('revokes other sessions', async () => {
      const data = { success: true }
      mockPost.mockResolvedValue({ data })

      const result = await revokeOtherLoginSessions()

      expect(mockPost).toHaveBeenCalledWith('/api/user/sessions/revoke-others')
      expect(result).toEqual(data)
    })
  })

  describe('getSelfOAuthBindings', () => {
    it('gets oauth bindings', async () => {
      const data = { success: true, data: [{ provider_id: 'github', provider_name: 'GitHub' }] }
      mockGet.mockResolvedValue({ data })

      const result = await getSelfOAuthBindings()

      expect(mockGet).toHaveBeenCalledWith('/api/user/oauth/bindings')
      expect(result).toEqual(data)
    })
  })

  describe('unbindCustomOAuth', () => {
    it('unbinds custom oauth', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      const result = await unbindCustomOAuth('github')

      expect(mockDelete).toHaveBeenCalledWith('/api/user/oauth/bindings/github')
      expect(result).toEqual(data)
    })
  })

  describe('getCheckinStatus', () => {
    it('gets checkin status for month', async () => {
      const data = { success: true, data: { enabled: true, stats: {} } }
      mockGet.mockResolvedValue({ data })

      const result = await getCheckinStatus('2024-01')

      expect(mockGet).toHaveBeenCalledWith('/api/user/checkin?month=2024-01')
      expect(result).toEqual(data)
    })
  })

  describe('performCheckin', () => {
    it('performs checkin without turnstile', async () => {
      const data = { success: true, data: { quota_awarded: 100 } }
      mockPost.mockResolvedValue({ data })

      const result = await performCheckin()

      expect(mockPost).toHaveBeenCalledWith('/api/user/checkin')
      expect(result).toEqual(data)
    })

    it('performs checkin with turnstile token', async () => {
      const data = { success: true, data: { quota_awarded: 100 } }
      mockPost.mockResolvedValue({ data })

      await performCheckin('token123')

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/checkin?turnstile=token123'
      )
    })
  })
})
