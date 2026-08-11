import { sessionDevice, loginMethodLabel } from '@/features/profile/components/login-session-utils'
import type { TFunction } from 'i18next'

const t: TFunction = ((key: string) => key) as TFunction

describe('login-session-utils - branch coverage', () => {
  describe('sessionDevice', () => {
    test('returns unknown device for empty user agent', () => {
      expect(sessionDevice('', 'Unknown Device', 'Browser')).toBe(
        'Unknown Device'
      )
    })

    test('detects Edge browser', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/91.0 Edg/91.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Edge · Windows')
    })

    test('detects Chrome browser', () => {
      const ua =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Chrome · Linux')
    })

    test('detects Firefox browser', () => {
      const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Firefox/120.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Firefox · macOS')
    })

    test('detects Safari browser', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1 Safari/605.1'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Safari · macOS')
    })

    test('detects iPhone as iOS', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1 Safari/604.1'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Safari · iOS')
    })

    test('detects iPad as iOS', () => {
      const ua =
        'Mozilla/5.0 (iPad; CPU OS 17_0) AppleWebKit/605.1 Safari/604.1'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Safari · iOS')
    })

    test('detects iPad via Macintosh + maxTouchPoints > 1', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1 Safari/605.1'
      expect(sessionDevice(ua, 'Unknown', 'Browser', 5)).toBe('Safari · iOS')
    })

    test('detects Macintosh without touch as macOS', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1 Safari/605.1'
      expect(sessionDevice(ua, 'Unknown', 'Browser', 0)).toBe('Safari · macOS')
    })

    test('detects Android', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Chrome · Android')
    })

    test('detects Windows', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Chrome · Windows')
    })

    test('detects Linux', () => {
      const ua =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Chrome · Linux')
    })

    test('returns just browser when system unknown', () => {
      const ua = 'SomeBot/1.0 Chrome/120.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Chrome')
    })

    test('falls back to browserLabel when no browser detected', () => {
      const ua = 'SomeBot/1.0'
      expect(sessionDevice(ua, 'Unknown', 'DefaultBrowser')).toBe(
        'DefaultBrowser'
      )
    })

    test('Edge takes priority over Chrome', () => {
      const ua = 'Chrome/120.0 Edg/120.0'
      expect(sessionDevice(ua, 'Unknown', 'Browser')).toBe('Edge')
    })
  })

  describe('loginMethodLabel', () => {
    test('returns Password for password method', () => {
      expect(loginMethodLabel('password', t)).toBe('Password')
    })

    test('returns Two-factor Authentication for 2fa', () => {
      expect(loginMethodLabel('2fa', t)).toBe('Two-factor Authentication')
    })

    test('returns Passkey for passkey method', () => {
      expect(loginMethodLabel('passkey', t)).toBe('Passkey')
    })

    test('returns WeChat for wechat method', () => {
      expect(loginMethodLabel('wechat', t)).toBe('WeChat')
    })

    test('returns Telegram for telegram method', () => {
      expect(loginMethodLabel('telegram', t)).toBe('Telegram')
    })

    test('returns OAuth for oauth method', () => {
      expect(loginMethodLabel('oauth', t)).toBe('OAuth')
    })

    test('returns Unknown for unknown method', () => {
      expect(loginMethodLabel('unknown', t)).toBe('Unknown')
    })

    test('returns Unknown for empty string', () => {
      expect(loginMethodLabel('', t)).toBe('Unknown')
    })

    test('handles case-insensitive matching', () => {
      expect(loginMethodLabel('PASSWORD', t)).toBe('Password')
      expect(loginMethodLabel('Passkey', t)).toBe('Passkey')
      expect(loginMethodLabel('  2FA  ', t)).toBe('Two-factor Authentication')
    })

    test('returns OAuth with Discord provider', () => {
      expect(loginMethodLabel('oauth:discord', t)).toBe('OAuth · Discord')
    })

    test('returns OAuth with GitHub provider', () => {
      expect(loginMethodLabel('oauth:github', t)).toBe('OAuth · GitHub')
    })

    test('returns OAuth with LinuxDO provider', () => {
      expect(loginMethodLabel('oauth:linuxdo', t)).toBe('OAuth · LinuxDO')
    })

    test('returns OAuth with OIDC provider', () => {
      expect(loginMethodLabel('oauth:oidc', t)).toBe('OAuth · OIDC')
    })

    test('returns OAuth with unknown provider', () => {
      expect(loginMethodLabel('oauth:custom', t)).toBe('OAuth · custom')
    })

    test('returns raw string for non-oauth prefix unknown method', () => {
      expect(loginMethodLabel('custom_method', t)).toBe('custom_method')
    })
  })
})
