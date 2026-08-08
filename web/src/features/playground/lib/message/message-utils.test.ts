import {
  createMessageVersion,
  getCurrentVersion,
  getMessageContent,
  hasMessageContent,
  updateCurrentVersionContent,
  createUserMessage,
  createLoadingAssistantMessage,
  buildMessageContent,
  getTextContent,
  formatMessageForAPI,
  isValidMessage,
} from './message-utils'
import type { Message, MessageVersion } from '../../types'

vi.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}))

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'user',
    versions: [{ id: 'v1', content: 'hello' }],
    ...overrides,
  }
}

describe('createMessageVersion', () => {
  test('returns a version with the given content', () => {
    const version = createMessageVersion('test content')
    expect(version.id).toBe('test-id')
    expect(version.content).toBe('test content')
  })

  test('handles empty content', () => {
    const version = createMessageVersion('')
    expect(version.content).toBe('')
  })
})

describe('getCurrentVersion', () => {
  test('returns the first version', () => {
    const msg = makeMessage({
      versions: [
        { id: 'v1', content: 'first' },
        { id: 'v2', content: 'second' },
      ],
    })
    expect(getCurrentVersion(msg)).toEqual({ id: 'v1', content: 'first' })
  })

  test('returns fallback when versions is empty', () => {
    const msg = makeMessage({ versions: [] })
    expect(getCurrentVersion(msg)).toEqual({ id: 'default', content: '' })
  })
})

describe('getMessageContent', () => {
  test('returns content of the first version', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'hello world' }],
    })
    expect(getMessageContent(msg)).toBe('hello world')
  })

  test('returns empty string when versions is empty', () => {
    const msg = makeMessage({ versions: [] })
    expect(getMessageContent(msg)).toBe('')
  })
})

describe('hasMessageContent', () => {
  test('returns true when content is non-empty', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'some text' }],
    })
    expect(hasMessageContent(msg)).toBe(true)
  })

  test('returns false when content is empty', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
    })
    expect(hasMessageContent(msg)).toBe(false)
  })

  test('returns false when content is only whitespace', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '   ' }],
    })
    expect(hasMessageContent(msg)).toBe(false)
  })
})

describe('updateCurrentVersionContent', () => {
  test('returns a new message with updated content', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'old' }],
    })
    const updated = updateCurrentVersionContent(msg, 'new content')
    expect(updated.versions[0].content).toBe('new content')
    expect(updated.versions[0].id).toBe('v1')
    expect(updated.key).toBe(msg.key)
  })

  test('does not mutate the original message', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'old' }],
    })
    updateCurrentVersionContent(msg, 'new content')
    expect(msg.versions[0].content).toBe('old')
  })
})

describe('createUserMessage', () => {
  test('creates a user message with the given content', () => {
    const msg = createUserMessage('hello', 1000)
    expect(msg.key).toBe('test-id')
    expect(msg.from).toBe('user')
    expect(msg.versions).toHaveLength(1)
    expect(msg.versions[0].content).toBe('hello')
    expect(msg.createdAt).toBe(1000)
  })

  test('uses Date.now() as default createdAt', () => {
    const before = Date.now()
    const msg = createUserMessage('test')
    const after = Date.now()
    expect(msg.createdAt).toBeGreaterThanOrEqual(before)
    expect(msg.createdAt).toBeLessThanOrEqual(after)
  })
})

describe('createLoadingAssistantMessage', () => {
  test('creates a loading assistant message', () => {
    const msg = createLoadingAssistantMessage(2000)
    expect(msg.from).toBe('assistant')
    expect(msg.versions[0].content).toBe('')
    expect(msg.startedAt).toBe(2000)
    expect(msg.createdAt).toBe(2000)
    expect(msg.status).toBe('loading')
    expect(msg.isReasoningComplete).toBe(false)
    expect(msg.isContentComplete).toBe(false)
    expect(msg.isReasoningStreaming).toBe(false)
    expect(msg.reasoning).toBeUndefined()
  })
})

