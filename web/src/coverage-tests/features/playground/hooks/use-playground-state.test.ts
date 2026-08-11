import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { usePlaygroundState } from '@/features/playground/hooks/use-playground-state'
import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '@/features/playground/constants'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockSaveConfig = vi.fn()
const mockSaveParameterEnabled = vi.fn()
const mockSaveMessages = vi.fn()
const mockLoadMessages = vi.fn()
const mockGetInitialPlaygroundConfig = vi.fn(() => DEFAULT_CONFIG)
const mockGetInitialParameterEnabled = vi.fn(() => DEFAULT_PARAMETER_ENABLED)
const mockApplyMessageStateUpdate = vi.fn(
  (_prev: unknown[], updater: unknown) =>
    typeof updater === 'function' ? updater(_prev) : updater
)

vi.mock('@/features/playground/lib', () => ({
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  saveParameterEnabled: (...args: unknown[]) => mockSaveParameterEnabled(...args),
  saveMessages: (...args: unknown[]) => mockSaveMessages(...args),
  loadMessages: () => mockLoadMessages(),
  getInitialPlaygroundConfig: () => mockGetInitialPlaygroundConfig(),
  getInitialParameterEnabled: () => mockGetInitialParameterEnabled(),
  applyMessageStateUpdate: (...args: unknown[]) => mockApplyMessageStateUpdate(...args),
}))

describe('usePlaygroundState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockLoadMessages.mockReturnValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes with default config and parameterEnabled', () => {
    const { result } = renderHook(() => usePlaygroundState())

    expect(result.current.config).toEqual(DEFAULT_CONFIG)
    expect(result.current.parameterEnabled).toEqual(DEFAULT_PARAMETER_ENABLED)
  })

  it('loads messages on mount', () => {
    const storedMessages = [
      { key: 'msg-1', from: 'user', versions: [{ id: 'v1', content: 'hi' }] },
    ]
    mockLoadMessages.mockReturnValue(storedMessages)

    const { result } = renderHook(() => usePlaygroundState())

    act(() => { vi.advanceTimersByTime(1) })

    expect(result.current.isLoadingMessages).toBe(false)
    expect(result.current.messages).toEqual(storedMessages)
  })

  it('loads empty array when loadMessages returns null', () => {
    mockLoadMessages.mockReturnValue(null)

    const { result } = renderHook(() => usePlaygroundState())

    act(() => { vi.advanceTimersByTime(1) })

    expect(result.current.isLoadingMessages).toBe(false)
    expect(result.current.messages).toEqual([])
  })

  it('updateConfig saves to storage', () => {
    const { result } = renderHook(() => usePlaygroundState())

    act(() => { result.current.updateConfig('temperature', 0.5) })

    expect(result.current.config.temperature).toBe(0.5)
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.5 })
    )
  })

  it('updateParameterEnabled saves to storage', () => {
    const { result } = renderHook(() => usePlaygroundState())

    act(() => { result.current.updateParameterEnabled('max_tokens', true) })

    expect(result.current.parameterEnabled.max_tokens).toBe(true)
    expect(mockSaveParameterEnabled).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: true })
    )
  })

  it('updateMessages debounces persist', () => {
    mockLoadMessages.mockReturnValue([])
    const { result } = renderHook(() => usePlaygroundState())

    // Wait for messages to load first
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.isLoadingMessages).toBe(false)

    act(() => {
      result.current.updateMessages([
        { key: 'new', from: 'user', versions: [{ id: 'v', content: 'a' }] },
      ])
    })

    // Not saved immediately
    expect(mockSaveMessages).not.toHaveBeenCalled()

    // Saved after debounce
    act(() => { vi.advanceTimersByTime(600) })
    expect(mockSaveMessages).toHaveBeenCalled()
  })

  it('clearMessages sets empty array', () => {
    mockLoadMessages.mockReturnValue([
      { key: 'x', from: 'user', versions: [{ id: 'v', content: 'x' }] },
    ])
    const { result } = renderHook(() => usePlaygroundState())
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.isLoadingMessages).toBe(false)

    act(() => { result.current.clearMessages() })

    expect(result.current.messages).toEqual([])
  })

  it('resetConfig restores defaults', () => {
    const { result } = renderHook(() => usePlaygroundState())

    act(() => { result.current.updateConfig('temperature', 0.1) })
    act(() => { result.current.resetConfig() })

    expect(result.current.config).toEqual(DEFAULT_CONFIG)
    expect(result.current.parameterEnabled).toEqual(DEFAULT_PARAMETER_ENABLED)
    expect(mockSaveConfig).toHaveBeenCalledWith(DEFAULT_CONFIG)
    expect(mockSaveParameterEnabled).toHaveBeenCalledWith(DEFAULT_PARAMETER_ENABLED)
  })

  it('setModels updates models state', () => {
    const { result } = renderHook(() => usePlaygroundState())
    const models = [{ label: 'gpt-4o', value: 'gpt-4o' }]

    act(() => { result.current.setModels(models) })

    expect(result.current.models).toEqual(models)
  })

  it('setGroups updates groups state', () => {
    const { result } = renderHook(() => usePlaygroundState())
    const groups = [{ label: 'default', value: 'default', ratio: 1 }]

    act(() => { result.current.setGroups(groups) })

    expect(result.current.groups).toEqual(groups)
  })
})
