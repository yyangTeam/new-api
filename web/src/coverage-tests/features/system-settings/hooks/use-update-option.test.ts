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

vi.mock('@/features/system-settings/api', () => ({
  updateSystemOption: vi.fn(),
}))

import { toast } from 'sonner'
import { updateSystemOption } from '@/features/system-settings/api'
import { useUpdateOption } from '@/features/system-settings/hooks/use-update-option'

const mockUpdateSystemOption = vi.mocked(updateSystemOption)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useUpdateOption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateSystemOption with the request', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: true, message: 'ok' })

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'TestKey', value: 'TestValue' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdateSystemOption).toHaveBeenCalledWith({
      key: 'TestKey',
      value: 'TestValue',
    })
  })

  it('shows success toast on successful update', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: true, message: '' })

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.success).toHaveBeenCalledWith('Setting updated successfully')
  })

  it('shows error toast when response success is false', async () => {
    mockUpdateSystemOption.mockResolvedValue({
      success: false,
      message: 'Permission denied',
    })

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Permission denied')
  })

  it('shows fallback error toast when response message is empty', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: false, message: '' })

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Failed to update setting')
  })

  it('shows error toast on network error', async () => {
    mockUpdateSystemOption.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith('Network error')
  })

  it('invalidates status query for status-related keys', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: true, message: '' })
    // Spy on Storage.prototype.removeItem (not the window.localStorage
    // instance): under jsdom the instance spy doesn't intercept calls the
    // hook makes via window.localStorage.removeItem, so removeItem('status')
    // bypassed it. Spying at the prototype level catches all instances.
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUpdateOption(), { wrapper })

    // Use a key from STATUS_RELATED_KEYS
    result.current.mutate({ key: 'theme.frontend', value: 'dark' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['system-options'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['status'] })
    expect(removeItemSpy).toHaveBeenCalledWith('status')
    removeItemSpy.mockRestore()
  })

  it('does not invalidate status query for non-status keys', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: true, message: '' })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUpdateOption(), { wrapper })

    result.current.mutate({ key: 'SomeNonStatusKey', value: 'val' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['system-options'] })
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['status'] })
  })
})
