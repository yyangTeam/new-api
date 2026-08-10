import { describe, it, expect, vi, beforeEach } from 'vitest'

import { checkVerificationMethods, verify } from './api'

const mockGet2FAStatus = vi.fn()
const mockGetPasskeyStatus = vi.fn()
const mockDetectPasskeySupport = vi.fn()
const mockPost = vi.fn()
const mockBeginPasskeyVerification = vi.fn()
const mockFinishPasskeyVerification = vi.fn()
const mockPrepareCredentialRequestOptions = vi.fn()
const mockBuildAssertionResult = vi.fn()

vi.mock('i18next', () => ({
  default: { t: (key: string, opts?: Record<string, unknown>) => opts ? `${key} ${JSON.stringify(opts)}` : key },
}))

vi.mock('@/lib/api', () => ({
  get2FAStatus: () => mockGet2FAStatus(),
  api: { post: (...args: unknown[]) => mockPost(...args) },
}))

vi.mock('@/lib/passkey', () => ({
  isPasskeySupported: () => mockDetectPasskeySupport(),
  prepareCredentialRequestOptions: (...args: unknown[]) => mockPrepareCredentialRequestOptions(...args),
  buildAssertionResult: (...args: unknown[]) => mockBuildAssertionResult(...args),
}))

vi.mock('../passkey', () => ({
  getPasskeyStatus: () => mockGetPasskeyStatus(),
  beginPasskeyVerification: (...args: unknown[]) => mockBeginPasskeyVerification(...args),
  finishPasskeyVerification: (...args: unknown[]) => mockFinishPasskeyVerification(...args),
}))

