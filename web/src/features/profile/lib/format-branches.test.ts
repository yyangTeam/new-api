import {
  parseUserSettings,
  getDisplayName,
  getUserInitials,
} from './format'
import type { UserProfile } from '../types'

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 1,
    username: 'testuser',
    display_name: 'Test User',
    role: 1,
    group: 'default',
    quota: 100000,
    used_quota: 50000,
    request_count: 100,
    status: 1,
    aff_count: 0,
    aff_quota: 0,
    aff_history_quota: 0,
    created_time: 1700000000,
    ...overrides,
  }
}

describe('profile format utilities - branch coverage', () => {
  describe('parseUserSettings', () => {
    test('returns empty object for undefined', () => {
      expect(parseUserSettings(undefined)).toEqual({})
    })

    test('returns empty object for empty string', () => {
      expect(parseUserSettings('')).toEqual({})
    })

    test('returns empty object for invalid JSON', () => {
      expect(parseUserSettings('not-json')).toEqual({})
    })

    test('returns empty object for malformed JSON', () => {
      expect(parseUserSettings('{ bad }')).toEqual({})
    })

    test('parses valid JSON settings', () => {
      const settings = { notify_type: 'email', quota_warning_threshold: 500000 }
      expect(parseUserSettings(JSON.stringify(settings))).toEqual(settings)
    })

    test('parses settings with all fields', () => {
      const settings = {
        notify_type: 'webhook',
        webhook_url: 'https://example.com/webhook',
        webhook_secret: 'secret',
        bark_url: 'https://bark.example.com',
        gotify_url: 'https://gotify.example.com',
        gotify_token: 'token123',
        gotify_priority: 5,
      }
      const result = parseUserSettings(JSON.stringify(settings))
      expect(result.notify_type).toBe('webhook')
      expect(result.gotify_priority).toBe(5)
    })
  })

  describe('getDisplayName', () => {
    test('returns empty string for undefined user', () => {
      expect(getDisplayName(undefined)).toBe('')
    })

    test('returns display_name when available', () => {
      const profile = createProfile({ display_name: 'Display Name' })
      expect(getDisplayName(profile)).toBe('Display Name')
    })

    test('falls back to username when display_name is empty', () => {
      const profile = createProfile({ display_name: '', username: 'user123' })
      expect(getDisplayName(profile)).toBe('user123')
    })

    test('returns display_name over username', () => {
      const profile = createProfile({
        display_name: 'Preferred',
        username: 'notthis',
      })
      expect(getDisplayName(profile)).toBe('Preferred')
    })
  })

  describe('getUserInitials', () => {
    test('returns ? for undefined user', () => {
      expect(getUserInitials(undefined)).toBe('?')
    })

    test('returns ? for user with no name', () => {
      const profile = createProfile({ display_name: '', username: '' })
      expect(getUserInitials(profile)).toBe('?')
    })

    test('returns two-letter initials for single word name', () => {
      const profile = createProfile({ display_name: 'Admin' })
      expect(getUserInitials(profile)).toBe('AD')
    })

    test('returns first letter of each word for two-word name', () => {
      const profile = createProfile({ display_name: 'John Doe' })
      expect(getUserInitials(profile)).toBe('JD')
    })

    test('returns first letter of first two words for multi-word name', () => {
      const profile = createProfile({ display_name: 'John Michael Doe' })
      expect(getUserInitials(profile)).toBe('JM')
    })

    test('uppercases initials', () => {
      const profile = createProfile({ display_name: 'alice bob' })
      expect(getUserInitials(profile)).toBe('AB')
    })

    test('handles single character name', () => {
      const profile = createProfile({ display_name: 'A' })
      expect(getUserInitials(profile)).toBe('A')
    })

    test('trims whitespace before calculating initials', () => {
      const profile = createProfile({ display_name: '  spaced  name  ' })
      expect(getUserInitials(profile)).toBe('SN')
    })

    test('falls back to username for initials when display_name empty', () => {
      const profile = createProfile({ display_name: '', username: 'testuser' })
      expect(getUserInitials(profile)).toBe('TE')
    })
  })
})
