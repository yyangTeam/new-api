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

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('@/lib/server-error-message', () => ({
  requireServerSuccess: vi.fn((response: any) => {
    if (response && response.success === false) {
      throw new Error(response.message || 'Operation failed')
    }
    return response
  }),
  createServerError: vi.fn(),
}))

import { toast } from 'sonner'
import { updateSystemOption } from '@/features/system-settings/api'
import { handleServerError } from '@/lib/handle-server-error'
import { useUpdateOption } from '@/features/system-settings/hooks/use-update-option'

const mockUpdateSystemOption = vi.mocked(updateSystemOption)
const mockHandleServerError = vi.mocked(handleServerError)

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

  it('calls handleServerError when response success is false', async () => {
    mockUpdateSystemOption.mockResolvedValue({
      success: false,
      message: 'Permission denied',
    })

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockHandleServerError).toHaveBeenCalled()
  })

  it('calls handleServerError when response message is empty', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: false, message: '' })

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockHandleServerError).toHaveBeenCalled()
  })

  it('calls handleServerError on network error', async () => {
    mockUpdateSystemOption.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUpdateOption(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ key: 'SomeKey', value: 'val' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockHandleServerError).toHaveBeenCalled()
  })

  it('invalidates status query for status-related keys', async () => {
    mockUpdateSystemOption.mockResolvedValue({ success: true, message: '' })
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useUpdateOption(), { wrapper })

    // Use a key from the current STATUS_RELATED_KEYS set
    result.current.mutate({ key: 'Notice', value: 'test' })

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
