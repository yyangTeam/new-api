import {
  transformModelToFormDefaults,
  transformFormDataToModelPayload,
  formatTagsArray,
  validateJSON,
  validateEndpoints,
} from './model-form'

describe('formatTagsArray', () => {
  test('joins tags with commas', () => {
    expect(formatTagsArray(['chat', 'vision', 'code'])).toBe(
      'chat,vision,code'
    )
  })

  test('filters out empty strings', () => {
    expect(formatTagsArray(['chat', '', 'code'])).toBe('chat,code')
  })

  test('returns empty string for empty array', () => {
    expect(formatTagsArray([])).toBe('')
  })
})

describe('validateJSON', () => {
  test('returns true for empty string', () => {
    expect(validateJSON('')).toBe(true)
  })

  test('returns true for whitespace-only string', () => {
    expect(validateJSON('   ')).toBe(true)
  })

  test('returns true for valid JSON object', () => {
    expect(validateJSON('{"key": "value"}')).toBe(true)
  })

  test('returns true for valid JSON array', () => {
    expect(validateJSON('[1, 2, 3]')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(validateJSON('{invalid}')).toBe(false)
  })
})

describe('validateEndpoints', () => {
  test('returns true for valid JSON', () => {
    expect(validateEndpoints('{"endpoint": "/v1/chat"}')).toBe(true)
  })

  test('returns true for empty string', () => {
    expect(validateEndpoints('')).toBe(true)
  })

  test('returns false for invalid JSON', () => {
    expect(validateEndpoints('not-json')).toBe(false)
  })
})

describe('transformModelToFormDefaults', () => {
  test('transforms a model with all fields', () => {
    const model = {
      id: 1,
      model_name: 'gpt-4',
      description: 'A model',
      icon: 'icon.png',
      tags: 'chat,vision',
      vendor_id: 5,
      endpoints: '{"ep":"val"}',
      name_rule: 2,
      status: 1,
      sync_official: 1,
      created_time: 1000,
      updated_time: 2000,
      enable_groups: ['default', 'vip'],
      quota_types: [0, 1],
    }

    const result = transformModelToFormDefaults(model)
    expect(result).toEqual({
      id: 1,
      model_name: 'gpt-4',
      description: 'A model',
      icon: 'icon.png',
      tags: ['chat', 'vision'],
      vendor_id: 5,
      endpoints: '{"ep":"val"}',
      name_rule: 2,
      status: true,
      sync_official: true,
      enable_groups: ['default', 'vip'],
      quota_types: [0, 1],
    })
  })

  test('handles disabled model (status=0)', () => {
    const model = {
      id: 2,
      model_name: 'test',
      status: 0,
      sync_official: 0,
      created_time: 0,
      updated_time: 0,
    }

    const result = transformModelToFormDefaults(model)
    expect(result.status).toBe(false)
    expect(result.sync_official).toBe(false)
  })

  test('defaults missing optional fields', () => {
    const model = {
      id: 3,
      model_name: 'test',
      status: 1,
      sync_official: 1,
      created_time: 0,
      updated_time: 0,
    }

    const result = transformModelToFormDefaults(model)
    expect(result.description).toBe('')
    expect(result.icon).toBe('')
    expect(result.tags).toEqual([])
    expect(result.endpoints).toBe('')
    expect(result.name_rule).toBe(0)
    expect(result.enable_groups).toEqual([])
    expect(result.quota_types).toEqual([])
  })
})

describe('transformFormDataToModelPayload', () => {
  test('transforms form data to payload', () => {
    const formData = {
      id: 1,
      model_name: 'gpt-4',
      description: 'A model',
      icon: 'icon.png',
      tags: ['chat', 'vision'],
      vendor_id: 5,
      endpoints: '{}',
      name_rule: 2,
      status: true,
      sync_official: true,
      enable_groups: ['default'],
      quota_types: [0],
    }

    const result = transformFormDataToModelPayload(formData)
    expect(result.status).toBe(1)
    expect(result.sync_official).toBe(1)
    expect(result.tags).toBe('chat,vision')
    expect(result.model_name).toBe('gpt-4')
  })

  test('converts false status to 0', () => {
    const formData = {
      model_name: 'test',
      description: '',
      icon: '',
      tags: [],
      endpoints: '',
      name_rule: 0,
      status: false,
      sync_official: false,
      enable_groups: [],
      quota_types: [],
    }

    const result = transformFormDataToModelPayload(formData)
    expect(result.status).toBe(0)
    expect(result.sync_official).toBe(0)
  })
})
