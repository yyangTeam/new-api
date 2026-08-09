import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  useModelDeploymentSettings,
  clearConnectionCache,
} from './use-model-deployment-settings'

const mockGetDeploymentSettings = vi.fn()
const mockTestDeploymentConnection = vi.fn()

vi.mock('../api', () => ({
  getDeploymentSettings: (...args: unknown[]) => mockGetDeploymentSettings(...args),
  testDeploymentConnection: (...args: unknown[]) => mockTestDeploymentConnection(...args),
}))

describe('useModelDeploymentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearConnectionCache()
  })

  it('starts in loading state', () => {
    mockGetDeploymentSettings.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useModelDeploymentSettings())
    expect(result.current.loading).toBe(true)
    expect(result.current.loadingPhase).toBe('settings')
  })

  it('fetches settings and sets enabled=false when not enabled', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: false },
    })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.isIoNetEnabled).toBe(false)
    expect(result.current.connectionOk).toBeNull()
  })

  it('tests connection when enabled', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.isIoNetEnabled).toBe(true)
    expect(result.current.connectionOk).toBe(true)
    expect(result.current.connectionError).toBeNull()
  })

  it('handles connection failure', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockResolvedValue({
      success: false,
      message: 'API key invalid',
    })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.connectionOk).toBe(false)
    expect(result.current.connectionError).toBe('API key invalid')
  })

  it('handles connection exception', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockRejectedValue(new Error('Timeout'))

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.connectionOk).toBe(false)
    expect(result.current.connectionError).toBe('Timeout')
  })

  it('handles settings fetch failure', async () => {
    mockGetDeploymentSettings.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.isIoNetEnabled).toBe(false)
  })

  it('testConnection skips cache and re-tests', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.connectionOk).toBe(true)

    mockTestDeploymentConnection.mockResolvedValue({
      success: false,
      message: 'Now fails',
    })

    await act(async () => {
      await result.current.testConnection()
    })

    expect(result.current.connectionOk).toBe(false)
    expect(result.current.connectionError).toBe('Now fails')
  })

  it('testConnection handles exception', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection
      .mockResolvedValueOnce({ success: true })
      .mockRejectedValueOnce(new Error('Connection refused'))

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    await act(async () => {
      await result.current.testConnection()
    })

    expect(result.current.connectionOk).toBe(false)
    expect(result.current.connectionError).toBe('Connection refused')
  })

  it('refresh re-fetches all without cache', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(mockGetDeploymentSettings).toHaveBeenCalledTimes(1)
    expect(mockTestDeploymentConnection).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockGetDeploymentSettings).toHaveBeenCalledTimes(2)
    expect(mockTestDeploymentConnection).toHaveBeenCalledTimes(2)
  })

  it('uses cache on subsequent loads', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockResolvedValue({ success: true })

    const { result, unmount } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.connectionOk).toBe(true)
    unmount()

    // Second mount should use cache
    const { result: result2 } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    // Connection test called only once total (cache hit on second load)
    // Settings called twice (once per mount)
    expect(mockGetDeploymentSettings).toHaveBeenCalledTimes(2)
    expect(mockTestDeploymentConnection).toHaveBeenCalledTimes(1)
    expect(result2.current.connectionOk).toBe(true)
  })

  it('handles response with null success', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: null,
      data: null,
    })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.isIoNetEnabled).toBe(false)
  })

  it('handles connection test with default error message', async () => {
    mockGetDeploymentSettings.mockResolvedValue({
      success: true,
      data: { enabled: true },
    })
    mockTestDeploymentConnection.mockResolvedValue({ success: false })

    const { result } = renderHook(() => useModelDeploymentSettings())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.connectionError).toBe('Connection failed')
  })
})
