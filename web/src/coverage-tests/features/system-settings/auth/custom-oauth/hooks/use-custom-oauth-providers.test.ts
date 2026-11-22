import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/features/system-settings/auth/custom-oauth/api', () => ({
  getCustomOAuthProviders: vi.fn(),
}))

import { getCustomOAuthProviders } from '@/features/system-settings/auth/custom-oauth/api'
import { useCustomOAuthProviders } from '@/features/system-settings/auth/custom-oauth/hooks/use-custom-oauth-providers'

const mockGetProviders = vi.mocked(getCustomOAuthProviders)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCustomOAuthProviders', () => {
  it('returns providers from API', async () => {
    const mockProviders = [
      { id: 1, name: 'GitHub', slug: 'github' },
      { id: 2, name: 'GitLab', slug: 'gitlab' },
    ]
    mockGetProviders.mockResolvedValue({
      success: true,
      data: mockProviders as any,
    })

    const { result } = renderHook(() => useCustomOAuthProviders(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockProviders)
  })

  it('returns empty array when data is undefined', async () => {
    mockGetProviders.mockResolvedValue({ success: true, data: undefined })

    const { result } = renderHook(() => useCustomOAuthProviders(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('handles API error', async () => {
    mockGetProviders.mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useCustomOAuthProviders(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
