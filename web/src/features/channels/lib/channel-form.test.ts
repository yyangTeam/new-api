import {
  validateJSON,
  validateModelMapping,
  parseModels,
  parseGroups,
  formatModels,
  formatGroups,
  transformChannelToFormDefaults,
  transformFormDataToCreatePayload,
  transformFormDataToUpdatePayload,
  CHANNEL_FORM_DEFAULT_VALUES,
} from './channel-form'
import type { Channel } from '../types'

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 1,
    type: 1,
    key: 'sk-secret',
    status: 1,
    name: 'Test Channel',
    created_time: 1700000000,
    test_time: 0,
    response_time: 200,
    balance: 10,
    balance_updated_time: 0,
    models: 'gpt-4,gpt-3.5-turbo',
    group: 'default,vip',
    used_quota: 100,
    other: '',
    other_info: '',
    remark: 'test remark',
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

describe('validateJSON', () => {
  test('returns true for empty or whitespace', () => {
    expect(validateJSON('')).toBe(true)
    expect(validateJSON('  ')).toBe(true)
  })

  test('returns true for valid JSON', () => {
    expect(validateJSON('{"key":"value"}')).toBe(true)
    expect(validateJSON('[]')).toBe(true)
    expect(validateJSON('"string"')).toBe(true)
    expect(validateJSON('123')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(validateJSON('{invalid}')).toBe(false)
    expect(validateJSON('not json')).toBe(false)
  })
})

describe('validateModelMapping', () => {
  test('returns true for empty or whitespace', () => {
    expect(validateModelMapping('')).toBe(true)
    expect(validateModelMapping('  ')).toBe(true)
  })

  test('returns true for valid JSON object', () => {
    expect(validateModelMapping('{"gpt-4": "gpt-4-turbo"}')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(validateModelMapping('{bad}')).toBe(false)
  })
})

describe('parseModels', () => {
  test('returns empty array for empty string', () => {
    expect(parseModels('')).toEqual([])
  })

  test('parses comma-separated models', () => {
    expect(parseModels('gpt-4,gpt-3.5-turbo')).toEqual(['gpt-4', 'gpt-3.5-turbo'])
  })

  test('trims whitespace from model names', () => {
    expect(parseModels(' gpt-4 , gpt-3.5-turbo ')).toEqual(['gpt-4', 'gpt-3.5-turbo'])
  })

  test('filters empty entries', () => {
    expect(parseModels('gpt-4,,,')).toEqual(['gpt-4'])
  })
})

describe('parseGroups', () => {
  test('returns empty array for empty string', () => {
    expect(parseGroups('')).toEqual([])
  })

  test('parses comma-separated groups', () => {
    expect(parseGroups('default,vip')).toEqual(['default', 'vip'])
  })

  test('trims whitespace', () => {
    expect(parseGroups(' default , vip ')).toEqual(['default', 'vip'])
  })

  test('filters empty entries', () => {
    expect(parseGroups('default,,vip,')).toEqual(['default', 'vip'])
  })
})

describe('formatModels', () => {
  test('joins models with comma', () => {
    expect(formatModels(['gpt-4', 'gpt-3.5'])).toBe('gpt-4,gpt-3.5')
  })

  test('returns empty string for empty array', () => {
    expect(formatModels([])).toBe('')
  })
})

describe('formatGroups', () => {
  test('joins groups with comma', () => {
    expect(formatGroups(['default', 'vip'])).toBe('default,vip')
  })

  test('returns empty string for empty array', () => {
    expect(formatGroups([])).toBe('')
  })
})

describe('transformChannelToFormDefaults', () => {
  test('transforms basic channel fields', () => {
    const channel = makeChannel()
    const result = transformChannelToFormDefaults(channel)

    expect(result.name).toBe('Test Channel')
    expect(result.type).toBe(1)
    expect(result.models).toBe('gpt-4,gpt-3.5-turbo')
    expect(result.group).toEqual(['default', 'vip'])
    expect(result.status).toBe(1)
    expect(result.remark).toBe('test remark')
  })

  test('never populates key from backend', () => {
    const channel = makeChannel({ key: 'sk-super-secret' })
    const result = transformChannelToFormDefaults(channel)
    expect(result.key).toBe('')
  })

  test('parses extra settings from setting field', () => {
    const channel = makeChannel({
      setting: JSON.stringify({
        force_format: true,
        thinking_to_content: true,
        proxy: 'http://proxy.test',
        pass_through_body_enabled: true,
        system_prompt: 'You are helpful',
        system_prompt_override: true,
      }),
    })
    const result = transformChannelToFormDefaults(channel)

    expect(result.force_format).toBe(true)
    expect(result.thinking_to_content).toBe(true)
    expect(result.proxy).toBe('http://proxy.test')
    expect(result.pass_through_body_enabled).toBe(true)
    expect(result.system_prompt).toBe('You are helpful')
    expect(result.system_prompt_override).toBe(true)
  })

  test('handles invalid setting JSON gracefully', () => {
    const channel = makeChannel({ setting: 'not-json' })
    const result = transformChannelToFormDefaults(channel)
    expect(result.force_format).toBe(false)
  })

  test('parses type-specific settings from settings field', () => {
    const channel = makeChannel({
      type: 41,
      settings: JSON.stringify({
        vertex_key_type: 'api_key',
        allow_service_tier: true,
      }),
    })
    const result = transformChannelToFormDefaults(channel)
    expect(result.vertex_key_type).toBe('api_key')
    expect(result.allow_service_tier).toBe(true)
  })

  test('parses OpenRouter enterprise setting', () => {
    const channel = makeChannel({
      type: 20,
      settings: JSON.stringify({ openrouter_enterprise: true }),
    })
    const result = transformChannelToFormDefaults(channel)
    expect(result.is_enterprise_account).toBe(true)
  })

  test('parses upstream model update ignored models', () => {
    const channel = makeChannel({
      settings: JSON.stringify({
        upstream_model_update_ignored_models: ['model-a', 'model-b'],
      }),
    })
    const result = transformChannelToFormDefaults(channel)
    expect(result.upstream_model_update_ignored_models).toBe('model-a,model-b')
  })

  test('defaults group to ["default"] when empty', () => {
    const channel = makeChannel({ group: '' })
    const result = transformChannelToFormDefaults(channel)
    expect(result.group).toEqual(['default'])
  })

  test('defaults multi_key_mode to single', () => {
    const result = transformChannelToFormDefaults(makeChannel())
    expect(result.multi_key_mode).toBe('single')
  })

  test('defaults key_mode to append', () => {
    const result = transformChannelToFormDefaults(makeChannel())
    expect(result.key_mode).toBe('append')
  })
})

describe('transformFormDataToCreatePayload', () => {
  test('produces correct single-mode payload', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'New Channel',
      type: 1,
      key: 'sk-test-key',
      models: 'gpt-4',
      group: ['default'],
      status: 1,
    }
    const result = transformFormDataToCreatePayload(formData)

    expect(result.mode).toBe('single')
    expect(result.channel.name).toBe('New Channel')
    expect(result.channel.type).toBe(1)
    expect(result.channel.key).toBe('sk-test-key')
    expect(result.channel.models).toBe('gpt-4')
    expect(result.channel.group).toBe('default')
  })

  test('normalizes base_url by removing trailing slashes', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: 'sk-key',
      models: 'gpt-4',
      group: ['default'],
      base_url: 'https://api.example.com///',
      status: 1,
    }
    const result = transformFormDataToCreatePayload(formData)
    expect(result.channel.base_url).toBe('https://api.example.com')
  })

  test('sets multi_key_mode for multi_to_single mode', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Multi',
      key: 'k1\nk2',
      models: 'gpt-4',
      group: ['default'],
      multi_key_mode: 'multi_to_single' as const,
      multi_key_type: 'polling' as const,
      status: 1,
    }
    const result = transformFormDataToCreatePayload(formData)
    expect(result.mode).toBe('multi_to_single')
    expect(result.multi_key_mode).toBe('polling')
  })

  test('sets batch_add_set_key_prefix_2_name for batch mode', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Batch',
      key: 'k1\nk2',
      models: 'gpt-4',
      group: ['default'],
      multi_key_mode: 'batch' as const,
      batch_add_set_key_prefix_2_name: true,
      status: 1,
    }
    const result = transformFormDataToCreatePayload(formData)
    expect(result.mode).toBe('batch')
    expect(result.batch_add_set_key_prefix_2_name).toBe(true)
  })

  test('cleans empty strings to null', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: 'sk-key',
      models: 'gpt-4',
      group: ['default'],
      tag: '',
      remark: '',
      status: 1,
    }
    const result = transformFormDataToCreatePayload(formData)
    expect(result.channel.tag).toBeNull()
  })

  test('builds setting JSON from extra settings', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: 'sk-key',
      models: 'gpt-4',
      group: ['default'],
      force_format: true,
      thinking_to_content: true,
      status: 1,
    }
    const result = transformFormDataToCreatePayload(formData)
    const setting = JSON.parse(result.channel.setting!)
    expect(setting.force_format).toBe(true)
    expect(setting.thinking_to_content).toBe(true)
  })
})

