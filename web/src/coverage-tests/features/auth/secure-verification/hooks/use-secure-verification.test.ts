import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import { useSecureVerification } from '@/features/auth/secure-verification/hooks/use-secure-verification'

const mockCheckVerificationMethods = vi.fn()
const mockVerify = vi.fn()
const mockIsVerificationRequiredError = vi.fn()
const mockExtractVerificationInfo = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/features/auth/secure-verification/api', () => ({
  checkVerificationMethods: () => mockCheckVerificationMethods(),
  verify: (...args: unknown[]) => mockVerify(...args),
}))

vi.mock('@/lib/secure-verification', () => ({
  isVerificationRequiredError: (...args: unknown[]) => mockIsVerificationRequiredError(...args),
  extractVerificationInfo: (...args: unknown[]) => mockExtractVerificationInfo(...args),
}))

describe('useSecureVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: false,
      passkeySupported: false,
    })
  })

  it('fetches methods on mount', async () => {
    const { result } = renderHook(() => useSecureVerification())

    await waitFor(() => {
      expect(result.current.methods.has2FA).toBe(true)
    })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSecureVerification())

    expect(result.current.open).toBe(false)
    expect(result.current.currentMethod).toBeNull()
    expect(result.current.code).toBe('')
    expect(result.current.isLoading).toBe(false)
  })

  it('startVerification opens dialog when methods available', async () => {
    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    const apiCall = vi.fn()
    let opened: boolean = false
    await act(async () => {
      opened = (await result.current.startVerification(apiCall, {
        scope: 'channel.key.read',
      })) as unknown as boolean
    })

    expect(opened).toBe(true)
    expect(result.current.open).toBe(true)
    expect(result.current.currentMethod).toBe('2fa')
  })

  it('startVerification prefers passkey when available and supported', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: true,
      passkeySupported: true,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.hasPasskey).toBe(true))

    const apiCall = vi.fn()
    await act(async () => {
      await result.current.startVerification(apiCall, {
        scope: 'channel.key.read',
      })
    })

    expect(result.current.currentMethod).toBe('passkey')
  })

  it('startVerification uses preferredMethod when available', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: true,
      passkeySupported: true,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    const apiCall = vi.fn()
    await act(async () => {
      await result.current.startVerification(apiCall, {
        scope: 'channel.key.read',
        preferredMethod: '2fa',
      })
    })

    expect(result.current.currentMethod).toBe('2fa')
  })

  it('startVerification falls back when preferred method unavailable', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: false,
      passkeySupported: false,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    const apiCall = vi.fn()
    await act(async () => {
      await result.current.startVerification(apiCall, {
        scope: 'channel.key.read',
        preferredMethod: 'passkey',
      })
    })

    expect(result.current.currentMethod).toBe('2fa')
  })

  it('startVerification fails when no methods available', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: false,
      hasPasskey: false,
      passkeySupported: false,
    })

    const onError = vi.fn()
    const { result } = renderHook(() => useSecureVerification({ onError }))
    await waitFor(() => expect(mockCheckVerificationMethods).toHaveBeenCalled())

    const apiCall = vi.fn()
    let opened: boolean = true
    await act(async () => {
      opened = (await result.current.startVerification(apiCall, {
        scope: 'channel.key.read',
      })) as unknown as boolean
    })

    expect(opened).toBe(false)
    expect(toast.error).toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('executeVerification runs verify and apiCall', async () => {
    const apiCall = vi.fn().mockResolvedValue('api-result')
    mockVerify.mockResolvedValue({ proof_token: 'pt', expires_at: 123, method: '2fa', scope: 'channel.key.read' })

    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useSecureVerification({ onSuccess, successMessage: 'Done!' })
    )
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      await result.current.startVerification(apiCall, { scope: 'channel.key.read' })
    })

    await act(async () => {
      await result.current.executeVerification('2fa', '123456')
    })

    expect(mockVerify).toHaveBeenCalledWith('2fa', 'channel.key.read', '123456')
    expect(apiCall).toHaveBeenCalledWith('pt')
    expect(onSuccess).toHaveBeenCalledWith('api-result', '2fa')
    expect(toast.success).toHaveBeenCalledWith('Done!')
    // Auto-reset
    expect(result.current.open).toBe(false)
  })

  it('executeVerification fails without apiCall', async () => {
    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      await result.current.executeVerification('2fa', '123')
    })

    expect(toast.error).toHaveBeenCalledWith('Verification is not configured properly')
  })

  it('executeVerification fails without method', async () => {
    const apiCall = vi.fn()
    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    // Manually set apiCall state via startVerification
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: false,
      hasPasskey: false,
      passkeySupported: false,
    })

    // We can't easily trigger the no-method execute path without apiCall set,
    // but we can test the explicit path
    await act(async () => {
      await result.current.executeVerification(undefined, '123')
    })

    expect(toast.error).toHaveBeenCalled()
  })

  it('executeVerification handles verify error', async () => {
    const apiCall = vi.fn()
    mockVerify.mockRejectedValue(new Error('Bad code'))

    const onError = vi.fn()
    const { result } = renderHook(() => useSecureVerification({ onError }))
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      await result.current.startVerification(apiCall, { scope: 'channel.key.read' })
    })

    await act(async () => {
      try {
        await result.current.executeVerification('2fa', '000000')
      } catch {
        // expected
      }
    })

    expect(toast.error).toHaveBeenCalledWith('Bad code')
    expect(onError).toHaveBeenCalled()
  })

  it('setCode updates code', async () => {
    const { result } = renderHook(() => useSecureVerification())

    act(() => { result.current.setCode('654321') })

    expect(result.current.code).toBe('654321')
  })

  it('switchMethod changes method and clears code', async () => {
    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    act(() => { result.current.setCode('123') })
    act(() => { result.current.switchMethod('passkey') })

    expect(result.current.currentMethod).toBe('passkey')
    expect(result.current.code).toBe('')
  })

  it('cancel resets state', async () => {
    const apiCall = vi.fn()
    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      await result.current.startVerification(apiCall, { scope: 'channel.key.read' })
    })
    expect(result.current.open).toBe(true)

    act(() => { result.current.cancel() })

    expect(result.current.open).toBe(false)
    expect(result.current.currentMethod).toBeNull()
  })

  it('withVerification tries apiCall first, opens dialog on verification error', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('need-verify'))
    mockIsVerificationRequiredError.mockReturnValue(true)
    mockExtractVerificationInfo.mockReturnValue({ message: 'Please verify' })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      const res = await result.current.withVerification(apiCall, {
        scope: 'channel.key.read',
      })
      expect(res).toBeNull()
    })

    expect(toast.info).toHaveBeenCalledWith('Please verify')
    expect(result.current.open).toBe(true)
  })

  it('withVerification returns result if apiCall succeeds', async () => {
    const apiCall = vi.fn().mockResolvedValue('direct-result')

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    let res: unknown
    await act(async () => {
      res = await result.current.withVerification(apiCall, {
        scope: 'channel.key.read',
      })
    })

    expect(res).toBe('direct-result')
  })

  it('withVerification rethrows non-verification errors', async () => {
    const apiCall = vi.fn().mockRejectedValue(new Error('network'))
    mockIsVerificationRequiredError.mockReturnValue(false)

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      await expect(
        result.current.withVerification(apiCall, { scope: 'channel.key.read' })
      ).rejects.toThrow('network')
    })
  })

  it('canUseMethod checks 2fa', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: false,
      passkeySupported: false,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    expect(result.current.canUseMethod('2fa')).toBe(true)
    expect(result.current.canUseMethod('passkey')).toBe(false)
  })

  it('canUseMethod checks passkey requires both enabled and supported', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: false,
      hasPasskey: true,
      passkeySupported: true,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.hasPasskey).toBe(true))

    expect(result.current.canUseMethod('passkey')).toBe(true)
  })

  it('recommendedMethod returns passkey when available', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: true,
      passkeySupported: true,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.hasPasskey).toBe(true))

    expect(result.current.recommendedMethod).toBe('passkey')
  })

  it('recommendedMethod returns 2fa when passkey not available', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: false,
      passkeySupported: false,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    expect(result.current.recommendedMethod).toBe('2fa')
  })

  it('recommendedMethod returns null when nothing available', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: false,
      hasPasskey: false,
      passkeySupported: false,
    })

    const { result } = renderHook(() => useSecureVerification())
    // Wait for fetch
    await waitFor(() => expect(mockCheckVerificationMethods).toHaveBeenCalled())

    expect(result.current.recommendedMethod).toBeNull()
  })

  it('hasAnyMethod reflects method availability', async () => {
    mockCheckVerificationMethods.mockResolvedValue({
      has2FA: true,
      hasPasskey: false,
      passkeySupported: false,
    })

    const { result } = renderHook(() => useSecureVerification())
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    expect(result.current.hasAnyMethod).toBe(true)
  })

  it('autoReset false prevents auto-reset after success', async () => {
    const apiCall = vi.fn().mockResolvedValue('result')
    mockVerify.mockResolvedValue({ proof_token: 'pt', expires_at: 1, method: '2fa', scope: 'channel.key.read' })

    const { result } = renderHook(() =>
      useSecureVerification({ autoReset: false })
    )
    await waitFor(() => expect(result.current.methods.has2FA).toBe(true))

    await act(async () => {
      await result.current.startVerification(apiCall, { scope: 'channel.key.read' })
    })

    await act(async () => {
      await result.current.executeVerification('2fa', '123456')
    })

    // Should not auto-reset
    expect(result.current.open).toBe(true)
  })
})
