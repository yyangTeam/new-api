import {
  playgroundConfigSchema,
  parameterEnabledSchema,
  messagesSchema,
} from './storage-schema'

describe('playgroundConfigSchema', () => {
  test('parses valid config with all fields', () => {
    const config = {
      model: 'gpt-4',
      group: 'default',
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 4096,
      frequency_penalty: 0.5,
      presence_penalty: 0.3,
      seed: 42,
      stream: true,
    }
    const result = playgroundConfigSchema.safeParse(config)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.model).toBe('gpt-4')
      expect(result.data.temperature).toBe(0.7)
      expect(result.data.max_tokens).toBe(4096)
      expect(result.data.stream).toBe(true)
      expect(result.data.seed).toBe(42)
    }
  })

  test('parses empty config (all fields optional)', () => {
    const result = playgroundConfigSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('accepts null seed', () => {
    const result = playgroundConfigSchema.safeParse({ seed: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.seed).toBeNull()
    }
  })

  test('rejects non-string model', () => {
    const result = playgroundConfigSchema.safeParse({ model: 123 })
    expect(result.success).toBe(false)
  })

  test('rejects non-number temperature', () => {
    const result = playgroundConfigSchema.safeParse({ temperature: 'hot' })
    expect(result.success).toBe(false)
  })

  test('rejects non-boolean stream', () => {
    const result = playgroundConfigSchema.safeParse({ stream: 'yes' })
    expect(result.success).toBe(false)
  })

  test('accepts zero values for numeric fields', () => {
    const result = playgroundConfigSchema.safeParse({
      temperature: 0,
      top_p: 0,
      max_tokens: 0,
      frequency_penalty: 0,
      presence_penalty: 0,
    })
    expect(result.success).toBe(true)
  })
})

describe('parameterEnabledSchema', () => {
  test('parses valid enabled flags', () => {
    const result = parameterEnabledSchema.safeParse({
      temperature: true,
      top_p: false,
      max_tokens: true,
      frequency_penalty: false,
      presence_penalty: true,
      seed: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.temperature).toBe(true)
      expect(result.data.top_p).toBe(false)
    }
  })

  test('parses empty object (all fields optional)', () => {
    const result = parameterEnabledSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('rejects non-boolean values', () => {
    const result = parameterEnabledSchema.safeParse({
      temperature: 'yes',
    })
    expect(result.success).toBe(false)
  })

  test('rejects numeric values', () => {
    const result = parameterEnabledSchema.safeParse({
      max_tokens: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('messagesSchema', () => {
  test('parses valid messages array', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'user',
        versions: [{ id: 'v1', content: 'Hello' }],
      },
      {
        key: 'msg-2',
        from: 'assistant',
        versions: [{ id: 'v1', content: 'Hi there!' }],
        createdAt: 1700000000,
        status: 'complete',
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(2)
      expect(result.data[0].from).toBe('user')
      expect(result.data[1].status).toBe('complete')
    }
  })

  test('parses empty array', () => {
    const result = messagesSchema.safeParse([])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(0)
    }
  })

  test('accepts system role', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'system',
        versions: [{ id: 'v1', content: 'You are a helpful assistant.' }],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(true)
  })

  test('rejects invalid role', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'tool',
        versions: [{ id: 'v1', content: 'result' }],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })

  test('rejects message with empty versions array', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'user',
        versions: [],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })

  test('rejects message without key', () => {
    const messages = [
      {
        from: 'user',
        versions: [{ id: 'v1', content: 'Hello' }],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })

  test('rejects message without from', () => {
    const messages = [
      {
        key: 'msg-1',
        versions: [{ id: 'v1', content: 'Hello' }],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })

  test('accepts message with all optional fields', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'assistant',
        versions: [
          { id: 'v1', content: 'Response A' },
          { id: 'v2', content: 'Response B' },
        ],
        createdAt: 1700000000,
        startedAt: 1700000001,
        completedAt: 1700000005,
        durationMs: 4000,
        sources: [
          { href: 'https://example.com', title: 'Example' },
        ],
        reasoning: {
          content: 'Thinking steps...',
          duration: 2.5,
          startedAt: 1700000001,
          completedAt: 1700000003,
          durationMs: 2000,
        },
        isReasoningStreaming: false,
        isReasoningComplete: true,
        isContentComplete: true,
        status: 'complete',
        errorCode: null,
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0].sources).toHaveLength(1)
      expect(result.data[0].reasoning?.content).toBe('Thinking steps...')
      expect(result.data[0].versions).toHaveLength(2)
    }
  })

  test('accepts all valid status values', () => {
    for (const status of ['loading', 'streaming', 'complete', 'error']) {
      const messages = [
        {
          key: 'msg-1',
          from: 'assistant',
          versions: [{ id: 'v1', content: '' }],
          status,
        },
      ]
      const result = messagesSchema.safeParse(messages)
      expect(result.success).toBe(true)
    }
  })

  test('rejects invalid status', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'assistant',
        versions: [{ id: 'v1', content: '' }],
        status: 'pending',
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })

  test('rejects version without id', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'user',
        versions: [{ content: 'Hello' }],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })

  test('rejects version without content', () => {
    const messages = [
      {
        key: 'msg-1',
        from: 'user',
        versions: [{ id: 'v1' }],
      },
    ]
    const result = messagesSchema.safeParse(messages)
    expect(result.success).toBe(false)
  })
})
