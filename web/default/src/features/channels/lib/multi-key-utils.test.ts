import {
  getMultiKeyStatusConfig,
  getMultiKeyConfirmMessage,
  isDestructiveAction,
} from './multi-key-utils'
import {
  MULTI_KEY_STATUS_CONFIG,
  MULTI_KEY_CONFIRM_MESSAGES,
} from '../constants'
import type { MultiKeyConfirmAction } from '../types'

describe('getMultiKeyStatusConfig', () => {
  test('returns success config for status 1 (enabled)', () => {
    const config = getMultiKeyStatusConfig(1)
    expect(config).toEqual(MULTI_KEY_STATUS_CONFIG[1])
    expect(config.variant).toBe('success')
    expect(config.label).toBe('Enabled')
  })

  test('returns neutral config for status 2 (manual disabled)', () => {
    const config = getMultiKeyStatusConfig(2)
    expect(config).toEqual(MULTI_KEY_STATUS_CONFIG[2])
    expect(config.variant).toBe('neutral')
    expect(config.label).toBe('Manual Disabled')
  })

  test('returns danger config for status 3 (auto disabled)', () => {
    const config = getMultiKeyStatusConfig(3)
    expect(config).toEqual(MULTI_KEY_STATUS_CONFIG[3])
    expect(config.variant).toBe('danger')
    expect(config.label).toBe('Auto Disabled')
  })

  test('returns neutral/Unknown fallback for unknown status', () => {
    const config = getMultiKeyStatusConfig(99)
    expect(config.variant).toBe('neutral')
    expect(config.label).toBe('Unknown')
  })

  test('returns neutral/Unknown fallback for status 0', () => {
    const config = getMultiKeyStatusConfig(0)
    expect(config.variant).toBe('neutral')
    expect(config.label).toBe('Unknown')
  })

  test('returns neutral/Unknown fallback for negative status', () => {
    const config = getMultiKeyStatusConfig(-1)
    expect(config.variant).toBe('neutral')
    expect(config.label).toBe('Unknown')
  })
})

describe('getMultiKeyConfirmMessage', () => {
  test('returns empty string for null action', () => {
    expect(getMultiKeyConfirmMessage(null)).toBe('')
  })

  test('returns DELETE message for delete action', () => {
    const action: MultiKeyConfirmAction = { type: 'delete', keyIndex: 0 }
    expect(getMultiKeyConfirmMessage(action)).toBe(
      MULTI_KEY_CONFIRM_MESSAGES.DELETE
    )
  })

  test('returns ENABLE message for enable action', () => {
    const action: MultiKeyConfirmAction = { type: 'enable', keyIndex: 0 }
    expect(getMultiKeyConfirmMessage(action)).toBe(
      MULTI_KEY_CONFIRM_MESSAGES.ENABLE
    )
  })

  test('returns DISABLE message for disable action', () => {
    const action: MultiKeyConfirmAction = { type: 'disable', keyIndex: 0 }
    expect(getMultiKeyConfirmMessage(action)).toBe(
      MULTI_KEY_CONFIRM_MESSAGES.DISABLE
    )
  })

  test('returns ENABLE_ALL message for enable-all action', () => {
    const action: MultiKeyConfirmAction = { type: 'enable-all' }
    expect(getMultiKeyConfirmMessage(action)).toBe(
      MULTI_KEY_CONFIRM_MESSAGES.ENABLE_ALL
    )
  })

  test('returns DISABLE_ALL message for disable-all action', () => {
    const action: MultiKeyConfirmAction = { type: 'disable-all' }
    expect(getMultiKeyConfirmMessage(action)).toBe(
      MULTI_KEY_CONFIRM_MESSAGES.DISABLE_ALL
    )
  })

  test('returns DELETE_DISABLED message for delete-disabled action', () => {
    const action: MultiKeyConfirmAction = { type: 'delete-disabled' }
    expect(getMultiKeyConfirmMessage(action)).toBe(
      MULTI_KEY_CONFIRM_MESSAGES.DELETE_DISABLED
    )
  })
})

describe('isDestructiveAction', () => {
  test('returns false for null action', () => {
    expect(isDestructiveAction(null)).toBe(false)
  })

  test('returns true for delete action', () => {
    const action: MultiKeyConfirmAction = { type: 'delete', keyIndex: 0 }
    expect(isDestructiveAction(action)).toBe(true)
  })

  test('returns true for delete-disabled action', () => {
    const action: MultiKeyConfirmAction = { type: 'delete-disabled' }
    expect(isDestructiveAction(action)).toBe(true)
  })

  test('returns true for disable-all action', () => {
    const action: MultiKeyConfirmAction = { type: 'disable-all' }
    expect(isDestructiveAction(action)).toBe(true)
  })

  test('returns false for enable action', () => {
    const action: MultiKeyConfirmAction = { type: 'enable', keyIndex: 0 }
    expect(isDestructiveAction(action)).toBe(false)
  })

  test('returns false for disable action', () => {
    const action: MultiKeyConfirmAction = { type: 'disable', keyIndex: 0 }
    expect(isDestructiveAction(action)).toBe(false)
  })

  test('returns false for enable-all action', () => {
    const action: MultiKeyConfirmAction = { type: 'enable-all' }
    expect(isDestructiveAction(action)).toBe(false)
  })
})
