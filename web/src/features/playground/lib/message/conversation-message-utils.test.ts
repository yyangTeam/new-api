import {
  appendUserMessagePair,
  createRegeneratedMessages,
  removeMessageByKey,
  getPreviousUserMessage,
  applyMessageEdit,
  getEditingMessageContent,
  getChatMessageRenderState,
} from './conversation-message-utils'
import type { Message } from '../../types'

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

function makeAssistantMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'assistant-1',
    from: 'assistant',
    versions: [{ id: 'v1', content: 'response' }],
    ...overrides,
  }
}

describe('appendUserMessagePair', () => {
  test('appends user message and loading assistant message', () => {
    const messages = [makeMessage({ key: 'existing' })]
    const result = appendUserMessagePair(messages, 'new message')
    expect(result).toHaveLength(3)
    expect(result[1].from).toBe('user')
    expect(result[1].versions[0].content).toBe('new message')
    expect(result[2].from).toBe('assistant')
    expect(result[2].status).toBe('loading')
    expect(result[2].versions[0].content).toBe('')
  })

  test('appends to empty array', () => {
    const result = appendUserMessagePair([], 'first message')
    expect(result).toHaveLength(2)
    expect(result[0].from).toBe('user')
    expect(result[1].from).toBe('assistant')
  })

  test('preserves existing messages', () => {
    const existing = [makeMessage({ key: 'existing', versions: [{ id: 'v1', content: 'old' }] })]
    const result = appendUserMessagePair(existing, 'new')
    expect(result[0].key).toBe('existing')
    expect(result[0].versions[0].content).toBe('old')
  })
})

describe('createRegeneratedMessages', () => {
  test('returns null when messageKey not found', () => {
    const messages = [makeMessage({ key: 'a' })]
    expect(createRegeneratedMessages(messages, 'nonexistent')).toBeNull()
  })

  test('keeps user message and adds loading assistant when regenerating from user message', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = createRegeneratedMessages(messages, 'u1')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0].key).toBe('u1')
    expect(result![1].from).toBe('assistant')
    expect(result![1].status).toBe('loading')
  })

  test('replaces assistant message with loading assistant when regenerating from assistant message', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = createRegeneratedMessages(messages, 'a1')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
    expect(result![0].key).toBe('u1')
    expect(result![1].from).toBe('assistant')
    expect(result![1].status).toBe('loading')
  })

  test('truncates messages after the target', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
      makeMessage({ key: 'u2' }),
      makeAssistantMessage({ key: 'a2' }),
    ]
    const result = createRegeneratedMessages(messages, 'u1')
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })
})

describe('removeMessageByKey', () => {
  test('removes message with matching key', () => {
    const messages = [
      makeMessage({ key: 'a' }),
      makeMessage({ key: 'b' }),
      makeMessage({ key: 'c' }),
    ]
    const result = removeMessageByKey(messages, 'b')
    expect(result).toHaveLength(2)
    expect(result.map((m) => m.key)).toEqual(['a', 'c'])
  })

  test('returns all messages when key not found', () => {
    const messages = [makeMessage({ key: 'a' })]
    const result = removeMessageByKey(messages, 'nonexistent')
    expect(result).toHaveLength(1)
  })

  test('handles empty array', () => {
    expect(removeMessageByKey([], 'a')).toEqual([])
  })
})

describe('getPreviousUserMessage', () => {
  test('returns previous user message before given index', () => {
    const messages = [
      makeMessage({ key: 'u1', from: 'user' }),
      makeAssistantMessage({ key: 'a1' }),
      makeMessage({ key: 'u2', from: 'user' }),
      makeAssistantMessage({ key: 'a2' }),
    ]
    const result = getPreviousUserMessage(messages, 3)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('u2')
  })

  test('skips assistant messages', () => {
    const messages = [
      makeMessage({ key: 'u1', from: 'user' }),
      makeAssistantMessage({ key: 'a1' }),
      makeAssistantMessage({ key: 'a2' }),
    ]
    const result = getPreviousUserMessage(messages, 2)
    expect(result).not.toBeNull()
    expect(result!.key).toBe('u1')
  })

  test('returns null when no user message before index', () => {
    const messages = [
      makeAssistantMessage({ key: 'a1' }),
      makeAssistantMessage({ key: 'a2' }),
    ]
    expect(getPreviousUserMessage(messages, 1)).toBeNull()
  })

  test('returns null when beforeIndex is 0', () => {
    const messages = [makeMessage({ key: 'u1' })]
    expect(getPreviousUserMessage(messages, 0)).toBeNull()
  })
})

