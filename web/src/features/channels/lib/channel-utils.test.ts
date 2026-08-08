import {
  getChannelTypeLabel,
  getChannelTypeIcon,
  getChannelStatusBadge,
  getMultiKeyStatusBadge,
  isChannelEnabled,
  isMultiKeyChannel,
  formatChannelKey,
  formatKeyPreview,
  countKeys,
  parseModelsList,
  parseGroupsList,
  formatModelsString,
  formatGroupsString,
  parseChannelSettings,
  parseChannelOtherSettings,
  validateChannelSettings,
  getBalanceVariant,
  formatResponseTime,
  getResponseTimeConfig,
  getPriorityDisplay,
  getWeightDisplay,
  validateChannelName,
  validateApiKey,
  validateModels,
  validateGroups,
  channelNeedsAttention,
  getAttentionReason,
  isTagAggregateRow,
  aggregateChannelsByTag,
  deduplicateKeys,
  getKeyPromptForType,
  formatRelativeTime,
} from './channel-utils'
import type { Channel } from '../types'

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 1,
    type: 1,
    key: 'sk-test-key',
    status: 1,
    name: 'Test Channel',
    created_time: 1700000000,
    test_time: 0,
    response_time: 0,
    balance: 0,
    balance_updated_time: 0,
    models: 'gpt-4',
    group: 'default',
    used_quota: 0,
    other: '',
    other_info: '',
    remark: '',
    max_input_tokens: 0,
    settings: '{}',
    channel_info: {
      is_multi_key: false,
      multi_key_size: 0,
      multi_key_polling_index: 0,
      multi_key_mode: 'random',
    },
    ...overrides,
  } as Channel
}

describe('getChannelTypeLabel', () => {
  test('returns known type label', () => {
    expect(getChannelTypeLabel(1)).toBe('OpenAI')
    expect(getChannelTypeLabel(14)).toBe('Anthropic')
    expect(getChannelTypeLabel(24)).toBe('Gemini')
    expect(getChannelTypeLabel(43)).toBe('DeepSeek')
  })

  test('returns Unknown for unrecognized type', () => {
    expect(getChannelTypeLabel(999)).toBe('Unknown')
    expect(getChannelTypeLabel(-1)).toBe('Unknown')
  })
})

describe('getChannelTypeIcon', () => {
  test('returns correct icon for known types', () => {
    expect(getChannelTypeIcon(1)).toBe('OpenAI')
    expect(getChannelTypeIcon(14)).toBe('Claude')
    expect(getChannelTypeIcon(24)).toBe('Gemini')
    expect(getChannelTypeIcon(3)).toBe('Azure')
    expect(getChannelTypeIcon(4)).toBe('Ollama')
    expect(getChannelTypeIcon(33)).toBe('Aws')
    expect(getChannelTypeIcon(43)).toBe('DeepSeek')
  })

  test('returns OpenAI as default icon for unknown type', () => {
    expect(getChannelTypeIcon(999)).toBe('OpenAI')
  })
})

describe('getChannelStatusBadge', () => {
  test('returns correct config for known statuses', () => {
    expect(getChannelStatusBadge(0)).toEqual({ variant: 'neutral', label: 'Unknown' })
    expect(getChannelStatusBadge(1)).toEqual({ variant: 'success', label: 'Enabled' })
    expect(getChannelStatusBadge(2)).toEqual({ variant: 'danger', label: 'Disabled' })
    expect(getChannelStatusBadge(3)).toEqual({ variant: 'warning', label: 'Auto Disabled' })
  })

  test('falls back to status 0 config for unknown status', () => {
    expect(getChannelStatusBadge(99)).toEqual({ variant: 'neutral', label: 'Unknown' })
  })
})

describe('getMultiKeyStatusBadge', () => {
  test('returns correct config for known statuses', () => {
    expect(getMultiKeyStatusBadge(1)).toEqual({ variant: 'success', label: 'Enabled' })
    expect(getMultiKeyStatusBadge(2)).toEqual({ variant: 'neutral', label: 'Manual Disabled' })
    expect(getMultiKeyStatusBadge(3)).toEqual({ variant: 'danger', label: 'Auto Disabled' })
  })

  test('falls back to status 1 config for unknown status', () => {
    expect(getMultiKeyStatusBadge(99)).toEqual({ variant: 'success', label: 'Enabled' })
  })
})

