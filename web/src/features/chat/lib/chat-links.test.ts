import {
  detectChatLinkType,
  chatLinkRequiresApiKey,
  parseChatConfig,
  resolveChatUrl,
} from './chat-links'

describe('detectChatLinkType', () => {
  test('returns "web" for http URLs', () => {
    expect(detectChatLinkType('http://example.com')).toBe('web')
  })

  test('returns "web" for https URLs', () => {
    expect(detectChatLinkType('https://example.com')).toBe('web')
  })

  test('returns "web" for HTTP uppercase', () => {
    expect(detectChatLinkType('HTTP://example.com')).toBe('web')
  })

  test('returns "fluent" for fluent protocol', () => {
    expect(detectChatLinkType('fluent://open')).toBe('fluent')
  })

  test('returns "fluent" for Fluent uppercase', () => {
    expect(detectChatLinkType('Fluent://open')).toBe('fluent')
  })

  test('returns "custom-protocol" for other protocols', () => {
    expect(detectChatLinkType('chatbox://config')).toBe('custom-protocol')
  })

  test('returns "custom-protocol" for unknown formats', () => {
    expect(detectChatLinkType('some-app:open')).toBe('custom-protocol')
  })
})

describe('chatLinkRequiresApiKey', () => {
  test('returns true for {key} placeholder', () => {
    expect(chatLinkRequiresApiKey('https://example.com?key={key}')).toBe(true)
  })

  test('returns true for {cherryConfig} placeholder', () => {
    expect(
      chatLinkRequiresApiKey('https://example.com#config={cherryConfig}')
    ).toBe(true)
  })

  test('returns true for {aionuiConfig} placeholder', () => {
    expect(
      chatLinkRequiresApiKey('https://example.com#config={aionuiConfig}')
    ).toBe(true)
  })

  test('returns true for {deepchatConfig} placeholder', () => {
    expect(
      chatLinkRequiresApiKey('https://example.com#config={deepchatConfig}')
    ).toBe(true)
  })

  test('returns false for URLs without placeholders', () => {
    expect(chatLinkRequiresApiKey('https://example.com')).toBe(false)
  })
})

describe('parseChatConfig', () => {
  test('returns empty array for null', () => {
    expect(parseChatConfig(null)).toEqual([])
  })

  test('returns empty array for undefined', () => {
    expect(parseChatConfig(undefined)).toEqual([])
  })

  test('returns empty array for invalid JSON string', () => {
    expect(parseChatConfig('not json')).toEqual([])
  })

  test('returns empty array for non-array JSON', () => {
    expect(parseChatConfig('{"key": "val"}')).toEqual([])
  })

  test('parses valid config array', () => {
    const config = [{ ChatGPT: 'https://chat.example.com' }]
    const result = parseChatConfig(config)
    expect(result).toEqual([
      {
        id: '0',
        name: 'ChatGPT',
        url: 'https://chat.example.com',
        type: 'web',
      },
    ])
  })

  test('parses JSON string config', () => {
    const json = JSON.stringify([{ MyApp: 'myapp://open' }])
    const result = parseChatConfig(json)
    expect(result).toEqual([
      {
        id: '0',
        name: 'MyApp',
        url: 'myapp://open',
        type: 'custom-protocol',
      },
    ])
  })

  test('filters out entries with more than one key', () => {
    const config = [{ A: 'url1', B: 'url2' }]
    expect(parseChatConfig(config)).toEqual([])
  })

  test('filters out entries with non-string values', () => {
    const config = [{ A: 123 }]
    expect(parseChatConfig(config)).toEqual([])
  })

  test('filters out entries with empty URL', () => {
    const config = [{ A: '  ' }]
    expect(parseChatConfig(config)).toEqual([])
  })

  test('filters out null entries', () => {
    const config = [null, { Valid: 'https://valid.com' }]
    const result = parseChatConfig(config as never)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Valid')
    expect(result[0].id).toBe('1')
  })
})

describe('resolveChatUrl', () => {
  test('replaces {key} and {address} placeholders', () => {
    const result = resolveChatUrl({
      template: 'https://example.com?key={key}&addr={address}',
      apiKey: 'sk-abc123',
      serverAddress: 'https://api.example.com',
    })
    expect(result).toBe(
      'https://example.com?key=sk-abc123&addr=https%3A%2F%2Fapi.example.com'
    )
  })

  test('adds sk- prefix to key without it', () => {
    const result = resolveChatUrl({
      template: 'https://example.com?key={key}',
      apiKey: 'abc123',
      serverAddress: 'https://api.example.com',
    })
    expect(result).toBe('https://example.com?key=sk-abc123')
  })

  test('does not double-prefix sk-', () => {
    const result = resolveChatUrl({
      template: 'https://example.com?key={key}',
      apiKey: 'sk-test',
      serverAddress: 'https://api.example.com',
    })
    expect(result).toBe('https://example.com?key=sk-test')
  })

  test('handles {cherryConfig} placeholder', () => {
    const result = resolveChatUrl({
      template: 'https://cherry.com#config={cherryConfig}',
      apiKey: 'sk-key',
      serverAddress: 'https://api.example.com',
    })
    expect(result).toContain('https://cherry.com#config=')
    expect(result).not.toContain('{cherryConfig}')
  })

  test('handles {aionuiConfig} placeholder', () => {
    const result = resolveChatUrl({
      template: 'https://aionui.com#config={aionuiConfig}',
      apiKey: 'sk-key',
      serverAddress: 'https://api.example.com',
    })
    expect(result).not.toContain('{aionuiConfig}')
  })

  test('handles {deepchatConfig} placeholder', () => {
    const result = resolveChatUrl({
      template: 'https://deepchat.com#config={deepchatConfig}',
      apiKey: 'sk-key',
      serverAddress: 'https://api.example.com',
    })
    expect(result).not.toContain('{deepchatConfig}')
  })

  test('returns template as-is when no placeholders and no key/address', () => {
    const result = resolveChatUrl({
      template: 'https://example.com',
      serverAddress: '',
    })
    expect(result).toBe('https://example.com')
  })

  test('handles empty apiKey', () => {
    const result = resolveChatUrl({
      template: 'https://example.com?key={key}',
      apiKey: '',
      serverAddress: '',
    })
    expect(result).toBe('https://example.com?key={key}')
  })

  test('handles undefined apiKey', () => {
    const result = resolveChatUrl({
      template: 'https://example.com?key={key}',
      serverAddress: '',
    })
    expect(result).toBe('https://example.com?key={key}')
  })
})
