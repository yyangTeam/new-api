import {
  isAdminRole,
  isErrorMessage,
  getMessageErrorState,
  FALLBACK_ERROR_CONTENT,
} from './message-error-utils'
import type { Message } from '../../types'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    key: 'msg-1',
    from: 'assistant',
    versions: [{ id: 'v1', content: '' }],
    ...overrides,
  }
}

describe('isAdminRole', () => {
  test('returns true for role >= 10', () => {
    expect(isAdminRole(10)).toBe(true)
    expect(isAdminRole(100)).toBe(true)
  })

  test('returns false for role < 10', () => {
    expect(isAdminRole(0)).toBe(false)
    expect(isAdminRole(1)).toBe(false)
    expect(isAdminRole(9)).toBe(false)
  })

  test('returns false for null', () => {
    expect(isAdminRole(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false)
  })
})

describe('isErrorMessage', () => {
  test('returns true for error status', () => {
    const msg = makeMessage({ status: 'error' })
    expect(isErrorMessage(msg)).toBe(true)
  })

  test('returns false for complete status', () => {
    const msg = makeMessage({ status: 'complete' })
    expect(isErrorMessage(msg)).toBe(false)
  })

  test('returns false for loading status', () => {
    const msg = makeMessage({ status: 'loading' })
    expect(isErrorMessage(msg)).toBe(false)
  })

  test('returns false for streaming status', () => {
    const msg = makeMessage({ status: 'streaming' })
    expect(isErrorMessage(msg)).toBe(false)
  })

  test('returns false when status is undefined', () => {
    const msg = makeMessage({})
    expect(isErrorMessage(msg)).toBe(false)
  })
})

describe('getMessageErrorState', () => {
  test('returns null for non-error message', () => {
    const msg = makeMessage({ status: 'complete' })
    expect(getMessageErrorState(msg, false)).toBeNull()
  })

  test('returns generic error state for regular error', () => {
    const msg = makeMessage({
      status: 'error',
      versions: [{ id: 'v1', content: 'Something failed' }],
    })
    const state = getMessageErrorState(msg, false)
    expect(state).not.toBeNull()
    expect(state!.content).toBe('Something failed')
    expect(state!.kind).toBe('generic')
    expect(state!.showSettingsLink).toBe(false)
  })

  test('returns model-price error state', () => {
    const msg = makeMessage({
      status: 'error',
      versions: [{ id: 'v1', content: 'Model price error' }],
      errorCode: 'model_price_error',
    })
    const state = getMessageErrorState(msg, false)
    expect(state).not.toBeNull()
    expect(state!.kind).toBe('model-price')
    expect(state!.showSettingsLink).toBe(false)
  })

  test('shows settings link for model-price error when admin', () => {
    const msg = makeMessage({
      status: 'error',
      versions: [{ id: 'v1', content: 'Model price error' }],
      errorCode: 'model_price_error',
    })
    const state = getMessageErrorState(msg, true)
    expect(state).not.toBeNull()
    expect(state!.showSettingsLink).toBe(true)
  })

  test('does not show settings link for generic error even when admin', () => {
    const msg = makeMessage({
      status: 'error',
      versions: [{ id: 'v1', content: 'Generic error' }],
    })
    const state = getMessageErrorState(msg, true)
    expect(state).not.toBeNull()
    expect(state!.showSettingsLink).toBe(false)
  })

  test('uses fallback content when message has empty content', () => {
    const msg = makeMessage({
      status: 'error',
      versions: [{ id: 'v1', content: '' }],
    })
    const state = getMessageErrorState(msg, false)
    expect(state).not.toBeNull()
    expect(state!.content).toBe(FALLBACK_ERROR_CONTENT)
  })
})
