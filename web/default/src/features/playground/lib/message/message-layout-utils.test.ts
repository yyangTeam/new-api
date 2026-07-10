import {
  getMessageAlignment,
  getMessageAlignmentClass,
} from './message-layout-utils'
import type { Message, PlaygroundMessageLayoutMode } from '../../types'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'user',
    versions: [{ id: 'v1', content: 'hello' }],
    ...overrides,
  }
}

describe('getMessageAlignment', () => {
  test('returns left for left layout mode regardless of role', () => {
    expect(getMessageAlignment(makeMessage({ from: 'user' }), 'left')).toBe('left')
    expect(getMessageAlignment(makeMessage({ from: 'assistant' }), 'left')).toBe('left')
    expect(getMessageAlignment(makeMessage({ from: 'system' }), 'left')).toBe('left')
  })

  test('returns right for user message in alternating mode', () => {
    expect(
      getMessageAlignment(makeMessage({ from: 'user' }), 'alternating')
    ).toBe('right')
  })

  test('returns left for assistant message in alternating mode', () => {
    expect(
      getMessageAlignment(makeMessage({ from: 'assistant' }), 'alternating')
    ).toBe('left')
  })

  test('returns left for system message in alternating mode', () => {
    expect(
      getMessageAlignment(makeMessage({ from: 'system' }), 'alternating')
    ).toBe('left')
  })
})

describe('getMessageAlignmentClass', () => {
  test('returns right-aligned classes for right alignment', () => {
    expect(getMessageAlignmentClass('right')).toBe('items-end text-right')
  })

  test('returns left-aligned classes for left alignment', () => {
    expect(getMessageAlignmentClass('left')).toBe('items-start text-left')
  })
})
