import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import { usePasskeyManagement } from './use-passkey-management'

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

vi.mock('../api', () => ({
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
    // Ensure navigator.credentials is defined for register tests
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGetPasskeyStatus.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Failed to load Passkey status')
    consoleSpy.mockRestore()
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
    expect(toast.error).toHaveBeenCalledWith('Unauthorized')
  })

  it('calls onStatusChange callback', async () => {
    const onStatusChange = vi.fn()
    renderHook(() => usePasskeyManagement({ onStatusChange }))

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith({ enabled: false, last_used_at: null })
    })
  })

  it('register fails when not supported', async () => {
    mockIsPasskeySupported.mockResolvedValue(false)

    const { result } = renderHook(() => usePasskeyManagement())

    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('This device does not support Passkey')
  })

  it('register succeeds through full flow', async () => {
    const credential = { id: 'cred-id', type: 'public-key' }
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: { challenge: 'abc' }, flow_token: 'ft-1' },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({ publicKey: {} })
    mockCreateCredential.mockResolvedValue(credential)
    mockBuildRegistrationResult.mockReturnValue({ attestation: 'data' })
    mockFinishPasskeyRegistration.mockResolvedValue({ success: true })

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = false
    await act(async () => {
      success = await result.current.register('proof-token')
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Passkey registered successfully')
  })

  it('register handles begin failure', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: false,
      message: 'Server error',
    })

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Server error')
  })

  it('register handles missing flow token', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: {}, flow_token: undefined },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Registration flow expired. Please try again.')
  })

  it('register handles credential creation returning null', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: {}, flow_token: 'ft' },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockResolvedValue(null)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Passkey registration was cancelled')
  })

  it('register handles invalid attestation', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: {}, flow_token: 'ft' },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockResolvedValue({ id: 'x' })
    mockBuildRegistrationResult.mockReturnValue(null)

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Invalid Passkey registration response')
  })

  it('register handles finish failure', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: {}, flow_token: 'ft' },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockResolvedValue({ id: 'x' })
    mockBuildRegistrationResult.mockReturnValue({ data: 'ok' })
    mockFinishPasskeyRegistration.mockResolvedValue({
      success: false,
      message: 'Bad credential',
    })

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Bad credential')
  })

  it('register handles NotAllowedError', async () => {
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: {}, flow_token: 'ft' },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockRejectedValue(
      new DOMException('User declined', 'NotAllowedError')
    )

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.info).toHaveBeenCalledWith('Passkey registration was cancelled')
  })

  it('register handles generic error with Error instance', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockBeginPasskeyRegistration.mockResolvedValue({
      success: true,
      data: { options: {}, flow_token: 'ft' },
    })
    mockPrepareCredentialCreationOptions.mockReturnValue({})
    mockCreateCredential.mockRejectedValue(new Error('Unexpected'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.supported).toBe(true))

    let success: boolean = true
    await act(async () => {
      success = await result.current.register()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Unexpected')
    consoleSpy.mockRestore()
  })

  it('remove succeeds', async () => {
    mockDeletePasskey.mockResolvedValue({ success: true })

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = false
    await act(async () => {
      success = await result.current.remove('proof-del')
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Passkey removed successfully')
    expect(mockDeletePasskey).toHaveBeenCalledWith('proof-del')
  })

  it('remove handles failure', async () => {
    mockDeletePasskey.mockResolvedValue({
      success: false,
      message: 'Cannot remove',
    })

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = true
    await act(async () => {
      success = await result.current.remove()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Cannot remove')
  })

  it('remove handles error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDeletePasskey.mockRejectedValue(new Error('err'))

    const { result } = renderHook(() => usePasskeyManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = true
    await act(async () => {
      success = await result.current.remove()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Failed to remove Passkey')
    consoleSpy.mockRestore()
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
