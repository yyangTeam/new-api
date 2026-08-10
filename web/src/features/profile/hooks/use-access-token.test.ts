import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import { useAccessToken } from './use-access-token'

const mockGenerateAccessToken = vi.fn()
const mockCopyToClipboard = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: mockCopyToClipboard }),
}))

vi.mock('../api', () => ({
  generateAccessToken: () => mockGenerateAccessToken(),
}))

describe('useAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with empty token and not generating', () => {
    const { result } = renderHook(() => useAccessToken())

    expect(result.current.token).toBe('')
    expect(result.current.generating).toBe(false)
  })

  it('generates token successfully', async () => {
    mockGenerateAccessToken.mockResolvedValue({
      success: true,
      data: 'sk-newtoken123',
    })

    const { result } = renderHook(() => useAccessToken())

    let success: boolean = false
    await act(async () => {
      success = await result.current.generate()
    })

    expect(success).toBe(true)
    expect(result.current.token).toBe('sk-newtoken123')
    expect(mockCopyToClipboard).toHaveBeenCalledWith('sk-newtoken123')
    expect(toast.success).toHaveBeenCalledWith('Token regenerated and copied to clipboard')
  })

  it('handles failed response', async () => {
    mockGenerateAccessToken.mockResolvedValue({
      success: false,
      message: 'Rate limited',
    })

    const { result } = renderHook(() => useAccessToken())

    let success: boolean = true
    await act(async () => {
      success = await result.current.generate()
    })

    expect(success).toBe(false)
    expect(result.current.token).toBe('')
    expect(toast.error).toHaveBeenCalledWith('Rate limited')
  })

  it('handles failed response with no message', async () => {
    mockGenerateAccessToken.mockResolvedValue({
      success: false,
    })

    const { result } = renderHook(() => useAccessToken())

    await act(async () => {
      await result.current.generate()
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to generate token')
  })

  it('handles thrown error', async () => {
    mockGenerateAccessToken.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAccessToken())

    let success: boolean = true
    await act(async () => {
      success = await result.current.generate()
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Failed to generate token')
  })

  it('sets generating state during operation', async () => {
    let resolvePromise: (value: unknown) => void
    mockGenerateAccessToken.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve })
    )

    const { result } = renderHook(() => useAccessToken())

    let generatePromise: Promise<boolean>
    act(() => {
      generatePromise = result.current.generate()
    })

    expect(result.current.generating).toBe(true)

    await act(async () => {
      resolvePromise!({ success: true, data: 'token' })
      await generatePromise!
    })

    expect(result.current.generating).toBe(false)
  })
})
