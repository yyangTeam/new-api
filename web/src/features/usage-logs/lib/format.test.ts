import {
  getParamOverrideActionLabel,
  parseAuditLine,
  isViolationFeeLog,
  parseLogOther,
  getTimeColor,
  getFirstResponseTimeColor,
  getThroughputColor,
  getResponseTimeColor,
  formatModelName,
  decodeBillingExprB64,
  resolveMatchedTier,
  hasAnyCacheTokens,
  formatDuration,
  renderAuditContent,
} from './format'
import type { LogOtherData } from '../types'

describe('getParamOverrideActionLabel', () => {
  test('returns translated label for known action', () => {
    const t = (key: string) => `[${key}]`
    expect(getParamOverrideActionLabel('set', t)).toBe('[Set]')
  })

  test('returns translated label for case-insensitive match', () => {
    const t = (key: string) => `[${key}]`
    expect(getParamOverrideActionLabel('DELETE', t)).toBe('[Delete]')
  })

  test('returns raw action for unknown action', () => {
    const t = (key: string) => `[${key}]`
    expect(getParamOverrideActionLabel('custom_action', t)).toBe(
      'custom_action'
    )
  })
})

describe('parseAuditLine', () => {
  test('returns null for non-string input', () => {
    expect(parseAuditLine(123 as never)).toBeNull()
  })

  test('parses action and content from line', () => {
    expect(parseAuditLine('set key=value')).toEqual({
      action: 'set',
      content: 'key=value',
    })
  })

  test('returns line as both action and content when no space', () => {
    expect(parseAuditLine('delete')).toEqual({
      action: 'delete',
      content: 'delete',
    })
  })

  test('handles multiple spaces', () => {
    expect(parseAuditLine('set key = value')).toEqual({
      action: 'set',
      content: 'key = value',
    })
  })
})

describe('isViolationFeeLog', () => {
  test('returns false for null', () => {
    expect(isViolationFeeLog(null)).toBe(false)
  })

  test('returns true when violation_fee is true', () => {
    expect(isViolationFeeLog({ violation_fee: true } as LogOtherData)).toBe(
      true
    )
  })

  test('returns true when violation_fee_code is set', () => {
    expect(
      isViolationFeeLog({ violation_fee_code: 'CODE1' } as LogOtherData)
    ).toBe(true)
  })

  test('returns true when violation_fee_marker is set', () => {
    expect(
      isViolationFeeLog({ violation_fee_marker: 'marker' } as LogOtherData)
    ).toBe(true)
  })

  test('returns false when no violation fields set', () => {
    expect(isViolationFeeLog({} as LogOtherData)).toBe(false)
  })
})

describe('parseLogOther', () => {
  test('returns null for empty string', () => {
    expect(parseLogOther('')).toBeNull()
  })

  test('parses valid JSON', () => {
    expect(parseLogOther('{"model_ratio": 2}')).toEqual({ model_ratio: 2 })
  })

  test('returns null for invalid JSON', () => {
    expect(parseLogOther('not json')).toBeNull()
  })
})

describe('getTimeColor', () => {
  test('returns success for < 10 seconds', () => {
    expect(getTimeColor(5)).toBe('success')
  })

  test('returns warning for 10-29 seconds', () => {
    expect(getTimeColor(15)).toBe('warning')
  })

  test('returns danger for >= 30 seconds', () => {
    expect(getTimeColor(30)).toBe('danger')
  })
})

describe('getFirstResponseTimeColor', () => {
  test('returns success for < 5 seconds', () => {
    expect(getFirstResponseTimeColor(3)).toBe('success')
  })

  test('returns warning for 5-9 seconds', () => {
    expect(getFirstResponseTimeColor(7)).toBe('warning')
  })

  test('returns danger for >= 10 seconds', () => {
    expect(getFirstResponseTimeColor(10)).toBe('danger')
  })
})

describe('getThroughputColor', () => {
  test('returns success for >= 30 tokens/s', () => {
    expect(getThroughputColor(30)).toBe('success')
  })

  test('returns warning for 15-29 tokens/s', () => {
    expect(getThroughputColor(20)).toBe('warning')
  })

  test('returns danger for < 15 tokens/s', () => {
    expect(getThroughputColor(10)).toBe('danger')
  })
})

describe('getResponseTimeColor', () => {
  test('falls back to getTimeColor for small completion tokens', () => {
    expect(getResponseTimeColor(5, 50)).toBe('success')
    expect(getResponseTimeColor(15, 50)).toBe('warning')
  })

  test('falls back to getTimeColor for zero seconds', () => {
    expect(getResponseTimeColor(0, 200)).toBe('success')
  })

  test('uses throughput for large completion tokens', () => {
    expect(getResponseTimeColor(5, 200)).toBe('success')
    expect(getResponseTimeColor(20, 200)).toBe('danger')
  })
})

describe('formatModelName', () => {
  test('returns model name without mapping', () => {
    const result = formatModelName({
      model_name: 'gpt-4',
      other: '{}',
    } as never)
    expect(result).toEqual({ name: 'gpt-4', isMapped: false, actualModel: undefined })
  })

  test('returns mapped model info', () => {
    const other = JSON.stringify({
      is_model_mapped: true,
      upstream_model_name: 'gpt-4-turbo',
    })
    const result = formatModelName({
      model_name: 'gpt-4',
      other,
    } as never)
    expect(result).toEqual({
      name: 'gpt-4',
      isMapped: true,
      actualModel: 'gpt-4-turbo',
    })
  })

  test('handles invalid other JSON', () => {
    const result = formatModelName({
      model_name: 'gpt-4',
      other: 'not json',
    } as never)
    expect(result).toEqual({ name: 'gpt-4', isMapped: false, actualModel: undefined })
  })
})

