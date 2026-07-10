import { channelSchema, channelInfoSchema } from './types'

const validChannelInfo = {
  is_multi_key: true,
  multi_key_size: 3,
  multi_key_status_list: { '0': 1, '1': 2 },
  multi_key_disabled_reason: { '1': 'rate limited' },
  multi_key_disabled_time: { '1': 1700000000 },
  multi_key_polling_index: 1,
  multi_key_mode: 'polling' as const,
}

const validChannel = {
  id: 1,
  type: 1,
  key: 'sk-test-key-123',
  openai_organization: 'org-123',
  test_model: 'gpt-4',
  status: 1,
  name: 'Test Channel',
  weight: 5,
  created_time: 1700000000,
  test_time: 1700001000,
  response_time: 250,
  base_url: 'https://api.openai.com',
  other: '{}',
  balance: 100.5,
  balance_updated_time: 1700002000,
  models: 'gpt-4,gpt-3.5-turbo',
  group: 'default',
  used_quota: 5000,
  model_mapping: '{"gpt-4": "gpt-4-turbo"}',
  status_code_mapping: '',
  priority: 10,
  auto_ban: 1,
  other_info: '',
  tag: 'production',
  setting: '{}',
  param_override: null,
  header_override: null,
  remark: 'Primary OpenAI channel',
  max_input_tokens: 128000,
  channel_info: validChannelInfo,
  settings: '{}',
}

describe('channelInfoSchema', () => {
  test('parses valid channel info with all fields', () => {
    const result = channelInfoSchema.safeParse(validChannelInfo)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_multi_key).toBe(true)
      expect(result.data.multi_key_size).toBe(3)
      expect(result.data.multi_key_mode).toBe('polling')
      expect(result.data.multi_key_polling_index).toBe(1)
    }
  })

  test('applies defaults for missing fields', () => {
    const result = channelInfoSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_multi_key).toBe(false)
      expect(result.data.multi_key_size).toBe(0)
      expect(result.data.multi_key_polling_index).toBe(0)
      expect(result.data.multi_key_mode).toBe('random')
    }
  })

  test('rejects invalid multi_key_mode', () => {
    const result = channelInfoSchema.safeParse({
      multi_key_mode: 'invalid_mode',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-boolean is_multi_key', () => {
    const result = channelInfoSchema.safeParse({
      is_multi_key: 'yes',
    })
    expect(result.success).toBe(false)
  })

  test('accepts optional record fields as undefined', () => {
    const result = channelInfoSchema.safeParse({
      is_multi_key: false,
      multi_key_size: 0,
      multi_key_polling_index: 0,
      multi_key_mode: 'random',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.multi_key_status_list).toBeUndefined()
      expect(result.data.multi_key_disabled_reason).toBeUndefined()
      expect(result.data.multi_key_disabled_time).toBeUndefined()
    }
  })

  test('rejects non-number values in multi_key_status_list', () => {
    const result = channelInfoSchema.safeParse({
      multi_key_status_list: { '0': 'enabled' },
    })
    expect(result.success).toBe(false)
  })
})

describe('channelSchema', () => {
  test('parses valid channel with all fields', () => {
    const result = channelSchema.safeParse(validChannel)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe(1)
      expect(result.data.name).toBe('Test Channel')
      expect(result.data.status).toBe(1)
      expect(result.data.models).toBe('gpt-4,gpt-3.5-turbo')
      expect(result.data.channel_info.is_multi_key).toBe(true)
    }
  })

  test('applies defaults for optional fields with defaults', () => {
    const minimal = {
      id: 1,
      type: 1,
      key: 'sk-test',
      status: 1,
      name: 'Min Channel',
      created_time: 1700000000,
      test_time: 0,
      response_time: 0,
      balance_updated_time: 0,
    }
    const result = channelSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.other).toBe('')
      expect(result.data.balance).toBe(0)
      expect(result.data.models).toBe('')
      expect(result.data.group).toBe('default')
      expect(result.data.used_quota).toBe(0)
      expect(result.data.other_info).toBe('')
      expect(result.data.remark).toBe('')
      expect(result.data.max_input_tokens).toBe(0)
      expect(result.data.settings).toBe('{}')
      expect(result.data.channel_info).toEqual({
        is_multi_key: false,
        multi_key_size: 0,
        multi_key_polling_index: 0,
        multi_key_mode: 'random',
      })
    }
  })

  test('rejects missing required id', () => {
    const { id: _, ...noId } = validChannel
    const result = channelSchema.safeParse(noId)
    expect(result.success).toBe(false)
  })

  test('rejects missing required name', () => {
    const { name: _, ...noName } = validChannel
    const result = channelSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  test('rejects non-number id', () => {
    const result = channelSchema.safeParse({ ...validChannel, id: 'abc' })
    expect(result.success).toBe(false)
  })

  test('accepts nullish values for nullable fields', () => {
    const result = channelSchema.safeParse({
      ...validChannel,
      openai_organization: null,
      test_model: undefined,
      base_url: null,
      weight: null,
      model_mapping: null,
      priority: undefined,
      tag: null,
      setting: null,
    })
    expect(result.success).toBe(true)
  })

  test('rejects non-number status', () => {
    const result = channelSchema.safeParse({
      ...validChannel,
      status: 'enabled',
    })
    expect(result.success).toBe(false)
  })

  test('rejects non-string key', () => {
    const result = channelSchema.safeParse({ ...validChannel, key: 12345 })
    expect(result.success).toBe(false)
  })
})
