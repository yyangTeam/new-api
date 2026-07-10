import {
  processStreamingContent,
  applyStreamingChunk,
  finalizeMessage,
  completeAssistantMessage,
  isAssistantMessageFinal,
  isAssistantMessagePending,
  isPendingAssistantMessage,
  hasChatCompletionChoice,
  applyChatCompletionChoice,
  applyChatCompletionResponse,
  sanitizeMessagesOnLoad,
} from './message-streaming-utils'
import type { Message, ChatCompletionResponse } from '../../types'

vi.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}))

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'assistant',
    versions: [{ id: 'v1', content: '' }],
    status: 'streaming',
    ...overrides,
  }
}

function makeUserMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'user-1',
    from: 'user',
    versions: [{ id: 'v1', content: 'hello' }],
    ...overrides,
  }
}

describe('processStreamingContent', () => {
  test('appends content chunk to current version', () => {
    const msg = makeMessage({ versions: [{ id: 'v1', content: 'Hello' }] })
    const result = processStreamingContent(msg, ' World')
    expect(result.versions[0].content).toBe('Hello World')
  })

  test('keeps content when no chunk provided', () => {
    const msg = makeMessage({ versions: [{ id: 'v1', content: 'Hello' }] })
    const result = processStreamingContent(msg)
    expect(result.versions[0].content).toBe('Hello')
  })

  test('sets isReasoningStreaming to false when no think tags', () => {
    const msg = makeMessage({ versions: [{ id: 'v1', content: '' }] })
    const result = processStreamingContent(msg, 'plain text')
    expect(result.isReasoningStreaming).toBe(false)
  })

  test('detects unclosed think tag and sets isReasoningStreaming', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      reasoning: { content: '', duration: 0 },
    })
    const result = processStreamingContent(msg, '<think>reasoning in progress')
    expect(result.isReasoningStreaming).toBe(true)
    expect(result.reasoning?.content).toBe('reasoning in progress')
  })

  test('extracts reasoning from completed think tags', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      reasoning: { content: '', duration: 0 },
    })
    const result = processStreamingContent(
      msg,
      '<think>done thinking</think>visible'
    )
    expect(result.isReasoningStreaming).toBe(false)
    expect(result.reasoning?.content).toBe('done thinking')
  })
})

describe('applyStreamingChunk', () => {
  test('returns message unchanged if status is error', () => {
    const msg = makeMessage({ status: 'error' })
    const result = applyStreamingChunk(msg, 'content', 'new text')
    expect(result).toBe(msg)
  })

  test('applies reasoning chunk', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      startedAt: 1000,
    })
    const result = applyStreamingChunk(msg, 'reasoning', 'think about it')
    expect(result.reasoning?.content).toBe('think about it')
    expect(result.isReasoningStreaming).toBe(true)
    expect(result.status).toBe('streaming')
  })

  test('applies content chunk', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'Hello' }],
      startedAt: 1000,
    })
    const result = applyStreamingChunk(msg, 'content', ' World')
    expect(result.versions[0].content).toBe('Hello World')
    expect(result.status).toBe('streaming')
  })

  test('deduplicates reasoning chunk when it starts with existing content', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      reasoning: { content: 'partial', duration: 0, startedAt: 1000 },
      startedAt: 1000,
    })
    const result = applyStreamingChunk(msg, 'reasoning', 'partial reasoning')
    expect(result.reasoning?.content).toBe('partial reasoning')
  })
})

describe('finalizeMessage', () => {
  test('cleans think tags from content', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '<think>reason</think>visible' }],
    })
    const result = finalizeMessage(msg)
    expect(result.versions[0].content).toBe('visible')
    expect(result.isReasoningStreaming).toBe(false)
  })

  test('uses apiReasoningContent when provided', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'content' }],
    })
    const result = finalizeMessage(msg, 'api reasoning')
    expect(result.reasoning?.content).toBe('api reasoning')
  })

  test('uses existing reasoning when no think tags and no api reasoning', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'content' }],
      reasoning: { content: 'existing reasoning', duration: 0 },
    })
    const result = finalizeMessage(msg)
    expect(result.reasoning?.content).toBe('existing reasoning')
  })

  test('removes reasoning when there is none', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'content' }],
    })
    const result = finalizeMessage(msg)
    expect(result.reasoning).toBeUndefined()
  })
})