describe('secure-verification api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkVerificationMethods', () => {
    it('returns available methods', async () => {
      mockGet2FAStatus.mockResolvedValue({ success: true, data: { enabled: true } })
      mockGetPasskeyStatus.mockResolvedValue({ success: true, data: { enabled: true } })
      mockDetectPasskeySupport.mockResolvedValue(true)

      const result = await checkVerificationMethods()

      expect(result).toEqual({
        has2FA: true,
        hasPasskey: true,
        passkeySupported: true,
      })
    })

    it('returns false for all when 2FA and passkey disabled', async () => {
      mockGet2FAStatus.mockResolvedValue({ success: true, data: { enabled: false } })
      mockGetPasskeyStatus.mockResolvedValue({ success: true, data: { enabled: false } })
      mockDetectPasskeySupport.mockResolvedValue(false)

      const result = await checkVerificationMethods()

      expect(result).toEqual({
        has2FA: false,
        hasPasskey: false,
        passkeySupported: false,
      })
    })

    it('handles errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockGet2FAStatus.mockRejectedValue(new Error('fail'))
      mockGetPasskeyStatus.mockRejectedValue(new Error('fail'))
      mockDetectPasskeySupport.mockRejectedValue(new Error('fail'))

      const result = await checkVerificationMethods()

      expect(result).toEqual({
        has2FA: false,
        hasPasskey: false,
        passkeySupported: false,
      })
      consoleSpy.mockRestore()
    })

    it('handles null response data', async () => {
      mockGet2FAStatus.mockResolvedValue({ success: false })
      mockGetPasskeyStatus.mockResolvedValue({ success: false })
      mockDetectPasskeySupport.mockResolvedValue(true)

      const result = await checkVerificationMethods()

      expect(result).toEqual({
        has2FA: false,
        hasPasskey: false,
        passkeySupported: true,
      })
    })
  })

  describe('verify', () => {
    describe('2fa method', () => {
      it('verifies 2FA code successfully', async () => {
        mockPost.mockResolvedValue({
          data: {
            success: true,
            data: { proof_token: 'pt-1', expires_at: 1000, method: '2fa', scope: 'channel.key.read' },
          },
        })

        const result = await verify('2fa', 'channel.key.read', '123456')

        expect(mockPost).toHaveBeenCalledWith(
          '/api/verify',
          { method: '2fa', code: '123456', scope: 'channel.key.read' },
        )
        expect(result.proof_token).toBe('pt-1')
      })

      it('throws when code is empty', async () => {
        await expect(verify('2fa', 'channel.key.read', '')).rejects.toThrow(
          'Please enter the verification code or backup code'
        )
      })

      it('throws when code is undefined', async () => {
        await expect(verify('2fa', 'channel.key.read', undefined)).rejects.toThrow(
          'Please enter the verification code or backup code'
        )
      })

      it('throws when code is only whitespace', async () => {
        await expect(verify('2fa', 'channel.key.read', '   ')).rejects.toThrow(
          'Please enter the verification code or backup code'
        )
      })

      it('throws when response is not successful', async () => {
        mockPost.mockResolvedValue({
          data: { success: false, message: 'Invalid code' },
        })

        await expect(verify('2fa', 'channel.key.read', '123456')).rejects.toThrow(
          'Invalid code'
        )
      })

      it('throws when response has no proof token', async () => {
        mockPost.mockResolvedValue({
          data: { success: true, data: {} },
        })

        await expect(verify('2fa', 'channel.key.read', '123456')).rejects.toThrow(
          'Verification proof was not returned'
        )
      })

      it('trims code before sending', async () => {
        mockPost.mockResolvedValue({
          data: {
            success: true,
            data: { proof_token: 'pt', expires_at: 1, method: '2fa', scope: 'channel.key.read' },
          },
        })

        await verify('2fa', 'channel.key.read', '  123456  ')

        expect(mockPost).toHaveBeenCalledWith(
          '/api/verify',
          expect.objectContaining({ code: '123456' }),
        )
      })
    })

    describe('passkey method', () => {
      beforeEach(() => {
        Object.defineProperty(globalThis, 'navigator', {
          value: { credentials: { get: vi.fn() } },
          writable: true,
          configurable: true,
        })
      })

      it('verifies passkey successfully', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: { challenge: 'abc' }, flow_token: 'ft-v' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({ challenge: 'abc' })
        const credential = { id: 'c1', type: 'public-key', response: {} }
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockResolvedValue(credential)
        mockBuildAssertionResult.mockReturnValue({ assertion: 'data' })
        mockFinishPasskeyVerification.mockResolvedValue({
          success: true,
          data: { proof_token: 'pt-pk', expires_at: 2000, method: 'passkey', scope: 'channel.key.read' },
        })

        const result = await verify('passkey', 'channel.key.read')

        expect(result.proof_token).toBe('pt-pk')
      })

      it('throws when begin returns failure', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: false,
          message: 'Server busy',
        })

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow('Server busy')
      })

      it('throws when flow token missing', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: undefined },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Verification flow expired'
        )
      })

      it('throws when credential is null', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: 'ft' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Passkey verification was cancelled'
        )
      })

      it('throws when assertion is null', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: 'ft' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'x' })
        mockBuildAssertionResult.mockReturnValue(null)

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Unable to build Passkey assertion'
        )
      })

      it('throws when finish returns failure', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: 'ft' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'x' })
        mockBuildAssertionResult.mockReturnValue({ data: 'ok' })
        mockFinishPasskeyVerification.mockResolvedValue({
          success: false,
          message: 'Invalid assertion',
        })

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Invalid assertion'
        )
      })

      it('throws when finish has no proof token', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: 'ft' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'x' })
        mockBuildAssertionResult.mockReturnValue({ data: 'ok' })
        mockFinishPasskeyVerification.mockResolvedValue({
          success: true,
          data: {},
        })

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Verification proof was not returned'
        )
      })

      it('handles NotAllowedError', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: 'ft' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockRejectedValue(
          new DOMException('denied', 'NotAllowedError')
        )

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Passkey verification was cancelled or timed out'
        )
      })

      it('handles InvalidStateError', async () => {
        mockBeginPasskeyVerification.mockResolvedValue({
          success: true,
          data: { options: {}, flow_token: 'ft' },
        })
        mockPrepareCredentialRequestOptions.mockReturnValue({})
        ;(navigator.credentials.get as ReturnType<typeof vi.fn>).mockRejectedValue(
          new DOMException('bad', 'InvalidStateError')
        )

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Passkey verification is not available in the current state'
        )
      })

      it('throws when navigator.credentials unavailable', async () => {
        Object.defineProperty(globalThis, 'navigator', {
          value: { credentials: undefined },
          writable: true,
          configurable: true,
        })

        await expect(verify('passkey', 'channel.key.read')).rejects.toThrow(
          'Passkey verification is not supported in this environment'
        )
      })
    })

    describe('unsupported method', () => {
      it('throws for unknown method', async () => {
        await expect(verify('unknown' as any, 'channel.key.read')).rejects.toThrow(
          'Unsupported verification method'
        )
      })
    })
  })
})
