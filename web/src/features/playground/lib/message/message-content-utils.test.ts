import { getMessageContentState } from './message-content-utils'
import type { Message } from '../../types'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'user',
    versions: [{ id: 'v1', content: 'hello' }],
    ...overrides,
  }
}

describe('getMessageContentState', () => {
  test('returns correct state for user message', () => {
    const msg = makeMessage({ from: 'user' })
    const state = getMessageContentState(msg, 'hello world')
    expect(state.isAssistant).toBe(false)
    expect(state.displayContent).toBe('hello world')
    expect(state.showMessageContent).toBe(true)
    expect(state.showLoader).toBe(false)
    expect(state.hasReasoning).toBe(false)
    expect(state.hasSources).toBe(false)
    expect(state.sources).toEqual([])
  })

  test('returns correct state for assistant message with content', () => {
    const msg = makeMessage({
      from: 'assistant',
      status: 'complete',
    })
    const state = getMessageContentState(msg, 'response text')
    expect(state.isAssistant).toBe(true)
    expect(state.displayContent).toBe('response text')
    expect(state.showMessageContent).toBe(true)
    expect(state.showLoader).toBe(false)
  })

  test('shows loader for loading assistant with no content', () => {
    const msg = makeMessage({
      from: 'assistant',
      status: 'loading',
      isReasoningStreaming: false,
    })
    const state = getMessageContentState(msg, '')
    expect(state.showLoader).toBe(true)
    expect(state.showMessageContent).toBe(false)
  })

  test('shows loader for streaming assistant with no content', () => {
    const msg = makeMessage({
      from: 'assistant',
      status: 'streaming',
      isReasoningStreaming: false,
    })
    const state = getMessageContentState(msg, '')
    expect(state.showLoader).toBe(true)
  })

  test('does not show loader when reasoning is streaming', () => {
    const msg = makeMessage({
      from: 'assistant',
      status: 'loading',
      isReasoningStreaming: true,
    })
    const state = getMessageContentState(msg, '')
    expect(state.showLoader).toBe(false)
  })

  test('does not show loader for user message', () => {
    const msg = makeMessage({ from: 'user', status: 'loading' })
    const state = getMessageContentState(msg, '')
    expect(state.showLoader).toBe(false)
  })

  test('hides message content when reasoning is streaming for assistant', () => {
    const msg = makeMessage({
      from: 'assistant',
      isReasoningStreaming: true,
    })
    const state = getMessageContentState(msg, 'some content')
    expect(state.showMessageContent).toBe(false)
  })

  test('shows message content for user even during reasoning streaming', () => {
    const msg = makeMessage({
      from: 'user',
      isReasoningStreaming: true,
    })
    const state = getMessageContentState(msg, 'user text')
    expect(state.showMessageContent).toBe(true)
  })

  test('strips think tags from assistant display content', () => {
    const msg = makeMessage({ from: 'assistant' })
    const state = getMessageContentState(
      msg,
      '<think>reasoning</think>visible text'
    )
    expect(state.displayContent).toBe('visible text')
  })

  test('does not strip think tags from user display content', () => {
    const msg = makeMessage({ from: 'user' })
    const state = getMessageContentState(
      msg,
      '<think>not reasoning</think>text'
    )
    expect(state.displayContent).toBe('<think>not reasoning</think>text')
  })

  test('returns hasReasoning true when assistant has reasoning', () => {
    const msg = makeMessage({
      from: 'assistant',
      reasoning: { content: 'thinking...', duration: 1 },
    })
    const state = getMessageContentState(msg, 'response')
    expect(state.hasReasoning).toBe(true)
    expect(state.reasoningContent).toBe('thinking...')
  })

  test('returns hasReasoning false for user message even with reasoning field', () => {
    const msg = makeMessage({
      from: 'user',
      reasoning: { content: 'should not appear', duration: 0 },
    })
    const state = getMessageContentState(msg, 'text')
    expect(state.hasReasoning).toBe(false)
    expect(state.reasoningContent).toBeUndefined()
  })

  test('returns hasReasoning false when assistant has no reasoning', () => {
    const msg = makeMessage({ from: 'assistant' })
    const state = getMessageContentState(msg, 'response')
    expect(state.hasReasoning).toBe(false)
    expect(state.reasoningContent).toBeUndefined()
  })

  test('returns sources from message', () => {
    const sources = [
      { href: 'https://example.com', title: 'Example' },
      { href: 'https://other.com', title: 'Other' },
    ]
    const msg = makeMessage({ from: 'assistant', sources })
    const state = getMessageContentState(msg, 'response')
    expect(state.hasSources).toBe(true)
    expect(state.sources).toEqual(sources)
  })

  test('returns empty sources when message has no sources', () => {
    const msg = makeMessage({ from: 'assistant' })
    const state = getMessageContentState(msg, 'response')
    expect(state.hasSources).toBe(false)
    expect(state.sources).toEqual([])
  })

  test('shows message content false for empty versionContent', () => {
    const msg = makeMessage({ from: 'user' })
    const state = getMessageContentState(msg, '')
    expect(state.showMessageContent).toBe(false)
  })
})
