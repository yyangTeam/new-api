import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('../api', () => ({
  createCustomOAuthProvider: vi.fn(),
  updateCustomOAuthProvider: vi.fn(),
  deleteCustomOAuthProvider: vi.fn(),
  discoverOIDCEndpoints: vi.fn(),
}))

import { toast } from 'sonner'
import {
  createCustomOAuthProvider,
  updateCustomOAuthProvider,
  deleteCustomOAuthProvider,
  discoverOIDCEndpoints,
} from '../api'
import {
  useCreateProvider,
  useUpdateProvider,
  useDeleteProvider,
  useDiscoverEndpoints,
} from './use-custom-oauth-mutations'

const mockCreate = vi.mocked(createCustomOAuthProvider)
const mockUpdate = vi.mocked(updateCustomOAuthProvider)
const mockDelete = vi.mocked(deleteCustomOAuthProvider)
const mockDiscover = vi.mocked(discoverOIDCEndpoints)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useCreateProvider', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls createCustomOAuthProvider and shows success toast', async () => {
    mockCreate.mockResolvedValue({ success: true, data: { id: 1, name: 'Test' } as any })

    const { result } = renderHook(() => useCreateProvider(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: 'Test', slug: 'test' } as any)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Provider created successfully')
  })

  it('shows error toast on failure', async () => {
    mockCreate.mockRejectedValue(new Error('Create failed'))

    const { result } = renderHook(() => useCreateProvider(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ name: 'Test', slug: 'test' } as any)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Create failed')
  })
})

describe('useUpdateProvider', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls updateCustomOAuthProvider and shows success toast', async () => {
    mockUpdate.mockResolvedValue({ success: true, data: { id: 1, name: 'Updated' } as any })

    const { result } = renderHook(() => useUpdateProvider(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 1, data: { name: 'Updated' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Provider updated successfully')
  })

  it('shows error toast on failure', async () => {
    mockUpdate.mockRejectedValue(new Error('Update failed'))

    const { result } = renderHook(() => useUpdateProvider(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ id: 1, data: { name: 'x' } })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Update failed')
  })
})

describe('useDeleteProvider', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls deleteCustomOAuthProvider and shows success toast', async () => {
    mockDelete.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useDeleteProvider(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(5)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Provider deleted successfully')
  })

  it('shows error toast on failure', async () => {
    mockDelete.mockRejectedValue(new Error('Delete failed'))

    const { result } = renderHook(() => useDeleteProvider(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(5)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Delete failed')
  })
})

describe('useDiscoverEndpoints', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls discoverOIDCEndpoints and shows success toast', async () => {
    mockDiscover.mockResolvedValue({
      success: true,
      data: {
        well_known_url: 'https://auth.test/.well-known/openid-configuration',
        discovery: {
          authorization_endpoint: 'https://auth.test/authorize',
          token_endpoint: 'https://auth.test/token',
          userinfo_endpoint: 'https://auth.test/userinfo',
        },
      },
    })

    const { result } = renderHook(() => useDiscoverEndpoints(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('https://auth.test/.well-known/openid-configuration')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith(
      'OIDC endpoints discovered successfully'
    )
  })

  it('shows error toast on failure', async () => {
    mockDiscover.mockRejectedValue(new Error('Discovery failed'))

    const { result } = renderHook(() => useDiscoverEndpoints(), {
      wrapper: createWrapper(),
    })

    result.current.mutate('https://bad.url')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Discovery failed')
  })
})