describe('decodeBillingExprB64', () => {
  test('returns empty string for undefined', () => {
    expect(decodeBillingExprB64(undefined)).toBe('')
  })

  test('returns empty string for empty string', () => {
    expect(decodeBillingExprB64('')).toBe('')
  })

  test('decodes valid base64', () => {
    const encoded = btoa('hello world')
    expect(decodeBillingExprB64(encoded)).toBe('hello world')
  })

  test('returns empty string for invalid base64', () => {
    expect(decodeBillingExprB64('!!not-base64!!')).toBe('')
  })
})

describe('resolveMatchedTier', () => {
  test('returns null for empty tiers', () => {
    expect(resolveMatchedTier([], 'tier1')).toBeNull()
  })

  test('returns null for undefined matchedLabel', () => {
    expect(resolveMatchedTier([{ label: 'Tier 1' } as never], undefined)).toBeNull()
  })

  test('finds matching tier', () => {
    const tiers = [
      { label: 'Tier 1', inputPrice: 1 },
      { label: 'Tier 2', inputPrice: 2 },
    ]
    const result = resolveMatchedTier(tiers as never[], 'Tier 1')
    expect(result).toEqual({ label: 'Tier 1', inputPrice: 1 })
  })

  test('returns null when no tier matches', () => {
    const tiers = [{ label: 'Tier 1' }]
    expect(resolveMatchedTier(tiers as never[], 'Unknown')).toBeNull()
  })
})

describe('hasAnyCacheTokens', () => {
  test('returns false for null', () => {
    expect(hasAnyCacheTokens(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(hasAnyCacheTokens(undefined)).toBe(false)
  })

  test('returns false when all cache fields are 0', () => {
    expect(
      hasAnyCacheTokens({
        cache_tokens: 0,
        cache_creation_tokens: 0,
      } as LogOtherData)
    ).toBe(false)
  })

  test('returns true when cache_tokens > 0', () => {
    expect(hasAnyCacheTokens({ cache_tokens: 100 } as LogOtherData)).toBe(true)
  })

  test('returns true when cache_creation_tokens > 0', () => {
    expect(
      hasAnyCacheTokens({ cache_creation_tokens: 50 } as LogOtherData)
    ).toBe(true)
  })

  test('returns true when cache_creation_tokens_5m > 0', () => {
    expect(
      hasAnyCacheTokens({ cache_creation_tokens_5m: 10 } as LogOtherData)
    ).toBe(true)
  })

  test('returns true when cache_creation_tokens_1h > 0', () => {
    expect(
      hasAnyCacheTokens({ cache_creation_tokens_1h: 5 } as LogOtherData)
    ).toBe(true)
  })
})

describe('formatDuration', () => {
  test('returns null when submitTime is missing', () => {
    expect(formatDuration(undefined, 1000)).toBeNull()
  })

  test('returns null when finishTime is missing', () => {
    expect(formatDuration(1000, undefined)).toBeNull()
  })

  test('calculates duration in milliseconds by default', () => {
    const result = formatDuration(1000, 6000)
    expect(result).toEqual({ durationSec: 5, variant: 'green' })
  })

  test('calculates duration in seconds when specified', () => {
    const result = formatDuration(100, 170, 'seconds')
    expect(result).toEqual({ durationSec: 70, variant: 'red' })
  })

  test('returns null when submitTime is 0 (falsy)', () => {
    expect(formatDuration(0, 60000)).toBeNull()
  })

  test('returns green variant for <= 60 seconds', () => {
    const result = formatDuration(1000, 61000)
    expect(result!.variant).toBe('green')
  })

  test('returns red variant for > 60 seconds', () => {
    const result = formatDuration(1000, 62000)
    expect(result!.variant).toBe('red')
  })
})

describe('renderAuditContent', () => {
  test('returns null for null other', () => {
    const t = (key: string) => key
    expect(renderAuditContent(null, t)).toBeNull()
  })

  test('returns null when no op.action', () => {
    const t = (key: string) => key
    expect(renderAuditContent({} as LogOtherData, t)).toBeNull()
  })

  test('returns null for unknown action', () => {
    const t = (key: string) => key
    expect(
      renderAuditContent({ op: { action: 'unknown.action' } } as LogOtherData, t)
    ).toBeNull()
  })

  test('returns translated template for login action', () => {
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (opts?.method) return `Logged in via ${opts.method}`
      return key
    }
    const result = renderAuditContent(
      { op: { action: 'login', params: { method: 'password' } } } as LogOtherData,
      t
    )
    expect(result).toBe('Logged in via password')
  })

  test('renders channel.create action', () => {
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (key.includes('Created channel'))
        return `Created channel ${opts?.name} (type ${opts?.type}, count ${opts?.count})`
      return key
    }
    const result = renderAuditContent(
      {
        op: {
          action: 'channel.create',
          params: { name: 'test', type: 'openai', count: '3' },
        },
      } as never,
      t
    )
    expect(result).toContain('Created channel test')
  })
})
