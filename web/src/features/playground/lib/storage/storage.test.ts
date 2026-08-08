import {
  loadConfig,
  saveConfig,
  loadParameterEnabled,
  saveParameterEnabled,
  loadMessages,
  saveMessages,
  clearPlaygroundData,
} from './storage'

vi.mock('../../constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../constants')>()
  return {
    ...actual,
    STORAGE_KEYS: {
      CONFIG: 'playground_config',
      MESSAGES: 'playground_messages',
      PARAMETER_ENABLED: 'playground_parameter_enabled',
    },
    MESSAGE_STATUS: {
      LOADING: 'loading',
      STREAMING: 'streaming',
      COMPLETE: 'complete',
      ERROR: 'error',
    },
  }
})

beforeEach(() => {
  localStorage.clear()
})

describe('loadConfig', () => {
  test('returns empty object when no config is stored', () => {
    expect(loadConfig()).toEqual({})
  })

  test('loads stored config with envelope format', () => {
    const config = { model: 'gpt-4', temperature: 0.5 }
    localStorage.setItem(
      'playground_config',
      JSON.stringify({ version: 1, data: config })
    )
    const result = loadConfig()
    expect(result.model).toBe('gpt-4')
    expect(result.temperature).toBe(0.5)
  })

  test('returns empty object for invalid JSON', () => {
    localStorage.setItem('playground_config', 'not-json')
    expect(loadConfig()).toEqual({})
  })

  test('handles config without envelope wrapper', () => {
    const config = { model: 'gpt-3.5', stream: true }
    localStorage.setItem('playground_config', JSON.stringify(config))
    const result = loadConfig()
    expect(result.model).toBe('gpt-3.5')
    expect(result.stream).toBe(true)
  })
})

describe('saveConfig', () => {
  test('saves config to localStorage with envelope format', () => {
    saveConfig({ model: 'gpt-4', temperature: 0.8 })
    const stored = JSON.parse(localStorage.getItem('playground_config')!)
    expect(stored.version).toBe(1)
    expect(stored.data.model).toBe('gpt-4')
    expect(stored.data.temperature).toBe(0.8)
  })

  test('saves partial config', () => {
    saveConfig({ model: 'claude-3' })
    const stored = JSON.parse(localStorage.getItem('playground_config')!)
    expect(stored.data.model).toBe('claude-3')
  })

  test('overwrites existing config', () => {
    saveConfig({ model: 'gpt-4' })
    saveConfig({ model: 'gpt-3.5' })
    const stored = JSON.parse(localStorage.getItem('playground_config')!)
    expect(stored.data.model).toBe('gpt-3.5')
  })
})

describe('loadParameterEnabled', () => {
  test('returns empty object when no data is stored', () => {
    expect(loadParameterEnabled()).toEqual({})
  })

  test('loads stored parameter enabled state', () => {
    const params = { temperature: true, max_tokens: false }
    localStorage.setItem(
      'playground_parameter_enabled',
      JSON.stringify({ version: 1, data: params })
    )
    const result = loadParameterEnabled()
    expect(result.temperature).toBe(true)
    expect(result.max_tokens).toBe(false)
  })

  test('returns empty object for invalid JSON', () => {
    localStorage.setItem('playground_parameter_enabled', '{bad}')
    expect(loadParameterEnabled()).toEqual({})
  })
})

describe('saveParameterEnabled', () => {
  test('saves parameter enabled state', () => {
    saveParameterEnabled({ temperature: false, seed: true })
    const stored = JSON.parse(
      localStorage.getItem('playground_parameter_enabled')!
    )
    expect(stored.version).toBe(1)
    expect(stored.data.temperature).toBe(false)
    expect(stored.data.seed).toBe(true)
  })
})

describe('loadMessages', () => {
  test('returns null when no messages are stored', () => {
    expect(loadMessages()).toBeNull()
  })

  test('returns null for invalid JSON', () => {
    localStorage.setItem('playground_messages', 'bad-json')
    expect(loadMessages()).toBeNull()
  })

  test('loads valid messages from envelope format', () => {
    const messages = [
      {
        key: 'msg1',
        from: 'user',
        versions: [{ id: 'v1', content: 'Hello' }],
        status: 'complete',
      },
    ]
    localStorage.setItem(
      'playground_messages',
      JSON.stringify({ version: 1, data: messages })
    )
    const result = loadMessages()
    expect(result).not.toBeNull()
    expect(result!.length).toBe(1)
    expect(result![0].key).toBe('msg1')
    expect(result![0].versions[0].content).toBe('Hello')
  })

  test('removes oversized stored messages', () => {
    const largeContent = 'x'.repeat(1024 * 1024 + 1)
    localStorage.setItem('playground_messages', largeContent)
    const result = loadMessages()
    expect(result).toBeNull()
    expect(localStorage.getItem('playground_messages')).toBeNull()
  })
})

describe('saveMessages', () => {
  test('saves messages to localStorage', () => {
    const messages = [
      {
        key: 'msg1',
        from: 'user' as const,
        versions: [{ id: 'v1', content: 'Hello' }],
      },
    ]
    saveMessages(messages)
    const stored = JSON.parse(localStorage.getItem('playground_messages')!)
    expect(stored.version).toBe(1)
    expect(stored.data.length).toBe(1)
    expect(stored.data[0].key).toBe('msg1')
  })

  test('trims messages to maximum count', () => {
    const messages = Array.from({ length: 150 }, (_, i) => ({
      key: `msg${i}`,
      from: 'user' as const,
      versions: [{ id: `v${i}`, content: `Message ${i}` }],
    }))
    saveMessages(messages)
    const stored = JSON.parse(localStorage.getItem('playground_messages')!)
    expect(stored.data.length).toBeLessThanOrEqual(100)
  })
})

describe('clearPlaygroundData', () => {
  test('removes all playground keys from localStorage', () => {
    localStorage.setItem('playground_config', '{}')
    localStorage.setItem('playground_parameter_enabled', '{}')
    localStorage.setItem('playground_messages', '[]')
    localStorage.setItem('other_key', 'kept')

    clearPlaygroundData()

    expect(localStorage.getItem('playground_config')).toBeNull()
    expect(localStorage.getItem('playground_parameter_enabled')).toBeNull()
    expect(localStorage.getItem('playground_messages')).toBeNull()
    expect(localStorage.getItem('other_key')).toBe('kept')
  })

  test('does not throw when keys do not exist', () => {
    expect(() => clearPlaygroundData()).not.toThrow()
  })
})
