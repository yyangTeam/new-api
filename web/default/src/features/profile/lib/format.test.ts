import { parseUserSettings, getDisplayName, getUserInitials } from './format'
import type { UserProfile } from '../types'

describe('parseUserSettings', () => {
  test('returns empty object for undefined', () => {
    expect(parseUserSettings(undefined)).toEqual({})
  })

  test('returns empty object for empty string', () => {
    expect(parseUserSettings('')).toEqual({})
  })

  test('parses valid JSON settings', () => {
    const json = JSON.stringify({ notify_type: 'email', quota_warning_threshold: 100 })
    expect(parseUserSettings(json)).toEqual({
      notify_type: 'email',
      quota_warning_threshold: 100,
    })
  })

  test('returns empty object for invalid JSON', () => {
    expect(parseUserSettings('not json')).toEqual({})
  })
})

describe('getDisplayName', () => {
  test('returns empty string for undefined user', () => {
    expect(getDisplayName(undefined)).toBe('')
  })

  test('returns display_name when set', () => {
    const user = { display_name: 'John Doe', username: 'john' } as UserProfile
    expect(getDisplayName(user)).toBe('John Doe')
  })

  test('falls back to username when display_name is empty', () => {
    const user = { display_name: '', username: 'john' } as UserProfile
    expect(getDisplayName(user)).toBe('john')
  })
})

describe('getUserInitials', () => {
  test('returns "?" for undefined user', () => {
    expect(getUserInitials(undefined)).toBe('?')
  })

  test('returns "?" for user with no name', () => {
    const user = { display_name: '', username: '' } as UserProfile
    expect(getUserInitials(user)).toBe('?')
  })

  test('returns two initials for two-word name', () => {
    const user = {
      display_name: 'John Doe',
      username: 'john',
    } as UserProfile
    expect(getUserInitials(user)).toBe('JD')
  })

  test('returns first two chars for single-word name', () => {
    const user = { display_name: 'Alice', username: 'alice' } as UserProfile
    expect(getUserInitials(user)).toBe('AL')
  })

  test('returns uppercase initials', () => {
    const user = { display_name: 'jane doe', username: 'jane' } as UserProfile
    expect(getUserInitials(user)).toBe('JD')
  })

  test('falls back to username for initials', () => {
    const user = { display_name: '', username: 'bob' } as UserProfile
    expect(getUserInitials(user)).toBe('BO')
  })

  test('handles three-word name (takes first two initials)', () => {
    const user = {
      display_name: 'Mary Jane Watson',
      username: 'mary',
    } as UserProfile
    expect(getUserInitials(user)).toBe('MJ')
  })

  test('single-word name with leading spaces returns first two chars of raw name', () => {
    const user = {
      display_name: '  Alice  ',
      username: 'alice',
    } as UserProfile
    expect(getUserInitials(user)).toBe('  ')
  })
})
