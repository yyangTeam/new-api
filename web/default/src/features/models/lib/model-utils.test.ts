import {
  formatTimestamp,
  formatRelativeTime,
  parseModelTags,
  formatTagsString,
  parseEndpoints,
  formatEndpointsDisplay,
  getNameRuleLabelByRule,
  getNameRuleConfigByRule,
  formatQuotaTypes,
  validateModelName,
  validateEndpointsJSON,
  isModelEnabled,
  isModelSyncOfficial,
} from './model-utils'
import type { Model } from '../types'

const mockT = ((key: string) => key) as import('i18next').TFunction

describe('formatTimestamp', () => {
  test('returns "-" for 0', () => {
    expect(formatTimestamp(0)).toBe('-')
  })

  test('returns "-" for falsy values', () => {
    expect(formatTimestamp(undefined as unknown as number)).toBe('-')
  })

  test('returns formatted date for valid timestamp', () => {
    const result = formatTimestamp(1700000000)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe('formatRelativeTime', () => {
  test('returns "Never" for 0', () => {
    expect(formatRelativeTime(0)).toBe('Never')
  })

  test('returns "Never" for falsy values', () => {
    expect(formatRelativeTime(undefined as unknown as number)).toBe('Never')
  })

  test('returns days ago for old timestamps', () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 86400
    expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago')
  })

  test('returns singular day ago', () => {
    const oneDayAgo = Math.floor(Date.now() / 1000) - 86400
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago')
  })

  test('returns hours ago', () => {
    const threeHoursAgo = Math.floor(Date.now() / 1000) - 3 * 3600
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago')
  })

  test('returns singular hour ago', () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600
    expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago')
  })

  test('returns minutes ago', () => {
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 minutes ago')
  })

  test('returns singular minute ago', () => {
    const oneMinAgo = Math.floor(Date.now() / 1000) - 60
    expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago')
  })

  test('returns seconds ago', () => {
    const tenSecAgo = Math.floor(Date.now() / 1000) - 10
    expect(formatRelativeTime(tenSecAgo)).toBe('10 seconds ago')
  })

  test('returns singular second', () => {
    const oneSecAgo = Math.floor(Date.now() / 1000) - 1
    expect(formatRelativeTime(oneSecAgo)).toBe('1 second ago')
  })
})

describe('parseModelTags', () => {
  test('returns empty array for undefined', () => {
    expect(parseModelTags(undefined)).toEqual([])
  })

  test('returns empty array for empty string', () => {
    expect(parseModelTags('')).toEqual([])
  })

  test('parses comma-separated tags', () => {
    expect(parseModelTags('chat,vision,audio')).toEqual([
      'chat',
      'vision',
      'audio',
    ])
  })

  test('trims whitespace from tags', () => {
    expect(parseModelTags(' chat , vision , audio ')).toEqual([
      'chat',
      'vision',
      'audio',
    ])
  })

  test('filters out empty tags', () => {
    expect(parseModelTags('chat,,vision,')).toEqual(['chat', 'vision'])
  })
})

describe('formatTagsString', () => {
  test('joins tags with comma', () => {
    expect(formatTagsString(['chat', 'vision'])).toBe('chat,vision')
  })

  test('returns empty string for empty array', () => {
    expect(formatTagsString([])).toBe('')
  })
})

describe('parseEndpoints', () => {
  test('returns null for undefined', () => {
    expect(parseEndpoints(undefined)).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(parseEndpoints('')).toBeNull()
  })

  test('returns null for whitespace-only string', () => {
    expect(parseEndpoints('   ')).toBeNull()
  })

  test('parses valid JSON object', () => {
    expect(parseEndpoints('{"chat": "/v1/chat"}')).toEqual({
      chat: '/v1/chat',
    })
  })

  test('parses valid JSON array', () => {
    expect(parseEndpoints('["a","b"]')).toEqual(['a', 'b'])
  })

  test('returns null for invalid JSON', () => {
    expect(parseEndpoints('not json')).toBeNull()
  })
})

describe('formatEndpointsDisplay', () => {
  test('returns empty array for undefined', () => {
    expect(formatEndpointsDisplay(undefined)).toEqual([])
  })

  test('returns object keys for JSON object', () => {
    expect(
      formatEndpointsDisplay('{"chat": "/v1/chat", "embed": "/v1/embed"}')
    ).toEqual(['chat', 'embed'])
  })

  test('returns stringified items for JSON array', () => {
    expect(formatEndpointsDisplay('[1, 2, 3]')).toEqual(['1', '2', '3'])
  })

  test('returns empty array for invalid JSON', () => {
    expect(formatEndpointsDisplay('bad')).toEqual([])
  })
})

describe('getNameRuleLabelByRule', () => {
  test('returns label for known rule', () => {
    expect(getNameRuleLabelByRule(0, mockT)).toBe('Exact')
  })

  test('returns label for prefix rule', () => {
    expect(getNameRuleLabelByRule(1, mockT)).toBe('Prefix')
  })

  test('returns "-" for unknown rule', () => {
    expect(getNameRuleLabelByRule(99 as never, mockT)).toBe('-')
  })
})

describe('getNameRuleConfigByRule', () => {
  test('returns config for known rule', () => {
    const config = getNameRuleConfigByRule(1, mockT)
    expect(config.label).toBe('Prefix')
  })

  test('falls back to rule 0 for unknown rule', () => {
    const config = getNameRuleConfigByRule(99 as never, mockT)
    expect(config.label).toBe('Exact')
  })
})

describe('formatQuotaTypes', () => {
  test('returns "-" for undefined', () => {
    expect(formatQuotaTypes(undefined, mockT)).toBe('-')
  })

  test('returns "-" for empty array', () => {
    expect(formatQuotaTypes([], mockT)).toBe('-')
  })

  test('formats known quota types', () => {
    expect(formatQuotaTypes([0, 1], mockT)).toBe('Usage-based, Per-call')
  })

  test('falls back to string for unknown types', () => {
    expect(formatQuotaTypes([99], mockT)).toBe('99')
  })
})

describe('validateModelName', () => {
  test('returns true for non-empty name', () => {
    expect(validateModelName('gpt-4')).toBe(true)
  })

  test('returns false for empty string', () => {
    expect(validateModelName('')).toBe(false)
  })

  test('returns false for whitespace-only string', () => {
    expect(validateModelName('   ')).toBe(false)
  })
})

describe('validateEndpointsJSON', () => {
  test('returns true for empty string', () => {
    expect(validateEndpointsJSON('')).toBe(true)
  })

  test('returns true for whitespace-only string', () => {
    expect(validateEndpointsJSON('  ')).toBe(true)
  })

  test('returns true for valid JSON', () => {
    expect(validateEndpointsJSON('{"key": "value"}')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(validateEndpointsJSON('{not valid}')).toBe(false)
  })
})

describe('isModelEnabled', () => {
  test('returns true when status is 1', () => {
    expect(isModelEnabled({ status: 1 } as Model)).toBe(true)
  })

  test('returns false when status is 0', () => {
    expect(isModelEnabled({ status: 0 } as Model)).toBe(false)
  })

  test('returns false when status is 2', () => {
    expect(isModelEnabled({ status: 2 } as Model)).toBe(false)
  })
})

describe('isModelSyncOfficial', () => {
  test('returns true when sync_official is 1', () => {
    expect(isModelSyncOfficial({ sync_official: 1 } as Model)).toBe(true)
  })

  test('returns false when sync_official is 0', () => {
    expect(isModelSyncOfficial({ sync_official: 0 } as Model)).toBe(false)
  })
})
