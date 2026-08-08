import type { ManageUserAction } from '../types'

import { getUserActionMessage } from './user-actions'

describe('getUserActionMessage', () => {
  test('returns correct message for enable action', () => {
    expect(getUserActionMessage('enable')).toBe('User enabled successfully')
  })

  test('returns correct message for disable action', () => {
    expect(getUserActionMessage('disable')).toBe('User disabled successfully')
  })

  test('returns correct message for promote action', () => {
    expect(getUserActionMessage('promote')).toBe(
      'User promoted to admin successfully'
    )
  })

  test('returns correct message for demote action', () => {
    expect(getUserActionMessage('demote')).toBe(
      'User demoted to regular user successfully'
    )
  })

  test('returns correct message for delete action', () => {
    expect(getUserActionMessage('delete')).toBe('User deleted successfully')
  })

  test('returns correct message for add_quota action', () => {
    expect(getUserActionMessage('add_quota')).toBe(
      'Quota adjusted successfully'
    )
  })

  test('returns message for all defined actions', () => {
    const actions: ManageUserAction[] = [
      'enable',
      'disable',
      'promote',
      'demote',
      'delete',
      'add_quota',
    ]
    for (const action of actions) {
      expect(typeof getUserActionMessage(action)).toBe('string')
      expect(getUserActionMessage(action).length).toBeGreaterThan(0)
    }
  })
})
