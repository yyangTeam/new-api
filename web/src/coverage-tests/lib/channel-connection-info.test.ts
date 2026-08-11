import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  CHANNEL_CONNECTION_INFO_TYPE,
  encodeChannelConnectionInfo,
  parseChannelConnectionInfo,
} from '@/lib/channel-connection-info'

describe('channel-connection-info', () => {
  describe('encodeChannelConnectionInfo', () => {
    it('encodes key and url into JSON string', () => {
      const result = encodeChannelConnectionInfo('my-key', 'https://api.example.com')
      const parsed = JSON.parse(result)
      expect(parsed._type).toBe(CHANNEL_CONNECTION_INFO_TYPE)
      expect(parsed.key).toBe('my-key')
      expect(parsed.url).toBe('https://api.example.com')
    })

    it('handles empty strings', () => {
      const result = encodeChannelConnectionInfo('', '')
      const parsed = JSON.parse(result)
      expect(parsed.key).toBe('')
      expect(parsed.url).toBe('')
    })

    it('handles special characters', () => {
      const result = encodeChannelConnectionInfo('key"with"quotes', 'url/with/slashes')
      const parsed = JSON.parse(result)
      expect(parsed.key).toBe('key"with"quotes')
      expect(parsed.url).toBe('url/with/slashes')
    })
  })

  describe('parseChannelConnectionInfo', () => {
    it('parses valid encoded connection info', () => {
      const encoded = encodeChannelConnectionInfo('sk-123', 'https://api.openai.com')
      const result = parseChannelConnectionInfo(encoded)
      expect(result).toEqual({ key: 'sk-123', url: 'https://api.openai.com' })
    })

    it('returns null for null input', () => {
      expect(parseChannelConnectionInfo(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(parseChannelConnectionInfo(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(parseChannelConnectionInfo('')).toBeNull()
    })

    it('returns null for non-string input', () => {
      expect(parseChannelConnectionInfo(123 as any)).toBeNull()
    })

    it('returns null for invalid JSON', () => {
      expect(parseChannelConnectionInfo('not json')).toBeNull()
    })

    it('returns null for JSON without correct _type', () => {
      expect(
        parseChannelConnectionInfo(JSON.stringify({ _type: 'other', key: 'k', url: 'u' }))
      ).toBeNull()
    })

    it('returns null for JSON without key field', () => {
      expect(
        parseChannelConnectionInfo(
          JSON.stringify({ _type: CHANNEL_CONNECTION_INFO_TYPE, url: 'u' })
        )
      ).toBeNull()
    })

    it('returns null for JSON without url field', () => {
      expect(
        parseChannelConnectionInfo(
          JSON.stringify({ _type: CHANNEL_CONNECTION_INFO_TYPE, key: 'k' })
        )
      ).toBeNull()
    })

    it('returns null for JSON where key is not a string', () => {
      expect(
        parseChannelConnectionInfo(
          JSON.stringify({ _type: CHANNEL_CONNECTION_INFO_TYPE, key: 123, url: 'u' })
        )
      ).toBeNull()
    })

    it('returns null for JSON where url is not a string', () => {
      expect(
        parseChannelConnectionInfo(
          JSON.stringify({ _type: CHANNEL_CONNECTION_INFO_TYPE, key: 'k', url: 123 })
        )
      ).toBeNull()
    })

    it('trims whitespace from input', () => {
      const encoded = encodeChannelConnectionInfo('key', 'url')
      const result = parseChannelConnectionInfo('  ' + encoded + '  ')
      expect(result).toEqual({ key: 'key', url: 'url' })
    })

    it('returns null for non-object parsed JSON', () => {
      expect(parseChannelConnectionInfo('"just a string"')).toBeNull()
    })

    it('returns null for null parsed value', () => {
      expect(parseChannelConnectionInfo('null')).toBeNull()
    })
  })
})
