import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { useTwoFA } from '@/features/profile/hooks/use-two-fa'

const mockGet2FAStatus = vi.fn()

vi.mock('@/lib/api', () => ({
  get2FAStatus: () => mockGet2FAStatus(),
}))

describe('useTwoFA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches 2FA status on mount when enabled', async () => {
    mockGet2FAStatus.mockResolvedValue({
      success: true,
      data: { enabled: true, locked: false, backup_codes_remaining: 5 },
    })

    const { result } = renderHook(() => useTwoFA(true))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toEqual({
      enabled: true,
      locked: false,
      backup_codes_remaining: 5,
    })
  })

  it('does not fetch when enabled is false', async () => {
    const { result } = renderHook(() => useTwoFA(false))

    // Give it a tick
    await waitFor(() => {
      expect(result.current.loading).toBe(true)
    })

    expect(mockGet2FAStatus).not.toHaveBeenCalled()
  })

  it('uses default status when response is not successful', async () => {
    mockGet2FAStatus.mockResolvedValue({ success: false })

    const { result } = renderHook(() => useTwoFA(true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toEqual({
      enabled: false,
      locked: false,
      backup_codes_remaining: 0,
    })
  })

  it('handles error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGet2FAStatus.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTwoFA(true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.status).toEqual({
      enabled: false,
      locked: false,
      backup_codes_remaining: 0,
    })
    consoleSpy.mockRestore()
  })

  it('refetch calls fetchStatus again', async () => {
    mockGet2FAStatus.mockResolvedValue({
      success: true,
      data: { enabled: false, locked: false, backup_codes_remaining: 0 },
    })

    const { result } = renderHook(() => useTwoFA(true))

    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGet2FAStatus.mockResolvedValue({
      success: true,
      data: { enabled: true, locked: false, backup_codes_remaining: 8 },
    })

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.status.enabled).toBe(true)
    expect(result.current.status.backup_codes_remaining).toBe(8)
  })

  it('defaults enabled parameter to true', async () => {
    mockGet2FAStatus.mockResolvedValue({
      success: true,
      data: { enabled: false, locked: false, backup_codes_remaining: 0 },
    })

    renderHook(() => useTwoFA())

    await waitFor(() => {
      expect(mockGet2FAStatus).toHaveBeenCalled()
    })
  })
})
