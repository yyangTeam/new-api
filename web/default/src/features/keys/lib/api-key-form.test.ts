import type { ApiKey } from '../types'

import {
  getApiKeyFormSchema,
  getApiKeyFormDefaultValues,
  transformFormDataToPayload,
  transformApiKeyToFormDefaults,
  API_KEY_FORM_DEFAULT_VALUES,
} from './api-key-form'

vi.mock('@/lib/format', () => ({
  parseQuotaFromDollars: (amount: number) => Math.round(amount * 500000),
  quotaUnitsToDollars: (units: number) => units / 500000,
}))

const t = (key: string) => key

describe('getApiKeyFormSchema', () => {
  const schema = getApiKeyFormSchema(t)

  test('accepts valid form data with unlimited quota', () => {
    const result = schema.safeParse({
      name: 'test-key',
      unlimited_quota: true,
      model_limits: [],
    })
    expect(result.success).toBe(true)
  })

  test('rejects empty name', () => {
    const result = schema.safeParse({
      name: '',
      unlimited_quota: true,
      model_limits: [],
    })
    expect(result.success).toBe(false)
  })

  test('accepts valid quota when unlimited is false', () => {
    const result = schema.safeParse({
      name: 'test-key',
      unlimited_quota: false,
      remain_quota_dollars: 10,
      model_limits: [],
    })
    expect(result.success).toBe(true)
  })

  test('rejects negative quota when unlimited is false', () => {
    const result = schema.safeParse({
      name: 'test-key',
      unlimited_quota: false,
      remain_quota_dollars: -1,
      model_limits: [],
    })
    expect(result.success).toBe(false)
  })

  test('rejects undefined quota when unlimited is false', () => {
    const result = schema.safeParse({
      name: 'test-key',
      unlimited_quota: false,
      model_limits: [],
    })
    expect(result.success).toBe(false)
  })

  test('allows zero quota when unlimited is false', () => {
    const result = schema.safeParse({
      name: 'test-key',
      unlimited_quota: false,
      remain_quota_dollars: 0,
      model_limits: [],
    })
    expect(result.success).toBe(true)
  })

  test('skips quota validation when unlimited is true', () => {
    const result = schema.safeParse({
      name: 'test-key',
      unlimited_quota: true,
      remain_quota_dollars: -100,
      model_limits: [],
    })
    expect(result.success).toBe(true)
  })
})

describe('getApiKeyFormDefaultValues', () => {
  test('returns default group when autoGroup is false', () => {
    const defaults = getApiKeyFormDefaultValues(false)
    expect(defaults.group).toBe('')
    expect(defaults.cross_group_retry).toBe(false)
  })

  test('returns auto group when autoGroup is true', () => {
    const defaults = getApiKeyFormDefaultValues(true)
    expect(defaults.group).toBe('auto')
    expect(defaults.cross_group_retry).toBe(true)
  })

  test('preserves other default values', () => {
    const defaults = getApiKeyFormDefaultValues(false)
    expect(defaults.name).toBe('')
    expect(defaults.remain_quota_dollars).toBe(10)
    expect(defaults.expired_time).toBeUndefined()
    expect(defaults.unlimited_quota).toBe(true)
    expect(defaults.model_limits).toEqual([])
    expect(defaults.allow_ips).toBe('')
    expect(defaults.tokenCount).toBe(1)
  })
})

describe('API_KEY_FORM_DEFAULT_VALUES', () => {
  test('has expected default values', () => {
    expect(API_KEY_FORM_DEFAULT_VALUES.name).toBe('')
    expect(API_KEY_FORM_DEFAULT_VALUES.remain_quota_dollars).toBe(10)
    expect(API_KEY_FORM_DEFAULT_VALUES.expired_time).toBeUndefined()
    expect(API_KEY_FORM_DEFAULT_VALUES.unlimited_quota).toBe(true)
    expect(API_KEY_FORM_DEFAULT_VALUES.model_limits).toEqual([])
    expect(API_KEY_FORM_DEFAULT_VALUES.allow_ips).toBe('')
    expect(API_KEY_FORM_DEFAULT_VALUES.group).toBe('')
    expect(API_KEY_FORM_DEFAULT_VALUES.cross_group_retry).toBe(true)
    expect(API_KEY_FORM_DEFAULT_VALUES.tokenCount).toBe(1)
  })
})