describe('completeAssistantMessage', () => {
  test('sets status to complete', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'response' }],
      startedAt: 1000,
    })
    const result = completeAssistantMessage(msg)
    expect(result.status).toBe('complete')
  })

  test('finalizes content and timing', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: 'response' }],
      startedAt: 1000,
    })
    const result = completeAssistantMessage(msg)
    expect(result.completedAt).toBeDefined()
    expect(result.durationMs).toBeDefined()
  })
})

describe('isAssistantMessageFinal', () => {
  test('returns true for complete status', () => {
    expect(isAssistantMessageFinal(makeMessage({ status: 'complete' }))).toBe(true)
  })

  test('returns true for error status', () => {
    expect(isAssistantMessageFinal(makeMessage({ status: 'error' }))).toBe(true)
  })

  test('returns false for loading status', () => {
    expect(isAssistantMessageFinal(makeMessage({ status: 'loading' }))).toBe(false)
  })

  test('returns false for streaming status', () => {
    expect(isAssistantMessageFinal(makeMessage({ status: 'streaming' }))).toBe(false)
  })
})

describe('isAssistantMessagePending', () => {
  test('returns true for loading status', () => {
    expect(isAssistantMessagePending(makeMessage({ status: 'loading' }))).toBe(true)
  })

  test('returns true for streaming status', () => {
    expect(isAssistantMessagePending(makeMessage({ status: 'streaming' }))).toBe(true)
  })

  test('returns false for complete status', () => {
    expect(isAssistantMessagePending(makeMessage({ status: 'complete' }))).toBe(false)
  })

  test('returns false for error status', () => {
    expect(isAssistantMessagePending(makeMessage({ status: 'error' }))).toBe(false)
  })
})

describe('isPendingAssistantMessage', () => {
  test('returns true for assistant message with loading status', () => {
    expect(
      isPendingAssistantMessage(makeMessage({ from: 'assistant', status: 'loading' }))
    ).toBe(true)
  })

  test('returns true for assistant message with streaming status', () => {
    expect(
      isPendingAssistantMessage(makeMessage({ from: 'assistant', status: 'streaming' }))
    ).toBe(true)
  })

  test('returns false for user message', () => {
    expect(
      isPendingAssistantMessage(makeUserMessage({ status: 'loading' }))
    ).toBe(false)
  })

  test('returns false for complete assistant message', () => {
    expect(
      isPendingAssistantMessage(makeMessage({ from: 'assistant', status: 'complete' }))
    ).toBe(false)
  })

  test('returns false for undefined message', () => {
    expect(isPendingAssistantMessage(undefined)).toBe(false)
  })
})

describe('hasChatCompletionChoice', () => {
  test('returns true when choices has at least one element', () => {
    const response = {
      id: '1',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4',
      choices: [
        { index: 0, message: { role: 'assistant' as const, content: 'hi' }, finish_reason: 'stop' },
      ],
    }
    expect(hasChatCompletionChoice(response)).toBe(true)
  })

  test('returns false when choices is empty', () => {
    const response = {
      id: '1',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4',
      choices: [],
    }
    expect(hasChatCompletionChoice(response)).toBe(false)
  })

  test('returns false when choices is undefined', () => {
    const response = {
      id: '1',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4',
    } as unknown as ChatCompletionResponse
    expect(hasChatCompletionChoice(response)).toBe(false)
  })
})

