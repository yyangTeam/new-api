import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  getPasskeyStatus,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  deletePasskey,
  beginPasskeyLogin,
  finishPasskeyLogin,
  beginPasskeyVerification,
  finishPasskeyVerification,
} from '@/features/auth/passkey/api'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

describe('passkey api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPasskeyStatus', () => {
    it('fetches passkey status', async () => {
      const data = { success: true, data: { enabled: true } }
      mockGet.mockResolvedValue({ data })

      const result = await getPasskeyStatus()

      expect(mockGet).toHaveBeenCalledWith('/api/user/passkey')
      expect(result).toEqual(data)
    })
  })

  describe('beginPasskeyRegistration', () => {
    it('sends proof token header and returns unwrapped data', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { flow_token: 'ft1' } },
      })

      const result = await beginPasskeyRegistration('proof-abc')

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/register/begin',
        undefined,
        expect.objectContaining({
          headers: { 'X-Security-Proof': 'proof-abc' },
        })
      )
      expect(result).toEqual({ flow_token: 'ft1' })
    })
  })

  describe('finishPasskeyRegistration', () => {
    it('sends flow token and credential', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: {} },
      })

      const payload = { id: 'cred-1', type: 'public-key' }
      const result = await finishPasskeyRegistration('flow-1', payload)

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/register/finish',
        { flow_token: 'flow-1', credential: payload },
        expect.objectContaining({
          acceptAuthRotation: true,
          singleUseAuthorization: true,
        })
      )
      expect(result).toEqual({})
    })
  })

  describe('deletePasskey', () => {
    it('deletes passkey with proof token', async () => {
      mockDelete.mockResolvedValue({
        data: { success: true, data: {} },
      })

      const result = await deletePasskey('proof-x')

      expect(mockDelete).toHaveBeenCalledWith(
        '/api/user/passkey',
        expect.objectContaining({
          headers: { 'X-Security-Proof': 'proof-x' },
          acceptAuthRotation: true,
        })
      )
      expect(result).toEqual({})
    })
  })

  describe('beginPasskeyLogin', () => {
    it('calls login begin', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { flow_token: 'login-ft' } },
      })

      const result = await beginPasskeyLogin()

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/login/begin',
        undefined,
        expect.objectContaining({
          skipAuthRefresh: true,
        })
      )
      expect(result).toEqual({ flow_token: 'login-ft' })
    })
  })

  describe('finishPasskeyLogin', () => {
    it('sends login finish', async () => {
      const data = { success: true }
      mockPost.mockResolvedValue({ data })

      const result = await finishPasskeyLogin('flow-login', { id: 'cred' })

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/login/finish',
        { flow_token: 'flow-login', credential: { id: 'cred' } },
        expect.objectContaining({ skipAuthRefresh: true })
      )
      expect(result).toEqual(data)
    })
  })

  describe('beginPasskeyVerification', () => {
    it('sends verification begin with operation', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, data: { flow_token: 'verify-ft' } },
      })

      const operation = {
        scope: 'channel.key.read' as const,
        context: { channel_id: 1 },
      }
      const result = await beginPasskeyVerification(operation)

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/verify/begin',
        { scope: 'channel.key.read', context: { channel_id: 1 } },
        expect.objectContaining({
          skipBusinessError: true,
          skipErrorHandler: true,
        })
      )
      expect(result).toEqual({ flow_token: 'verify-ft' })
    })
  })

  describe('finishPasskeyVerification', () => {
    it('sends verification finish', async () => {
      mockPost.mockResolvedValue({
        data: {
          success: true,
          data: { proof_token: 'pt', expires_at: 123 },
        },
      })

      const result = await finishPasskeyVerification('flow-v', { id: 'cred' })

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/verify/finish',
        { flow_token: 'flow-v', credential: { id: 'cred' } },
        expect.objectContaining({
          singleUseAuthorization: true,
        })
      )
      expect(result).toEqual({ proof_token: 'pt', expires_at: 123 })
    })
  })
})
