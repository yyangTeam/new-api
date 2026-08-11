import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import { useProfile } from '@/features/profile/hooks/use-profile'

const mockGetUserProfile = vi.fn()
const mockUpdateUserProfile = vi.fn()
const mockUpdateUserSettings = vi.fn()

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/features/profile/api', () => ({
  getUserProfile: () => mockGetUserProfile(),
  updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
  updateUserSettings: (...args: unknown[]) => mockUpdateUserSettings(...args),
}))

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserProfile.mockResolvedValue({
      success: true,
      data: { id: 1, username: 'testuser', display_name: 'Test User' },
    })
  })

  it('fetches profile on mount', async () => {
    const { result } = renderHook(() => useProfile())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toEqual({
      id: 1,
      username: 'testuser',
      display_name: 'Test User',
    })
  })

  it('handles fetch error', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBeNull()
    expect(toast.error).toHaveBeenCalledWith('Failed to load profile')
  })

  it('handles fetch with success false', async () => {
    mockGetUserProfile.mockResolvedValue({ success: false })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBeNull()
  })

  it('refreshProfile fetches silently without loading state', async () => {
    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUserProfile.mockResolvedValue({
      success: true,
      data: { id: 1, username: 'testuser', display_name: 'Updated' },
    })

    await act(async () => {
      await result.current.refreshProfile()
    })

    expect(result.current.profile?.display_name).toBe('Updated')
  })

  it('refreshProfile handles error silently', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockGetUserProfile.mockRejectedValue(new Error('fail'))

    await act(async () => {
      await result.current.refreshProfile()
    })

    // Should not show toast for silent refresh
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('updateProfile succeeds and refreshes', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserProfile.mockResolvedValue({ success: true })

    let success: boolean = false
    await act(async () => {
      success = await result.current.updateProfile({ display_name: 'New' })
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Profile updated successfully')
    expect(mockGetUserProfile).toHaveBeenCalledTimes(2) // initial + refresh
  })

  it('updateProfile handles failure response', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserProfile.mockResolvedValue({
      success: false,
      message: 'Name too long',
    })

    let success: boolean = true
    await act(async () => {
      success = await result.current.updateProfile({ display_name: 'x'.repeat(100) })
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Name too long')
  })

  it('updateProfile handles failure with no message', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserProfile.mockResolvedValue({ success: false })

    await act(async () => {
      await result.current.updateProfile({ display_name: 'x' })
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to update profile')
  })

  it('updateProfile handles thrown error', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserProfile.mockRejectedValue(new Error('Network'))

    let success: boolean = true
    await act(async () => {
      success = await result.current.updateProfile({ display_name: 'x' })
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Failed to update profile')
  })

  it('updateSettings succeeds', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserSettings.mockResolvedValue({ success: true })

    let success: boolean = false
    await act(async () => {
      success = await result.current.updateSettings({ notify_type: 'webhook' })
    })

    expect(success).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Settings updated successfully')
  })

  it('updateSettings handles failure', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserSettings.mockResolvedValue({
      success: false,
      message: 'Invalid URL',
    })

    let success: boolean = true
    await act(async () => {
      success = await result.current.updateSettings({ webhook_url: 'bad' })
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Invalid URL')
  })

  it('updateSettings handles failure with no message', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserSettings.mockResolvedValue({ success: false })

    await act(async () => {
      await result.current.updateSettings({})
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to update settings')
  })

  it('updateSettings handles thrown error', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockUpdateUserSettings.mockRejectedValue(new Error('err'))

    let success: boolean = true
    await act(async () => {
      success = await result.current.updateSettings({})
    })

    expect(success).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Failed to update settings')
  })

  it('sets updating state during updateProfile', async () => {
    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resolvePromise: (v: unknown) => void
    mockUpdateUserProfile.mockReturnValue(
      new Promise((r) => { resolvePromise = r })
    )

    let updatePromise: Promise<boolean>
    act(() => {
      updatePromise = result.current.updateProfile({ display_name: 'x' })
    })

    expect(result.current.updating).toBe(true)

    await act(async () => {
      resolvePromise!({ success: true })
      await updatePromise!
    })

    expect(result.current.updating).toBe(false)
  })
})