describe('buildMessageContent', () => {
  test('returns plain string when no images', () => {
    expect(buildMessageContent('hello')).toBe('hello')
  })

  test('returns plain string when imageUrls is empty', () => {
    expect(buildMessageContent('hello', [])).toBe('hello')
  })

  test('returns plain string when all image URLs are whitespace', () => {
    expect(buildMessageContent('hello', ['  ', ''])).toBe('hello')
  })

  test('returns ContentPart array when valid images are present', () => {
    const result = buildMessageContent('text', ['http://img.png'])
    expect(Array.isArray(result)).toBe(true)
    const parts = result as Array<{ type: string; text?: string; image_url?: { url: string } }>
    expect(parts).toHaveLength(2)
    expect(parts[0]).toEqual({ type: 'text', text: 'text' })
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'http://img.png' },
    })
  })

  test('trims image URLs', () => {
    const result = buildMessageContent('hi', ['  http://img.png  '])
    const parts = result as Array<{ type: string; image_url?: { url: string } }>
    expect(parts[1].image_url?.url).toBe('http://img.png')
  })

  test('filters out blank image URLs while keeping valid ones', () => {
    const result = buildMessageContent('hi', ['', 'http://a.png', '  '])
    const parts = result as Array<{ type: string }>
    expect(parts).toHaveLength(2)
  })
})

describe('getTextContent', () => {
  test('returns string content directly', () => {
    expect(getTextContent('hello')).toBe('hello')
  })

  test('extracts text from ContentPart array', () => {
    const parts = [
      { type: 'text' as const, text: 'hello' },
      { type: 'image_url' as const, image_url: { url: 'http://img.png' } },
    ]
    expect(getTextContent(parts)).toBe('hello')
  })

  test('returns empty string when no text part exists', () => {
    const parts = [
      { type: 'image_url' as const, image_url: { url: 'http://img.png' } },
    ]
    expect(getTextContent(parts)).toBe('')
  })

  test('returns empty string for empty array', () => {
    expect(getTextContent([])).toBe('')
  })
})

describe('formatMessageForAPI', () => {
  test('formats a message for API request', () => {
    const msg = makeMessage({
      from: 'user',
      versions: [{ id: 'v1', content: 'How are you?' }],
    })
    expect(formatMessageForAPI(msg)).toEqual({
      role: 'user',
      content: 'How are you?',
    })
  })

  test('uses the first version content', () => {
    const msg = makeMessage({
      from: 'assistant',
      versions: [
        { id: 'v1', content: 'first' },
        { id: 'v2', content: 'second' },
      ],
    })
    expect(formatMessageForAPI(msg).content).toBe('first')
  })
})

describe('isValidMessage', () => {
  test('returns true for a valid user message with content', () => {
    const msg = makeMessage({ from: 'user', versions: [{ id: 'v1', content: 'hello' }] })
    expect(isValidMessage(msg)).toBe(true)
  })

  test('returns true for a valid user message with empty content', () => {
    const msg = makeMessage({ from: 'user', versions: [{ id: 'v1', content: '' }] })
    expect(isValidMessage(msg)).toBe(true)
  })

  test('returns true for assistant message with content', () => {
    const msg = makeMessage({
      from: 'assistant',
      versions: [{ id: 'v1', content: 'response' }],
    })
    expect(isValidMessage(msg)).toBe(true)
  })

  test('returns false for assistant message with empty content', () => {
    const msg = makeMessage({
      from: 'assistant',
      versions: [{ id: 'v1', content: '' }],
    })
    expect(isValidMessage(msg)).toBe(false)
  })

  test('returns false when versions array is empty', () => {
    const msg = makeMessage({ versions: [] })
    expect(isValidMessage(msg)).toBe(false)
  })

  test('returns false for null/undefined message', () => {
    expect(isValidMessage(null as unknown as Message)).toBe(false)
    expect(isValidMessage(undefined as unknown as Message)).toBe(false)
  })

  test('returns false when from is missing', () => {
    const msg = makeMessage({ from: '' as 'user' })
    expect(isValidMessage(msg)).toBe(false)
  })
})