describe('isChannelEnabled', () => {
  test('returns true for status 1', () => {
    expect(isChannelEnabled(makeChannel({ status: 1 }))).toBe(true)
  })

  test('returns false for other statuses', () => {
    expect(isChannelEnabled(makeChannel({ status: 0 }))).toBe(false)
    expect(isChannelEnabled(makeChannel({ status: 2 }))).toBe(false)
    expect(isChannelEnabled(makeChannel({ status: 3 }))).toBe(false)
  })
})

describe('isMultiKeyChannel', () => {
  test('returns true when is_multi_key is true', () => {
    const ch = makeChannel({
      channel_info: {
        is_multi_key: true,
        multi_key_size: 3,
        multi_key_polling_index: 0,
        multi_key_mode: 'random',
      },
    })
    expect(isMultiKeyChannel(ch)).toBe(true)
  })

  test('returns false when is_multi_key is false', () => {
    expect(isMultiKeyChannel(makeChannel())).toBe(false)
  })
})

describe('formatChannelKey', () => {
  test('returns empty string for empty key', () => {
    expect(formatChannelKey('')).toBe('')
  })

  test('shows key count for multi-key', () => {
    expect(formatChannelKey('key1\nkey2\nkey3', true)).toBe('3 keys')
  })

  test('filters empty lines in multi-key', () => {
    expect(formatChannelKey('key1\n\nkey2\n  \n', true)).toBe('2 keys')
  })

  test('masks short keys (<=16 chars)', () => {
    expect(formatChannelKey('1234567890123456')).toBe('1234...3456')
  })

  test('masks longer keys (>16 chars)', () => {
    expect(formatChannelKey('sk-12345678901234567890')).toBe('sk-12345...34567890')
  })
})

describe('formatKeyPreview', () => {
  test('returns empty string for empty key', () => {
    expect(formatKeyPreview('')).toBe('')
  })

  test('returns full key if shorter than maxLength', () => {
    expect(formatKeyPreview('short', 10)).toBe('short')
  })

  test('truncates key if longer than maxLength', () => {
    expect(formatKeyPreview('this-is-a-long-key', 10)).toBe('this-is-a-...')
  })

  test('uses default maxLength of 10', () => {
    expect(formatKeyPreview('1234567890X')).toBe('1234567890...')
  })
})

describe('countKeys', () => {
  test('returns 0 for empty string', () => {
    expect(countKeys('')).toBe(0)
  })

  test('counts non-empty lines', () => {
    expect(countKeys('key1\nkey2\nkey3')).toBe(3)
  })

  test('ignores blank lines', () => {
    expect(countKeys('key1\n\n  \nkey2')).toBe(2)
  })
})

describe('parseModelsList', () => {
  test('returns empty array for empty string', () => {
    expect(parseModelsList('')).toEqual([])
  })

  test('parses comma-separated models', () => {
    expect(parseModelsList('gpt-4,gpt-3.5-turbo')).toEqual(['gpt-4', 'gpt-3.5-turbo'])
  })

  test('trims whitespace', () => {
    expect(parseModelsList(' gpt-4 , gpt-3.5-turbo ')).toEqual(['gpt-4', 'gpt-3.5-turbo'])
  })

  test('filters empty segments', () => {
    expect(parseModelsList('gpt-4,,gpt-3.5-turbo,')).toEqual(['gpt-4', 'gpt-3.5-turbo'])
  })
})

describe('parseGroupsList', () => {
  test('returns empty array for empty string', () => {
    expect(parseGroupsList('')).toEqual([])
  })

  test('parses and sorts with default first', () => {
    expect(parseGroupsList('vip,default,basic')).toEqual(['default', 'basic', 'vip'])
  })

  test('sorts alphabetically when no default', () => {
    expect(parseGroupsList('beta,alpha')).toEqual(['alpha', 'beta'])
  })

  test('trims whitespace and filters empty', () => {
    expect(parseGroupsList(' default , vip , ')).toEqual(['default', 'vip'])
  })
})

describe('formatModelsString / formatGroupsString', () => {
  test('joins models with comma', () => {
    expect(formatModelsString(['gpt-4', 'gpt-3.5'])).toBe('gpt-4,gpt-3.5')
  })

  test('joins groups with comma', () => {
    expect(formatGroupsString(['default', 'vip'])).toBe('default,vip')
  })

  test('returns empty string for empty array', () => {
    expect(formatModelsString([])).toBe('')
    expect(formatGroupsString([])).toBe('')
  })
})

