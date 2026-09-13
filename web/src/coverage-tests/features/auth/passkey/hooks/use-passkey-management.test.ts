import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { usePasskeyManagement } from '@/features/auth/passkey/hooks/use-passkey-management'

const mockGetPasskeyStatus = vi.fn()
const mockBeginPasskeyRegistration = vi.fn()
const mockFinishPasskeyRegistration = vi.fn()
const mockDeletePasskey = vi.fn()
const mockIsPasskeySupported = vi.fn()
const mockPrepareCredentialCreationOptions = vi.fn()
const mockCreateCredential = vi.fn()
const mockBuildRegistrationResult = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/features/auth/passkey/api', () => ({
  getPasskeyStatus: () => mockGetPasskeyStatus(),
  beginPasskeyRegistration: (...args: unknown[]) => mockBeginPasskeyRegistration(...args),
  finishPasskeyRegistration: (...args: unknown[]) => mockFinishPasskeyRegistration(...args),
  deletePasskey: (...args: unknown[]) => mockDeletePasskey(...args),
}))

vi.mock('@/lib/passkey', () => ({
  isPasskeySupported: () => mockIsPasskeySupported(),
  prepareCredentialCreationOptions: (...args: unknown[]) => mockPrepareCredentialCreationOptions(...args),
  createCredential: (...args: unknown[]) => mockCreateCredential(...args),
  buildRegistrationResult: (...args: unknown[]) => mockBuildRegistrationResult(...args),
}))

describe('usePasskeyManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPasskeyStatus.mockResolvedValue({
      success: true,
      data: { enabled: false, last_used_at: null },
    })
    mockIsPasskeySupported.mockResolvedValue(true)
    Object.defineProperty(globalThis, 'navigator', {
      value: { credentials: { create: vi.fn(), get: vi.fn() } },
      writable: true,
      configurable: true,
    })
  })

  it('fetches status on mount', async () => {
    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toEqual({ enabled: false, last_used_at: null })
    expect(result.current.enabled).toBe(false)
    expect(result.current.lastUsed).toBeNull()
  })

  it('checks passkey support on mount', async () => {
    mockIsPasskeySupported.mockResolvedValue(true)

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.supported).toBe(true)
    })
  })

  it('handles passkey support detection failure', async () => {
    mockIsPasskeySupported.mockRejectedValue(new Error('unsupported'))

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.supported).toBe(false)
  })

  it('handles status fetch failure', async () => {
    mockGetPasskeyStatus.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toBeNull()
    expect(result.current.statusError).toBe('Network')
  })

  it('handles status fetch with success false', async () => {
    mockGetPasskeyStatus.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
    })

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toBeNull()
    expect(result.current.statusError).toBe('Unauthorized')
  })

  it('register throws when not supported', async () => {
    mockIsPasskeySupported.mockResolvedValue(false)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'This device does not support Passkey'
      )
    })
  })

  it('register succeeds through full flow', async () => {
    const credential = { id: 'cred-id', type: 'public-key' }
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: { challenge: 'abc' },
      flow_token: 'ft-1',
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({ publicKey: {} })
    mockCreateCredential.mockResolvedValue(credential)
    mockBuildRegistrationResult.mockReturnValue({ attestation: 'data' })
    mockFinishPasskeyRegistration.mockResolvedValue(undefined)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await result.current.register('proof-token')
    })

    expect(mockBeginPasskeyRegistration).toHaveBeenCalledWith(
      'proof-token',
      expect.any(AbortSignal)
    )
  })

  it('register throws on begin failure', async () => {
    mockBeginPasskeyRegistration.mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Server error'
      )
    })
  })

  it('register throws on missing flow token', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: {},
      flow_token: undefined,
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Registration flow expired. Please try again.'
      )
    })
  })

  it('register throws when credential creation returns null', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: {},
      flow_token: 'ft',
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockResolvedValue(null)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Passkey registration was cancelled'
      )
    })
  })

  it('register throws on invalid attestation', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: {},
      flow_token: 'ft',
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockResolvedValue({ id: 'x' })
    mockBuildRegistrationResult.mockReturnValue(null)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Invalid Passkey registration response'
      )
    })
  })

  it('register throws on finish failure', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: {},
      flow_token: 'ft',
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockResolvedValue({ id: 'x' })
    mockBuildRegistrationResult.mockReturnValue({ data: 'ok' })
    mockFinishPasskeyRegistration.mockRejectedValue(new Error('Bad credential'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Bad credential'
      )
    })
  })

  it('register throws AUTH_CANCELLED on NotAllowedError', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: {},
      flow_token: 'ft',
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockRejectedValue(
      new DOMException('User declined', 'NotAllowedError')
    )

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Passkey registration was cancelled'
      )
    })
  })

  it('register throws on generic error', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      options: {},
      flow_token: 'ft',
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockRejectedValue(new Error('Unexpected'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    await act(async () => {
      await expect(result.current.register('proof-token')).rejects.toThrow(
        'Unexpected'
      )
    })
  })

  it('remove succeeds', async () => {
    mockDeletePasskey.mockResolvedValue(undefined)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.remove('proof-del')
    })

    expect(mockDeletePasskey).toHaveBeenCalledWith(
      'proof-del',
      expect.any(AbortSignal)
    )
  })

  it('remove throws on failure', async () => {
    mockDeletePasskey.mockRejectedValue(new Error('Cannot remove'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.remove('proof-del')).rejects.toThrow(
        'Cannot remove'
      )
    })
  })

  it('remove throws on error', async () => {
    mockDeletePasskey.mockRejectedValue(new Error('err'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await expect(result.current.remove('proof-del')).rejects.toThrow('err')
    })
  })

  it('enabled and lastUsed derived from status', async () => {
    mockGetPasskeyStatus.mockResolvedValue({
      success: true,
      data: { enabled: true, last_used_at: '2024-01-01' },
    })

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.enabled).toBe(true)
    expect(result.current.lastUsed).toBe('2024-01-01')
  })
})
