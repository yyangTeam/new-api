import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'

import { usePlaygroundOptions } from '@/features/playground/hooks/use-playground-options'

const mockGetUserModels = vi.fn()
const mockGetUserGroups = vi.fn()
const mockGetGroupFallback = vi.fn()
const mockGetModelFallback = vi.fn()
const mockGetOptionLoadErrorMessage = vi.fn()
const mockShouldClearModelForGroup = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('@/features/playground/api', () => ({
  getUserModels: (...args: unknown[]) => mockGetUserModels(...args),
  getUserGroups: () => mockGetUserGroups(),
}))

vi.mock('@/features/playground/lib', () => ({
  getGroupFallback: (...args: unknown[]) => mockGetGroupFallback(...args),
  getModelFallback: (...args: unknown[]) => mockGetModelFallback(...args),
  getOptionLoadErrorMessage: (...args: unknown[]) => mockGetOptionLoadErrorMessage(...args),
  shouldClearModelForGroup: (...args: unknown[]) => mockShouldClearModelForGroup(...args),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('usePlaygroundOptions', () => {
  let setGroups: ReturnType<typeof vi.fn>
  let setModels: ReturnType<typeof vi.fn>
  let updateConfig: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    setGroups = vi.fn()
    setModels = vi.fn()
    updateConfig = vi.fn()
    mockGetUserModels.mockResolvedValue([
      { label: 'gpt-4o', value: 'gpt-4o' },
    ])
    mockGetUserGroups.mockResolvedValue([
      { label: 'default', value: 'default', ratio: 1 },
    ])
    mockGetModelFallback.mockReturnValue(null)
    mockGetGroupFallback.mockReturnValue(null)
    mockShouldClearModelForGroup.mockReturnValue(false)
    mockGetOptionLoadErrorMessage.mockReturnValue('Error message')
  })

  it('fetches models and groups', async () => {
    const { result } = renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'default',
          currentModel: 'gpt-4o',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(setModels).toHaveBeenCalledWith([{ label: 'gpt-4o', value: 'gpt-4o' }])
    })

    expect(setGroups).toHaveBeenCalledWith([
      { label: 'default', value: 'default', ratio: 1 },
    ])
  })

  it('applies model fallback', async () => {
    mockGetModelFallback.mockReturnValue('gpt-3.5-turbo')

    renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'default',
          currentModel: 'nonexistent',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith('model', 'gpt-3.5-turbo')
    })
  })

  it('clears model when shouldClearModelForGroup is true', async () => {
    mockGetModelFallback.mockReturnValue(null)
    mockShouldClearModelForGroup.mockReturnValue(true)

    renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'default',
          currentModel: 'old-model',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith('model', '')
    })
  })

  it('applies group fallback', async () => {
    mockGetGroupFallback.mockReturnValue('vip')

    renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'nonexistent',
          currentModel: 'gpt-4o',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith('group', 'vip')
    })
  })

  it('shows error toast on models fetch error', async () => {
    mockGetUserModels.mockRejectedValue(new Error('fetch failed'))

    renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'default',
          currentModel: 'gpt-4o',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('shows error toast on groups fetch error', async () => {
    mockGetUserGroups.mockRejectedValue(new Error('fetch failed'))

    renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'default',
          currentModel: 'gpt-4o',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('does not fetch models when group is empty', async () => {
    renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: '',
          currentModel: 'gpt-4o',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    // Wait for groups to load
    await waitFor(() => {
      expect(setGroups).toHaveBeenCalled()
    })

    // Models should not be fetched
    expect(mockGetUserModels).not.toHaveBeenCalled()
  })

  it('returns isLoadingModels state', async () => {
    const { result } = renderHook(
      () =>
        usePlaygroundOptions({
          currentGroup: 'default',
          currentModel: 'gpt-4o',
          setGroups,
          setModels,
          updateConfig,
        }),
      { wrapper: createWrapper() }
    )

    // Initially loading
    expect(result.current.isLoadingModels).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoadingModels).toBe(false)
    })
  })
})
