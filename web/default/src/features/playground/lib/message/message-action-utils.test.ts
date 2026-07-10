import {
  getMessageActionState,
  getMessageActionsVisibilityClass,
} from './message-action-utils'
import type { Message } from '../../types'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'user',
    versions: [{ id: 'v1', content: 'hello' }],
    ...overrides,
  }
}

describe('getMessageActionState', () => {
  test('returns correct state for user message with content', () => {
    const msg = makeMessage({
      from: 'user',
      versions: [{ id: 'v1', content: 'hello' }],
    })
    const state = getMessageActionState(msg)
    expect(state.content).toBe('hello')
    expect(state.hasContent).toBe(true)
    expect(state.isUser).toBe(true)
    expect(state.isAssistant).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  test('returns correct state for assistant message', () => {
    const msg = makeMessage({
      from: 'assistant',
      versions: [{ id: 'v1', content: 'response' }],
      status: 'complete',
    })
    const state = getMessageActionState(msg)
    expect(state.isAssistant).toBe(true)
    expect(state.isUser).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.content).toBe('response')
  })

  test('returns isLoading true for loading status', () => {
    const msg = makeMessage({ status: 'loading' })
    expect(getMessageActionState(msg).isLoading).toBe(true)
  })

  test('returns isLoading true for streaming status', () => {
    const msg = makeMessage({ status: 'streaming' })
    expect(getMessageActionState(msg).isLoading).toBe(true)
  })

  test('returns isLoading false for complete status', () => {
    const msg = makeMessage({ status: 'complete' })
    expect(getMessageActionState(msg).isLoading).toBe(false)
  })

  test('returns isLoading false for error status', () => {
    const msg = makeMessage({ status: 'error' })
    expect(getMessageActionState(msg).isLoading).toBe(false)
  })

  test('returns hasContent false for empty content', () => {
    const msg = makeMessage({ versions: [{ id: 'v1', content: '' }] })
    expect(getMessageActionState(msg).hasContent).toBe(false)
  })

  test('returns hasContent false for whitespace-only content', () => {
    const msg = makeMessage({ versions: [{ id: 'v1', content: '   ' }] })
    expect(getMessageActionState(msg).hasContent).toBe(false)
  })
})

describe('getMessageActionsVisibilityClass', () => {
  test('returns opacity-100 when always visible', () => {
    expect(getMessageActionsVisibilityClass(true)).toBe('opacity-100')
  })

  test('returns hover-based visibility when not always visible', () => {
    expect(getMessageActionsVisibilityClass(false)).toBe(
      'opacity-0 group-hover:opacity-100 max-md:opacity-100'
    )
  })
})