describe('parseChannelSettings', () => {
  test('returns empty object for null/undefined/empty', () => {
    expect(parseChannelSettings(null)).toEqual({})
    expect(parseChannelSettings(undefined)).toEqual({})
    expect(parseChannelSettings('')).toEqual({})
  })

  test('parses valid JSON', () => {
    const result = parseChannelSettings('{"force_format": true}')
    expect(result).toEqual({ force_format: true })
  })

  test('returns empty object for invalid JSON', () => {
    expect(parseChannelSettings('not-json')).toEqual({})
  })
})

describe('parseChannelOtherSettings', () => {
  test('returns empty object for null/undefined/empty/empty-object', () => {
    expect(parseChannelOtherSettings(null)).toEqual({})
    expect(parseChannelOtherSettings(undefined)).toEqual({})
    expect(parseChannelOtherSettings('')).toEqual({})
    expect(parseChannelOtherSettings('{}')).toEqual({})
  })

  test('parses valid JSON', () => {
    const result = parseChannelOtherSettings('{"vertex_key_type": "json"}')
    expect(result).toEqual({ vertex_key_type: 'json' })
  })

  test('returns empty object for invalid JSON', () => {
    expect(parseChannelOtherSettings('bad')).toEqual({})
  })
})

describe('validateChannelSettings', () => {
  test('returns true for empty/whitespace', () => {
    expect(validateChannelSettings('')).toBe(true)
    expect(validateChannelSettings('  ')).toBe(true)
  })

  test('returns true for valid JSON', () => {
    expect(validateChannelSettings('{"key": "value"}')).toBe(true)
    expect(validateChannelSettings('[]')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(validateChannelSettings('not-json')).toBe(false)
    expect(validateChannelSettings('{bad}')).toBe(false)
  })
})

describe('getBalanceVariant', () => {
  test('returns neutral for zero', () => {
    expect(getBalanceVariant(0)).toBe('neutral')
  })

  test('returns danger for balance < 1', () => {
    expect(getBalanceVariant(0.5)).toBe('danger')
    expect(getBalanceVariant(0.99)).toBe('danger')
  })

  test('returns warning for balance < 10', () => {
    expect(getBalanceVariant(1)).toBe('warning')
    expect(getBalanceVariant(9.99)).toBe('warning')
  })

  test('returns success for balance >= 10', () => {
    expect(getBalanceVariant(10)).toBe('success')
    expect(getBalanceVariant(100)).toBe('success')
  })
})

describe('formatResponseTime', () => {
  test('returns "Not tested" for 0', () => {
    expect(formatResponseTime(0)).toBe('Not tested')
  })

  test('formats milliseconds below 1000', () => {
    expect(formatResponseTime(500)).toBe('500ms')
    expect(formatResponseTime(1)).toBe('1ms')
  })

  test('formats seconds for 1000+', () => {
    expect(formatResponseTime(1000)).toBe('1.00s')
    expect(formatResponseTime(2500)).toBe('2.50s')
  })

  test('uses t function when provided', () => {
    const t = (key: string, opts?: { value?: number | string }) =>
      opts?.value !== undefined ? `${key}:${opts.value}` : key

    expect(formatResponseTime(0, t)).toBe('Not tested')
    expect(formatResponseTime(500, t)).toBe('{{value}}ms:500')
    expect(formatResponseTime(2500, t)).toBe('{{value}}s:2.50')
  })
})

describe('getResponseTimeConfig', () => {
  test('returns UNKNOWN for 0', () => {
    expect(getResponseTimeConfig(0)).toEqual({ variant: 'neutral', label: 'Not tested' })
  })

  test('returns EXCELLENT for <= 500ms', () => {
    expect(getResponseTimeConfig(100).label).toBe('Excellent')
    expect(getResponseTimeConfig(500).label).toBe('Excellent')
  })

  test('returns GOOD for <= 1000ms', () => {
    expect(getResponseTimeConfig(501).label).toBe('Good')
    expect(getResponseTimeConfig(1000).label).toBe('Good')
  })

  test('returns FAIR for <= 2000ms', () => {
    expect(getResponseTimeConfig(1001).label).toBe('Fair')
    expect(getResponseTimeConfig(2000).label).toBe('Fair')
  })

  test('returns POOR for > 2000ms', () => {
    expect(getResponseTimeConfig(2001).label).toBe('Poor')
    expect(getResponseTimeConfig(10000).label).toBe('Poor')
  })
})

describe('getPriorityDisplay / getWeightDisplay', () => {
  test('returns "0" for null/undefined', () => {
    expect(getPriorityDisplay(null)).toBe('0')
    expect(getPriorityDisplay(undefined)).toBe('0')
    expect(getWeightDisplay(null)).toBe('0')
    expect(getWeightDisplay(undefined)).toBe('0')
  })

  test('returns string of value', () => {
    expect(getPriorityDisplay(5)).toBe('5')
    expect(getWeightDisplay(10)).toBe('10')
    expect(getPriorityDisplay(0)).toBe('0')
  })
})

describe('validateChannelName', () => {
  test('returns true for non-empty trimmed name', () => {
    expect(validateChannelName('my-channel')).toBe(true)
  })

  test('returns false for empty or whitespace-only', () => {
    expect(validateChannelName('')).toBe(false)
    expect(validateChannelName('   ')).toBe(false)
  })
})

describe('validateApiKey', () => {
  test('returns true for non-empty trimmed key', () => {
    expect(validateApiKey('sk-test')).toBe(true)
  })

  test('returns false for empty or whitespace', () => {
    expect(validateApiKey('')).toBe(false)
    expect(validateApiKey('   ')).toBe(false)
  })
})

describe('validateModels', () => {
  test('returns true when models parse to non-empty list', () => {
    expect(validateModels('gpt-4')).toBe(true)
    expect(validateModels('gpt-4,gpt-3.5')).toBe(true)
  })

  test('returns false for empty', () => {
    expect(validateModels('')).toBe(false)
  })
})

describe('validateGroups', () => {
  test('returns true when groups parse to non-empty list', () => {
    expect(validateGroups('default')).toBe(true)
  })

  test('returns false for empty', () => {
    expect(validateGroups('')).toBe(false)
  })
})

describe('channelNeedsAttention', () => {
  test('returns true for auto-disabled channel (status 3)', () => {
    expect(channelNeedsAttention(makeChannel({ status: 3 }))).toBe(true)
  })

  test('returns true for low balance', () => {
    expect(channelNeedsAttention(makeChannel({ balance: 0.5 }))).toBe(true)
  })

  test('returns false for zero balance', () => {
    expect(channelNeedsAttention(makeChannel({ balance: 0 }))).toBe(false)
  })

  test('returns true when all multi-keys are disabled', () => {
    const ch = makeChannel({
      channel_info: {
        is_multi_key: true,
        multi_key_size: 2,
        multi_key_status_list: { '0': 3, '1': 3 },
        multi_key_polling_index: 0,
        multi_key_mode: 'random',
      },
    })
    expect(channelNeedsAttention(ch)).toBe(true)
  })

  test('returns false for healthy channel', () => {
    expect(channelNeedsAttention(makeChannel({ status: 1, balance: 50 }))).toBe(false)
  })
})

describe('getAttentionReason', () => {
  test('returns "Auto-disabled" for status 3', () => {
    expect(getAttentionReason(makeChannel({ status: 3 }))).toBe('Auto-disabled')
  })

  test('returns "Low balance" for balance between 0 and 1', () => {
    expect(getAttentionReason(makeChannel({ balance: 0.5 }))).toBe('Low balance')
  })

  test('returns "All keys disabled" for multi-key with all disabled', () => {
    const ch = makeChannel({
      channel_info: {
        is_multi_key: true,
        multi_key_size: 1,
        multi_key_status_list: { '0': 3 },
        multi_key_polling_index: 0,
        multi_key_mode: 'random',
      },
    })
    expect(getAttentionReason(ch)).toBe('All keys disabled')
  })

  test('returns null for healthy channel', () => {
    expect(getAttentionReason(makeChannel())).toBeNull()
  })
})

describe('isTagAggregateRow', () => {
  test('returns true when row has children array', () => {
    const row = { ...makeChannel(), children: [makeChannel()] }
    expect(isTagAggregateRow(row)).toBe(true)
  })

  test('returns false for plain channel', () => {
    expect(isTagAggregateRow(makeChannel())).toBe(false)
  })
})

describe('aggregateChannelsByTag', () => {
  test('groups channels by tag', () => {
    const ch1 = makeChannel({ id: 1, tag: 'prod', name: 'Ch1', used_quota: 10, response_time: 100 })
    const ch2 = makeChannel({ id: 2, tag: 'prod', name: 'Ch2', used_quota: 20, response_time: 200 })
    const ch3 = makeChannel({ id: 3, tag: 'dev', name: 'Ch3', used_quota: 5, response_time: 300 })

    const result = aggregateChannelsByTag([ch1, ch2, ch3])
    expect(result).toHaveLength(2)

    const prodRow = result[0] as ReturnType<typeof aggregateChannelsByTag>[0] & { children: Channel[] }
    expect(prodRow.children).toHaveLength(2)
    expect(prodRow.used_quota).toBe(30)
    expect(prodRow.response_time).toBe(150)

    const devRow = result[1] as ReturnType<typeof aggregateChannelsByTag>[0] & { children: Channel[] }
    expect(devRow.children).toHaveLength(1)
  })

  test('aggregates status as enabled if any child is enabled', () => {
    const ch1 = makeChannel({ id: 1, tag: 'x', status: 2 })
    const ch2 = makeChannel({ id: 2, tag: 'x', status: 1 })
    const result = aggregateChannelsByTag([ch1, ch2])
    expect((result[0] as Channel).status).toBe(1)
  })

  test('handles empty tag', () => {
    const ch = makeChannel({ id: 1, tag: '' })
    const result = aggregateChannelsByTag([ch])
    expect(result).toHaveLength(1)
  })

  test('aggregates priority as null when children differ', () => {
    const ch1 = makeChannel({ id: 1, tag: 'x', priority: 1 })
    const ch2 = makeChannel({ id: 2, tag: 'x', priority: 2 })
    const result = aggregateChannelsByTag([ch1, ch2])
    expect((result[0] as Channel).priority).toBeNull()
  })

  test('aggregates priority when children are the same', () => {
    const ch1 = makeChannel({ id: 1, tag: 'x', priority: 5 })
    const ch2 = makeChannel({ id: 2, tag: 'x', priority: 5 })
    const result = aggregateChannelsByTag([ch1, ch2])
    expect((result[0] as Channel).priority).toBe(5)
  })

  test('deduplicates groups across children', () => {
    const ch1 = makeChannel({ id: 1, tag: 'x', group: 'default,vip' })
    const ch2 = makeChannel({ id: 2, tag: 'x', group: 'default,admin' })
    const result = aggregateChannelsByTag([ch1, ch2])
    expect((result[0] as Channel).group).toBe('default,vip,admin')
  })
})

describe('deduplicateKeys', () => {
  test('returns zeros for empty input', () => {
    expect(deduplicateKeys('')).toEqual({
      deduplicatedText: '',
      beforeCount: 0,
      afterCount: 0,
      removedCount: 0,
    })
  })

  test('removes duplicate keys preserving order', () => {
    const result = deduplicateKeys('key1\nkey2\nkey1\nkey3\nkey2')
    expect(result.deduplicatedText).toBe('key1\nkey2\nkey3')
    expect(result.beforeCount).toBe(5)
    expect(result.afterCount).toBe(3)
    expect(result.removedCount).toBe(2)
  })

  test('trims keys and ignores empty lines', () => {
    const result = deduplicateKeys('  key1  \n\n  key1  \n  key2  ')
    expect(result.deduplicatedText).toBe('key1\nkey2')
    expect(result.afterCount).toBe(2)
  })

  test('handles single key', () => {
    const result = deduplicateKeys('only-key')
    expect(result.deduplicatedText).toBe('only-key')
    expect(result.beforeCount).toBe(1)
    expect(result.afterCount).toBe(1)
    expect(result.removedCount).toBe(0)
  })
})

describe('getKeyPromptForType', () => {
  test('returns specific prompt for known type', () => {
    expect(getKeyPromptForType(15)).toBe('Format: APIKey|SecretKey')
    expect(getKeyPromptForType(33)).toBe('Format: Ak|Sk|Region')
  })

  test('returns default prompt for unknown type', () => {
    expect(getKeyPromptForType(999)).toBe('Enter API key for this channel')
  })
})

describe('formatRelativeTime', () => {
  test('returns Never for 0 or falsy timestamp', () => {
    expect(formatRelativeTime(0)).toBe('Never')
  })

  test('returns Unknown on error', () => {
    expect(formatRelativeTime(NaN)).toBe('Never')
  })
})
