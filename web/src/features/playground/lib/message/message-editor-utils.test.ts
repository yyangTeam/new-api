import { getMessageEditorState } from './message-editor-utils'
import type { Message } from '../../types'

const makeMessage = (from: 'user' | 'assistant' | 'system'): Message => ({
  key: 'msg-1',
  from,
  versions: [{ id: 'v1', content: 'hello' }],
})

describe('getMessageEditorState', () => {
  describe('canSave', () => {
    test('returns true when text is non-empty and has changed', () => {
      const result = getMessageEditorState(makeMessage('user'), 'new text', 'old text')
      expect(result.canSave).toBe(true)
    })

    test('returns false when text has not changed', () => {
      const result = getMessageEditorState(makeMessage('user'), 'same', 'same')
      expect(result.canSave).toBe(false)
    })

    test('returns false when edit text is empty', () => {
      const result = getMessageEditorState(makeMessage('user'), '', 'old text')
      expect(result.canSave).toBe(false)
    })

    test('returns false when edit text is only whitespace', () => {
      const result = getMessageEditorState(makeMessage('user'), '   ', 'old text')
      expect(result.canSave).toBe(false)
    })

    test('returns false when edit text is whitespace and unchanged', () => {
      const result = getMessageEditorState(makeMessage('user'), '  ', '  ')
      expect(result.canSave).toBe(false)
    })
  })

  describe('hasChanged', () => {
    test('returns true when editText differs from originalText', () => {
      const result = getMessageEditorState(makeMessage('user'), 'a', 'b')
      expect(result.hasChanged).toBe(true)
    })

    test('returns false when editText equals originalText', () => {
      const result = getMessageEditorState(makeMessage('user'), 'same', 'same')
      expect(result.hasChanged).toBe(false)
    })

    test('treats whitespace differences as changes', () => {
      const result = getMessageEditorState(makeMessage('user'), 'text ', 'text')
      expect(result.hasChanged).toBe(true)
    })
  })

  describe('showSaveAndSubmit', () => {
    test('returns true for user messages', () => {
      const result = getMessageEditorState(makeMessage('user'), 'text', 'original')
      expect(result.showSaveAndSubmit).toBe(true)
    })

    test('returns false for assistant messages', () => {
      const result = getMessageEditorState(makeMessage('assistant'), 'text', 'original')
      expect(result.showSaveAndSubmit).toBe(false)
    })

    test('returns false for system messages', () => {
      const result = getMessageEditorState(makeMessage('system'), 'text', 'original')
      expect(result.showSaveAndSubmit).toBe(false)
    })
  })
})