describe('transformFormDataToPayload', () => {
  test('transforms basic form data with unlimited quota', () => {
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      remain_quota_dollars: 10,
      model_limits: [],
      allow_ips: '',
      group: '',
    })

    expect(payload.name).toBe('my-key')
    expect(payload.remain_quota).toBe(0)
    expect(payload.unlimited_quota).toBe(true)
    expect(payload.model_limits_enabled).toBe(false)
    expect(payload.model_limits).toBe('')
    expect(payload.allow_ips).toBe('')
    expect(payload.group).toBe('')
    expect(payload.cross_group_retry).toBe(false)
  })

  test('converts quota from dollars when not unlimited', () => {
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: false,
      remain_quota_dollars: 5,
      model_limits: [],
    })

    expect(payload.remain_quota).toBe(2500000)
    expect(payload.unlimited_quota).toBe(false)
  })

  test('defaults remain_quota_dollars to 0 when undefined', () => {
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: false,
      model_limits: [],
    })

    expect(payload.remain_quota).toBe(0)
  })

  test('converts expired_time from Date to unix seconds', () => {
    const date = new Date('2025-06-15T12:00:00Z')
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      expired_time: date,
      model_limits: [],
    })

    expect(payload.expired_time).toBe(Math.floor(date.getTime() / 1000))
  })

  test('sets expired_time to -1 when no expiry', () => {
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      model_limits: [],
    })

    expect(payload.expired_time).toBe(-1)
  })

  test('joins model_limits into comma-separated string', () => {
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      model_limits: ['gpt-4', 'claude-3', 'gemini-pro'],
    })

    expect(payload.model_limits_enabled).toBe(true)
    expect(payload.model_limits).toBe('gpt-4,claude-3,gemini-pro')
  })

  test('sets model_limits_enabled to false when empty', () => {
    const payload = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      model_limits: [],
    })

    expect(payload.model_limits_enabled).toBe(false)
    expect(payload.model_limits).toBe('')
  })

  test('sets cross_group_retry only when group is auto', () => {
    const payloadAuto = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      model_limits: [],
      group: 'auto',
      cross_group_retry: true,
    })
    expect(payloadAuto.cross_group_retry).toBe(true)

    const payloadNonAuto = transformFormDataToPayload({
      name: 'my-key',
      unlimited_quota: true,
      model_limits: [],
      group: 'default',
      cross_group_retry: true,
    })
    expect(payloadNonAuto.cross_group_retry).toBe(false)
  })
})

describe('transformApiKeyToFormDefaults', () => {
  const baseApiKey: ApiKey = {
    id: 1,
    name: 'test-key',
    key: 'sk-abc123',
    status: 1,
    remain_quota: 5000000,
    used_quota: 1000000,
    unlimited_quota: false,
    expired_time: 1718451600,
    created_time: 1718000000,
    accessed_time: 1718100000,
    group: 'default',
    cross_group_retry: false,
    model_limits_enabled: true,
    model_limits: 'gpt-4,claude-3',
    allow_ips: '192.168.1.1',
  }

  test('transforms basic api key fields', () => {
    const form = transformApiKeyToFormDefaults(baseApiKey)
    expect(form.name).toBe('test-key')
    expect(form.allow_ips).toBe('192.168.1.1')
    expect(form.group).toBe('default')
    expect(form.cross_group_retry).toBe(false)
    expect(form.tokenCount).toBe(1)
  })

  test('converts quota units to dollars when not unlimited', () => {
    const form = transformApiKeyToFormDefaults(baseApiKey)
    expect(form.remain_quota_dollars).toBe(10)
    expect(form.unlimited_quota).toBe(false)
  })

  test('sets quota to 0 when unlimited', () => {
    const form = transformApiKeyToFormDefaults({
      ...baseApiKey,
      unlimited_quota: true,
    })
    expect(form.remain_quota_dollars).toBe(0)
    expect(form.unlimited_quota).toBe(true)
  })

  test('converts expired_time to Date object', () => {
    const form = transformApiKeyToFormDefaults(baseApiKey)
    expect(form.expired_time).toBeInstanceOf(Date)
    expect(form.expired_time!.getTime()).toBe(1718451600 * 1000)
  })

  test('sets expired_time to undefined when -1 or 0', () => {
    const formNever = transformApiKeyToFormDefaults({
      ...baseApiKey,
      expired_time: -1,
    })
    expect(formNever.expired_time).toBeUndefined()

    const formZero = transformApiKeyToFormDefaults({
      ...baseApiKey,
      expired_time: 0,
    })
    expect(formZero.expired_time).toBeUndefined()
  })

  test('splits model_limits into array', () => {
    const form = transformApiKeyToFormDefaults(baseApiKey)
    expect(form.model_limits).toEqual(['gpt-4', 'claude-3'])
  })

  test('returns empty array when model_limits is empty', () => {
    const form = transformApiKeyToFormDefaults({
      ...baseApiKey,
      model_limits: '',
    })
    expect(form.model_limits).toEqual([])
  })

  test('returns empty array when model_limits is null', () => {
    const form = transformApiKeyToFormDefaults({
      ...baseApiKey,
      model_limits: null as unknown as string,
    })
    expect(form.model_limits).toEqual([])
  })

  test('defaults allow_ips to empty string when falsy', () => {
    const form = transformApiKeyToFormDefaults({
      ...baseApiKey,
      allow_ips: null as unknown as string,
    })
    expect(form.allow_ips).toBe('')
  })

  test('defaults group to DEFAULT_GROUP when empty', () => {
    const form = transformApiKeyToFormDefaults({
      ...baseApiKey,
      group: '',
    })
    expect(form.group).toBe('')
  })
})
