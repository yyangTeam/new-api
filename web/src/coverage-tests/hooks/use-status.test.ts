import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getStatus: vi.fn(),
}))

vi.mock('@/stores/system-config-store', () => ({
  useSystemConfigStore: { getState: vi.fn(() => ({ setConfig: vi.fn() })) },
}))

vi.mock('@/hooks/use-system-config', () => ({
  mapStatusDataToConfig: vi.fn((s: unknown) => s),
}))

import { useQuery } from '@tanstack/react-query'
import { useStatus } from '@/hooks/use-status'

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>

describe('useStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('returns status data when query succeeds', () => {
    const statusData = { system_name: 'TestAPI' }
    mockUseQuery.mockReturnValue({
      data: statusData,
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useStatus())
    expect(result.current.status).toEqual(statusData)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('returns null when data is undefined', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })

    const { result } = renderHook(() => useStatus())
    expect(result.current.status).toBeNull()
  })

  it('returns loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    const { result } = renderHook(() => useStatus())
    expect(result.current.loading).toBe(true)
  })

  it('returns error state', () => {
    const error = new Error('Network error')
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error,
    })

    const { result } = renderHook(() => useStatus())
    expect(result.current.error).toBe(error)
  })

  it('passes correct query options to useQuery', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderHook(() => useStatus())

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['status'],
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
      })
    )
  })

  it('uses localStorage cache as placeholderData', () => {
    const cachedStatus = { system_name: 'CachedAPI' }
    localStorage.setItem('status', JSON.stringify(cachedStatus))

    mockUseQuery.mockReturnValue({
      data: cachedStatus,
      isLoading: false,
      error: null,
    })

    renderHook(() => useStatus())

    const queryConfig = mockUseQuery.mock.calls[0][0]
    expect(queryConfig.placeholderData).toEqual(cachedStatus)
  })

  it('placeholderData is undefined when localStorage is empty', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderHook(() => useStatus())

    const queryConfig = mockUseQuery.mock.calls[0][0]
    expect(queryConfig.placeholderData).toBeUndefined()
  })

  it('placeholderData is undefined when localStorage has invalid JSON', () => {
    localStorage.setItem('status', 'invalid-json')

    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    })

    renderHook(() => useStatus())

    const queryConfig = mockUseQuery.mock.calls[0][0]
    expect(queryConfig.placeholderData).toBeUndefined()
  })
})