describe('transformFormDataToUpdatePayload', () => {
  test('includes channel id', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Updated',
      key: '',
      models: 'gpt-4',
      group: ['default'],
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 42)
    expect(result.id).toBe(42)
    expect(result.name).toBe('Updated')
  })

  test('omits key when empty', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: '',
      models: 'gpt-4',
      group: ['default'],
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 1)
    expect(result.key).toBeUndefined()
  })

  test('includes key when non-empty', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: 'new-key',
      models: 'gpt-4',
      group: ['default'],
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 1)
    expect(result.key).toBe('new-key')
  })

  test('sends empty strings for nullable fields to allow GORM clearing', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: '',
      models: 'gpt-4',
      group: ['default'],
      tag: '',
      remark: '',
      model_mapping: '',
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 1)
    expect(result.tag).toBe('')
    expect(result.remark).toBe('')
    expect(result.model_mapping).toBe('')
    expect(result.base_url).toBe('')
  })

  test('normalizes base_url by removing trailing slashes', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Test',
      key: '',
      models: 'gpt-4',
      group: ['default'],
      base_url: 'https://api.test.com//',
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 1)
    expect(result.base_url).toBe('https://api.test.com')
  })

  test('builds settings JSON with vertex_key_type for type 41', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'Vertex',
      type: 41,
      key: '',
      models: 'gemini-pro',
      group: ['default'],
      vertex_key_type: 'api_key' as const,
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 1)
    const settings = JSON.parse(result.settings!)
    expect(settings.vertex_key_type).toBe('api_key')
  })

  test('builds settings JSON with openrouter_enterprise for type 20', () => {
    const formData = {
      ...CHANNEL_FORM_DEFAULT_VALUES,
      name: 'OpenRouter',
      type: 20,
      key: '',
      models: 'gpt-4',
      group: ['default'],
      is_enterprise_account: true,
      status: 1,
    }
    const result = transformFormDataToUpdatePayload(formData, 1)
    const settings = JSON.parse(result.settings!)
    expect(settings.openrouter_enterprise).toBe(true)
  })
})
