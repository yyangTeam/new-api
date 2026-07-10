import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../constants'
import type { Message } from '../../types'

import {
  getInitialPlaygroundConfig,
  getInitialParameterEnabled,
  getInitialMessages,
  applyMessageStateUpdate,
} from './playground-state-utils'

vi.mock('../storage/storage', () => ({
  loadConfig: vi.fn(() => ({})),
  loadMessages: vi.fn(() => null),
  loadParameterEnabled: vi.fn(() => ({})),
}))

describe('getInitialPlaygroundConfig', () => {
  test('returns DEFAULT_CONFIG when storage returns empty', () => {
    const result = getInitialPlaygroundConfig()
    expect(result).toEqual(DEFAULT_CONFIG)
  })

  test('merges storage values over defaults', async () => {
    const { loadConfig } = await import('../storage/storage')
    vi.mocked(loadConfig).mockReturnValue({ model: 'claude-3' })

    const result = getInitialPlaygroundConfig()
    expect(result.model).toBe('claude-3')
    expect(result.temperature).toBe(DEFAULT_CONFIG.temperature)

    vi.mocked(loadConfig).mockReturnValue({})
  })
})

describe('getInitialParameterEnabled', () => {
  test('returns DEFAULT_PARAMETER_ENABLED when storage returns empty', () => {
    const result = getInitialParameterEnabled()
    expect(result).toEqual(DEFAULT_PARAMETER_ENABLED)
  })

  test('merges storage values over defaults', async () => {
    const { loadParameterEnabled } = await import('../storage/storage')
    vi.mocked(loadParameterEnabled).mockReturnValue({ seed: true })

    const result = getInitialParameterEnabled()
    expect(result.seed).toBe(true)
    expect(result.temperature).toBe(DEFAULT_PARAMETER_ENABLED.temperature)

    vi.mocked(loadParameterEnabled).mockReturnValue({})
  })
})

describe('getInitialMessages', () => {
  test('returns empty array when storage returns null', () => {
    const result = getInitialMessages()
    expect(result).toEqual([])
  })

  test('returns messages from storage when available', async () => {
    const messages: Message[] = [
      {
        key: '1',
        from: 'user',
        versions: [{ id: 'v1', content: 'hello' }],
      },
    ]
    const { loadMessages } = await import('../storage/storage')
    vi.mocked(loadMessages).mockReturnValue(messages)

    const result = getInitialMessages()
    expect(result).toEqual(messages)

    vi.mocked(loadMessages).mockReturnValue(null)
  })
})

describe('applyMessageStateUpdate', () => {
  const previous: Message[] = [
    { key: '1', from: 'user', versions: [{ id: 'v1', content: 'hello' }] },
    {
      key: '2',
      from: 'assistant',
      versions: [{ id: 'v2', content: 'hi' }],
    },
  ]

  test('returns array directly when updater is an array', () => {
    const newMessages: Message[] = [
      { key: '3', from: 'user', versions: [{ id: 'v3', content: 'new' }] },
    ]
    const result = applyMessageStateUpdate(previous, newMessages)
    expect(result).toEqual(newMessages)
  })

  test('calls function updater with previous messages', () => {
    const updater = (prev: Message[]) => [
      ...prev,
      { key: '3', from: 'user' as const, versions: [{ id: 'v3', content: 'new' }] },
    ]
    const result = applyMessageStateUpdate(previous, updater)
    expect(result).toHaveLength(3)
    expect(result[2].key).toBe('3')
  })

  test('function updater receives previous messages', () => {
    const updater = vi.fn((prev: Message[]) => prev)
    applyMessageStateUpdate(previous, updater)
    expect(updater).toHaveBeenCalledWith(previous)
  })
})
