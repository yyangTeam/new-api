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
} from './api'

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
    it('calls begin registration without proof token', async () => {
      const data = { success: true, data: { flow_token: 'ft1' } }
      mockPost.mockResolvedValue({ data })

      const result = await beginPasskeyRegistration()

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/register/begin',
        undefined,
        { headers: undefined }
      )
      expect(result).toEqual(data)
    })

    it('calls begin registration with proof token', async () => {
      const data = { success: true, data: { flow_token: 'ft2' } }
      mockPost.mockResolvedValue({ data })

      await beginPasskeyRegistration('proof-abc')

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/register/begin',
        undefined,
        { headers: { 'X-Security-Proof': 'proof-abc' } }
      )
    })
  })

  describe('finishPasskeyRegistration', () => {
    it('sends flow token and credential', async () => {
      const data = { success: true }
      mockPost.mockResolvedValue({ data })

      const payload = { id: 'cred-1', type: 'public-key' }
      const result = await finishPasskeyRegistration('flow-1', payload, 'proof-1')

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/register/finish',
        { flow_token: 'flow-1', credential: payload },
        { headers: { 'X-Security-Proof': 'proof-1' }, acceptAuthRotation: true }
      )
      expect(result).toEqual(data)
    })

    it('sends without proof token', async () => {
      const data = { success: true }
      mockPost.mockResolvedValue({ data })

      await finishPasskeyRegistration('flow-1', { id: 'x' })

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/register/finish',
        expect.any(Object),
        { headers: undefined, acceptAuthRotation: true }
      )
    })
  })

  describe('deletePasskey', () => {
    it('deletes passkey with proof token', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      const result = await deletePasskey('proof-x')

      expect(mockDelete).toHaveBeenCalledWith('/api/user/passkey', {
        headers: { 'X-Security-Proof': 'proof-x' },
        acceptAuthRotation: true,
      })
      expect(result).toEqual(data)
    })

    it('deletes passkey without proof token', async () => {
      const data = { success: true }
      mockDelete.mockResolvedValue({ data })

      await deletePasskey()

      expect(mockDelete).toHaveBeenCalledWith('/api/user/passkey', {
        headers: undefined,
        acceptAuthRotation: true,
      })
    })
  })

  describe('beginPasskeyLogin', () => {
    it('calls login begin', async () => {
      const data = { success: true, data: { flow_token: 'login-ft' } }
      mockPost.mockResolvedValue({ data })

      const result = await beginPasskeyLogin()

      expect(mockPost).toHaveBeenCalledWith('/api/user/passkey/login/begin')
      expect(result).toEqual(data)
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
        { skipAuthRefresh: true }
      )
      expect(result).toEqual(data)
    })
  })

  describe('beginPasskeyVerification', () => {
    it('sends verification begin with scope', async () => {
      const data = { success: true, data: { flow_token: 'verify-ft' } }
      mockPost.mockResolvedValue({ data })

      const result = await beginPasskeyVerification('channel.key.read')

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/verify/begin',
        { scope: 'channel.key.read' }
      )
      expect(result).toEqual(data)
    })
  })

  describe('finishPasskeyVerification', () => {
    it('sends verification finish', async () => {
      const data = { success: true, data: { proof_token: 'pt', expires_at: 123 } }
      mockPost.mockResolvedValue({ data })

      const result = await finishPasskeyVerification('flow-v', { id: 'cred' })

      expect(mockPost).toHaveBeenCalledWith(
        '/api/user/passkey/verify/finish',
        { flow_token: 'flow-v', credential: { id: 'cred' } }
      )
      expect(result).toEqual(data)
    })
  })
})
