import { apiKeySchema } from './types'

const validApiKey = {
  id: 1,
  name: 'Test API Key',
  key: 'sk-abc123def456',
  status: 1,
  remain_quota: 50000,
  used_quota: 10000,
  unlimited_quota: false,
  expired_time: 1735689600,
  created_time: 1700000000,
  accessed_time: 1700500000,
  group: 'default',
  cross_group_retry: false,
  model_limits_enabled: false,
  model_limits: '',
  allow_ips: '',
}

describe('apiKeySchema', () => {
  test('parses valid API key data', () => {
    const result = apiKeySchema.safeParse(validApiKey)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.name).toBe('Test API Key')
      expect(result.data.key).toBe('sk-abc123def456')
      expect(result.data.status).toBe(1)
      expect(result.data.unlimited_quota).toBe(false)
      expect(result.data.cross_group_retry).toBe(false)
    }
  })

  test('preprocesses cross_group_retry from number 1 to true', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      cross_group_retry: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cross_group_retry).toBe(true)
    }
  })

  test('preprocesses cross_group_retry from number 0 to false', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      cross_group_retry: 0,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cross_group_retry).toBe(false)
    }
  })

  test('accepts boolean cross_group_retry directly', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      cross_group_retry: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cross_group_retry).toBe(true)
    }
  })

  test('defaults cross_group_retry to false when omitted', () => {
    const { cross_group_retry: _, ...withoutCrossGroup } = validApiKey
    const result = apiKeySchema.safeParse(withoutCrossGroup)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cross_group_retry).toBe(false)
    }
  })

  test('applies defaults for nullish group', () => {
    const result = apiKeySchema.safeParse({ ...validApiKey, group: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.group).toBeNull()
    }
  })

  test('applies defaults for nullish model_limits', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      model_limits: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.model_limits).toBeNull()
    }
  })

  test('defaults allow_ips to empty string when omitted', () => {
    const { allow_ips: _, ...withoutAllowIps } = validApiKey
    const result = apiKeySchema.safeParse(withoutAllowIps)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.allow_ips).toBe('')
    }
  })

  test('rejects missing required id', () => {
    const { id: _, ...noId } = validApiKey
    const result = apiKeySchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required name', () => {
    const { name: _, ...noName } = validApiKey
    const result = apiKeySchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  test('rejects missing required key', () => {
    const { key: _, ...noKey } = validApiKey
    const result = apiKeySchema.safeParse(noKey)
    expect(result.success).toBe(false)
  })

  test('rejects non-number status', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      status: 'enabled',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-boolean unlimited_quota', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      unlimited_quota: 'yes',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-boolean model_limits_enabled', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      model_limits_enabled: 1,
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-number remain_quota', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      remain_quota: 'fifty',
    })
    expect(result.success).toBe(false)
  })

  test('accepts -1 as expired_time for never expires', () => {
    const result = apiKeySchema.safeParse({
      ...validApiKey,
      expired_time: -1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expired_time).toBe(-1)
    }
  })
})
