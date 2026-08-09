import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import { useChannelMutateForm } from './use-channel-mutate-form'

const mockCreateChannel = vi.fn()
const mockUpdateChannel = vi.fn()
const mockTransformCreate = vi.fn()
const mockTransformUpdate = vi.fn()

vi.mock('../api', () => ({
  createChannel: (...args: unknown[]) => mockCreateChannel(...args),
  updateChannel: (...args: unknown[]) => mockUpdateChannel(...args),
}))

vi.mock('../lib', () => ({
  transformFormDataToCreatePayload: (...args: unknown[]) =>
    mockTransformCreate(...args),
  transformFormDataToUpdatePayload: (...args: unknown[]) =>
    mockTransformUpdate(...args),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: { role: 100 },
      },
    }),
}))

vi.mock('@/lib/admin-permissions', () => ({
  hasPermission: () => true,
  ADMIN_PERMISSION_ACTIONS: { SENSITIVE_WRITE: 'sensitive_write' },
  ADMIN_PERMISSION_RESOURCES: { CHANNEL: 'channel' },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('useChannelMutateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls createChannel when not editing', async () => {
    const onSuccess = vi.fn()
    mockTransformCreate.mockReturnValue({ name: 'test', type: 1 })
    mockCreateChannel.mockResolvedValue({ success: true })

    const { result } = renderHook(
      () =>
        useChannelMutateForm({
          isEditing: false,
          isMultiKeyChannel: false,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'test', type: 1 } as never)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockTransformCreate).toHaveBeenCalled()
    expect(mockCreateChannel).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it('calls updateChannel when editing', async () => {
    const onSuccess = vi.fn()
    mockTransformUpdate.mockReturnValue({ name: 'updated', id: 5 })
    mockUpdateChannel.mockResolvedValue({ success: true })

    const { result } = renderHook(
      () =>
        useChannelMutateForm({
          currentRow: { id: 5, name: 'old', type: 1 } as never,
          isEditing: true,
          isMultiKeyChannel: false,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'updated', key: 'sk-123' } as never)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockTransformUpdate).toHaveBeenCalled()
    expect(mockUpdateChannel).toHaveBeenCalledWith(5, expect.any(Object))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error toast when createChannel fails', async () => {
    const { toast } = await import('sonner')
    const onSuccess = vi.fn()
    mockTransformCreate.mockReturnValue({ name: 'test' })
    mockCreateChannel.mockResolvedValue({
      success: false,
      message: 'Server error',
    })

    const { result } = renderHook(
      () =>
        useChannelMutateForm({
          isEditing: false,
          isMultiKeyChannel: false,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'test' } as never)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })

  it('removes key from update payload when key is empty', async () => {
    const onSuccess = vi.fn()
    const payload = { name: 'updated', id: 5, key: '' }
    mockTransformUpdate.mockReturnValue(payload)
    mockUpdateChannel.mockResolvedValue({ success: true })

    const { result } = renderHook(
      () =>
        useChannelMutateForm({
          currentRow: { id: 5, name: 'old', type: 1 } as never,
          isEditing: true,
          isMultiKeyChannel: false,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'updated', key: '' } as never)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // The payload passed to updateChannel should not have 'key'
    const callPayload = mockUpdateChannel.mock.calls[0][1]
    expect(callPayload.key).toBeUndefined()
  })

  it('shows error toast when updateChannel returns failure', async () => {
    const { toast } = await import('sonner')
    const onSuccess = vi.fn()
    mockTransformUpdate.mockReturnValue({ name: 'x', id: 1 })
    mockUpdateChannel.mockResolvedValue({
      success: false,
      message: 'Not found',
    })

    const { result } = renderHook(
      () =>
        useChannelMutateForm({
          currentRow: { id: 1, name: 'old', type: 1 } as never,
          isEditing: true,
          isMultiKeyChannel: false,
          onSuccess,
        }),
      { wrapper: createWrapper() }
    )

    result.current.mutate({ name: 'x' } as never)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalled()
  })
})