describe('applyMessageEdit', () => {
  test('returns null when message not found', () => {
    const messages = [makeMessage({ key: 'a' })]
    expect(applyMessageEdit(messages, 'nonexistent', 'new', false)).toBeNull()
  })

  test('updates content without submitting', () => {
    const messages = [makeMessage({ key: 'u1', from: 'user', createdAt: 1000 })]
    const result = applyMessageEdit(messages, 'u1', 'edited text', false)
    expect(result).not.toBeNull()
    expect(result!.shouldSend).toBe(false)
    expect(result!.messages[0].versions[0].content).toBe('edited text')
    expect(result!.messages[0].createdAt).toBe(1000)
  })

  test('submits edited user message with new assistant loading', () => {
    const messages = [
      makeMessage({ key: 'u1', from: 'user' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = applyMessageEdit(messages, 'u1', 'edited', true)
    expect(result).not.toBeNull()
    expect(result!.shouldSend).toBe(true)
    expect(result!.messages).toHaveLength(2)
    expect(result!.messages[0].versions[0].content).toBe('edited')
    expect(result!.messages[1].from).toBe('assistant')
    expect(result!.messages[1].status).toBe('loading')
  })

  test('does not submit when editing assistant message', () => {
    const messages = [makeAssistantMessage({ key: 'a1' })]
    const result = applyMessageEdit(messages, 'a1', 'edited response', true)
    expect(result).not.toBeNull()
    expect(result!.shouldSend).toBe(false)
  })

  test('updates createdAt when submitting user message', () => {
    const messages = [makeMessage({ key: 'u1', from: 'user', createdAt: 1000 })]
    const result = applyMessageEdit(messages, 'u1', 'edited', true)
    expect(result).not.toBeNull()
    expect(result!.messages[0].createdAt).not.toBe(1000)
  })
})

describe('getEditingMessageContent', () => {
  test('returns empty string when editingKey is null', () => {
    const messages = [makeMessage({ key: 'a' })]
    expect(getEditingMessageContent(messages, null)).toBe('')
  })

  test('returns empty string when editingKey is undefined', () => {
    const messages = [makeMessage({ key: 'a' })]
    expect(getEditingMessageContent(messages)).toBe('')
  })

  test('returns content of message matching editingKey', () => {
    const messages = [
      makeMessage({ key: 'u1', versions: [{ id: 'v1', content: 'hello world' }] }),
    ]
    expect(getEditingMessageContent(messages, 'u1')).toBe('hello world')
  })

  test('returns empty string when editingKey not found', () => {
    const messages = [makeMessage({ key: 'u1' })]
    expect(getEditingMessageContent(messages, 'nonexistent')).toBe('')
  })
})

describe('getChatMessageRenderState', () => {
  test('returns alwaysShowActions for last assistant message', () => {
    const messages = [
      makeMessage({ key: 'u1', from: 'user' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const state = getChatMessageRenderState(messages, messages[1], 1)
    expect(state.alwaysShowActions).toBe(true)
  })

  test('does not always show actions for non-last message', () => {
    const messages = [
      makeAssistantMessage({ key: 'a1' }),
      makeMessage({ key: 'u1', from: 'user' }),
    ]
    const state = getChatMessageRenderState(messages, messages[0], 0)
    expect(state.alwaysShowActions).toBe(false)
  })

  test('does not always show actions for last user message', () => {
    const messages = [
      makeAssistantMessage({ key: 'a1' }),
      makeMessage({ key: 'u1', from: 'user' }),
    ]
    const state = getChatMessageRenderState(messages, messages[1], 1)
    expect(state.alwaysShowActions).toBe(false)
  })

  test('returns content from message', () => {
    const messages = [
      makeMessage({ key: 'u1', versions: [{ id: 'v1', content: 'test content' }] }),
    ]
    const state = getChatMessageRenderState(messages, messages[0], 0)
    expect(state.content).toBe('test content')
  })

  test('returns isEditing true when editingKey matches', () => {
    const messages = [makeMessage({ key: 'u1' })]
    const state = getChatMessageRenderState(messages, messages[0], 0, 'u1')
    expect(state.isEditing).toBe(true)
  })

  test('returns isEditing false when editingKey does not match', () => {
    const messages = [makeMessage({ key: 'u1' })]
    const state = getChatMessageRenderState(messages, messages[0], 0, 'other')
    expect(state.isEditing).toBe(false)
  })

  test('returns isEditing false when editingKey is undefined', () => {
    const messages = [makeMessage({ key: 'u1' })]
    const state = getChatMessageRenderState(messages, messages[0], 0)
    expect(state.isEditing).toBe(false)
  })
})