describe('applyChatCompletionChoice', () => {
  test('applies choice content to message', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      startedAt: 1000,
    })
    const choice = {
      index: 0,
      message: { role: 'assistant' as const, content: 'response text' },
      finish_reason: 'stop',
    }
    const result = applyChatCompletionChoice(msg, choice)
    expect(result.versions[0].content).toBe('response text')
    expect(result.status).toBe('complete')
  })

  test('applies reasoning_content from choice', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      startedAt: 1000,
    })
    const choice = {
      index: 0,
      message: {
        role: 'assistant' as const,
        content: 'response',
        reasoning_content: 'thinking process',
      },
      finish_reason: 'stop',
    }
    const result = applyChatCompletionChoice(msg, choice)
    expect(result.reasoning?.content).toBe('thinking process')
  })
})

describe('applyChatCompletionResponse', () => {
  test('applies first choice from response', () => {
    const msg = makeMessage({
      versions: [{ id: 'v1', content: '' }],
      startedAt: 1000,
    })
    const response: ChatCompletionResponse = {
      id: '1',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' },
      ],
    }
    const result = applyChatCompletionResponse(msg, response)
    expect(result).not.toBeNull()
    expect(result!.versions[0].content).toBe('hello')
  })

  test('returns null when no choices', () => {
    const msg = makeMessage({ versions: [{ id: 'v1', content: '' }] })
    const response: ChatCompletionResponse = {
      id: '1',
      object: 'chat.completion',
      created: 0,
      model: 'gpt-4',
      choices: [],
    }
    expect(applyChatCompletionResponse(msg, response)).toBeNull()
  })
})

describe('sanitizeMessagesOnLoad', () => {
  test('returns original array when no pending assistant messages', () => {
    const messages = [
      makeUserMessage(),
      makeMessage({ status: 'complete', versions: [{ id: 'v1', content: 'done' }] }),
    ]
    const result = sanitizeMessagesOnLoad(messages)
    expect(result).toBe(messages)
  })

  test('completes a pending assistant message with content', () => {
    const messages = [
      makeUserMessage(),
      makeMessage({
        from: 'assistant',
        status: 'streaming',
        versions: [{ id: 'v1', content: 'partial response' }],
        startedAt: 1000,
      }),
    ]
    const result = sanitizeMessagesOnLoad(messages)
    expect(result[1].status).toBe('complete')
    expect(result[1].versions[0].content).toBe('partial response')
  })

  test('marks empty pending assistant message as error', () => {
    const messages = [
      makeUserMessage(),
      makeMessage({
        from: 'assistant',
        status: 'loading',
        versions: [{ id: 'v1', content: '' }],
        startedAt: 1000,
      }),
    ]
    const result = sanitizeMessagesOnLoad(messages)
    expect(result[1].status).toBe('error')
  })

  test('only sanitizes the last pending assistant message', () => {
    const messages = [
      makeMessage({
        key: 'a1',
        from: 'assistant',
        status: 'streaming',
        versions: [{ id: 'v1', content: 'first' }],
        startedAt: 1000,
      }),
      makeUserMessage({ key: 'u1' }),
      makeMessage({
        key: 'a2',
        from: 'assistant',
        status: 'loading',
        versions: [{ id: 'v2', content: '' }],
        startedAt: 2000,
      }),
    ]
    const result = sanitizeMessagesOnLoad(messages)
    expect(result[0].status).toBe('streaming')
    expect(result[2].status).toBe('error')
  })

  test('returns empty array unchanged', () => {
    expect(sanitizeMessagesOnLoad([])).toEqual([])
  })

  test('preserves reasoning in pending message with reasoning only', () => {
    const messages = [
      makeMessage({
        from: 'assistant',
        status: 'streaming',
        versions: [{ id: 'v1', content: '' }],
        reasoning: { content: 'some thinking', duration: 0 },
        startedAt: 1000,
      }),
    ]
    const result = sanitizeMessagesOnLoad(messages)
    expect(result[0].status).toBe('complete')
  })
})
