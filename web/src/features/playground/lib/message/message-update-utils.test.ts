import {
  updateAssistantMessageWithError,
  updateLastAssistantMessage,
} from './message-update-utils'
import type { Message } from '../../types'

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
    versions: [{ id: 'v1', content: '' }],
    startedAt: 1000,
    ...overrides,
  }
}

describe('updateLastAssistantMessage', () => {
  test('updates the last message when it is an assistant message', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateLastAssistantMessage(messages, (msg) => ({
      ...msg,
      versions: [{ id: 'v1', content: 'updated' }],
    }))
    expect(result[1].versions[0].content).toBe('updated')
  })

  test('returns original array when last message is not assistant', () => {
    const messages = [
      makeAssistantMessage({ key: 'a1' }),
      makeMessage({ key: 'u1' }),
    ]
    const result = updateLastAssistantMessage(messages, (msg) => ({
      ...msg,
      versions: [{ id: 'v1', content: 'should not update' }],
    }))
    expect(result).toBe(messages)
  })

  test('returns original array when messages is empty', () => {
    const messages: Message[] = []
    const result = updateLastAssistantMessage(messages, (msg) => msg)
    expect(result).toBe(messages)
  })

  test('does not mutate original array', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateLastAssistantMessage(messages, (msg) => ({
      ...msg,
      versions: [{ id: 'v1', content: 'updated' }],
    }))
    expect(messages[1].versions[0].content).toBe('')
    expect(result[1].versions[0].content).toBe('updated')
  })

  test('preserves earlier messages', () => {
    const messages = [
      makeMessage({ key: 'u1', versions: [{ id: 'v1', content: 'user msg' }] }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateLastAssistantMessage(messages, (msg) => ({
      ...msg,
      versions: [{ id: 'v1', content: 'updated' }],
    }))
    expect(result[0].versions[0].content).toBe('user msg')
  })
})

describe('updateAssistantMessageWithError', () => {
  test('updates last assistant message with error content', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateAssistantMessageWithError(
      messages,
      'Something went wrong'
    )
    expect(result[1].status).toBe('error')
    expect(result[1].versions[0].content).toContain('Something went wrong')
    expect(result[1].isReasoningStreaming).toBe(false)
  })

  test('includes error code when provided', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateAssistantMessageWithError(
      messages,
      'Price error',
      'model_price_error'
    )
    expect(result[1].errorCode).toBe('model_price_error')
  })

  test('sets errorCode to null when not provided', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateAssistantMessageWithError(messages, 'Error')
    expect(result[1].errorCode).toBeNull()
  })

  test('uses default title in error content', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateAssistantMessageWithError(messages, 'details')
    expect(result[1].versions[0].content).toContain('Request error occurred')
    expect(result[1].versions[0].content).toContain('details')
  })

  test('uses custom title when provided', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1' }),
    ]
    const result = updateAssistantMessageWithError(
      messages,
      'details',
      undefined,
      'Custom Error'
    )
    expect(result[1].versions[0].content).toContain('Custom Error')
    expect(result[1].versions[0].content).toContain('details')
  })

  test('sets timing fields', () => {
    const messages = [
      makeMessage({ key: 'u1' }),
      makeAssistantMessage({ key: 'a1', startedAt: 1000 }),
    ]
    const result = updateAssistantMessageWithError(messages, 'error')
    expect(result[1].completedAt).toBeDefined()
    expect(result[1].durationMs).toBeDefined()
  })

  test('returns original array when last message is not assistant', () => {
    const messages = [
      makeAssistantMessage({ key: 'a1' }),
      makeMessage({ key: 'u1' }),
    ]
    const result = updateAssistantMessageWithError(messages, 'error')
    expect(result).toBe(messages)
  })

  test('returns original array when messages is empty', () => {
    const result = updateAssistantMessageWithError([], 'error')
    expect(result).toEqual([])
  })
})
