import {
  getChannelTypeConfig,
  requiresOrganization,
  requiresRegion,
  getDefaultBaseUrl,
  validateKeyFormat,
  getChannelTypeHints,
} from './channel-type-config'

describe('getChannelTypeConfig', () => {
  test('returns config for known type', () => {
    const config = getChannelTypeConfig(1)
    expect(config.id).toBe(1)
    expect(config.name).toBe('OpenAI')
    expect(config.defaultBaseUrl).toBe('https://api.openai.com')
  })

  test('returns config for Anthropic', () => {
    const config = getChannelTypeConfig(14)
    expect(config.id).toBe(14)
    expect(config.name).toBe('Anthropic')
    expect(config.defaultBaseUrl).toBe('https://api.anthropic.com')
  })

  test('returns config for Azure', () => {
    const config = getChannelTypeConfig(3)
    expect(config.id).toBe(3)
    expect(config.requiresRegion).toBe(true)
  })

  test('returns fallback config for unknown type', () => {
    const config = getChannelTypeConfig(999)
    expect(config.id).toBe(999)
    expect(config.name).toBe('Unknown')
    expect(config.icon).toBe('openai')
  })

  test('returns config for DeepSeek', () => {
    const config = getChannelTypeConfig(43)
    expect(config.id).toBe(43)
    expect(config.defaultBaseUrl).toBe('https://api.deepseek.com')
  })

  test('returns config for Vertex AI', () => {
    const config = getChannelTypeConfig(41)
    expect(config.id).toBe(41)
    expect(config.requiresRegion).toBe(true)
  })
})

describe('requiresOrganization', () => {
  test('returns true for OpenAI (type 1)', () => {
    expect(requiresOrganization(1)).toBe(true)
  })

  test('returns false for types without organization requirement', () => {
    expect(requiresOrganization(14)).toBe(false)
    expect(requiresOrganization(24)).toBe(false)
    expect(requiresOrganization(999)).toBe(false)
  })
})

describe('requiresRegion', () => {
  test('returns true for Azure (type 3)', () => {
    expect(requiresRegion(3)).toBe(true)
  })

  test('returns true for Vertex AI (type 41)', () => {
    expect(requiresRegion(41)).toBe(true)
  })

  test('returns false for types without region requirement', () => {
    expect(requiresRegion(1)).toBe(false)
    expect(requiresRegion(14)).toBe(false)
    expect(requiresRegion(999)).toBe(false)
  })
})

describe('getDefaultBaseUrl', () => {
  test('returns default URL for OpenAI', () => {
    expect(getDefaultBaseUrl(1)).toBe('https://api.openai.com')
  })

  test('returns default URL for Anthropic', () => {
    expect(getDefaultBaseUrl(14)).toBe('https://api.anthropic.com')
  })

  test('returns default URL for DeepSeek', () => {
    expect(getDefaultBaseUrl(43)).toBe('https://api.deepseek.com')
  })

  test('returns default URL for OpenRouter', () => {
    expect(getDefaultBaseUrl(20)).toBe('https://openrouter.ai/api')
  })

  test('returns default URL for Replicate', () => {
    expect(getDefaultBaseUrl(56)).toBe('https://api.replicate.com')
  })

  test('returns empty string for types without default URL', () => {
    expect(getDefaultBaseUrl(3)).toBe('')
    expect(getDefaultBaseUrl(999)).toBe('')
  })
})

describe('getChannelTypeHints', () => {
  test('returns hints for known type', () => {
    const hints = getChannelTypeHints(1)
    expect(hints.baseUrl).toBe('Default: https://api.openai.com')
    expect(hints.key).toBe('Format: sk-...')
  })

  test('returns empty object for unknown type', () => {
    expect(getChannelTypeHints(999)).toEqual({})
  })
})

describe('validateKeyFormat', () => {
  test('returns true for types without validation config', () => {
    expect(validateKeyFormat(14, 'sk-ant-anything')).toBe(true)
    expect(validateKeyFormat(999, 'any-key')).toBe(true)
  })

  test('validates OpenAI key format (sk- prefix)', () => {
    expect(validateKeyFormat(1, 'sk-validkeylong12345678')).toBe(true)
    expect(validateKeyFormat(1, 'invalid-key-format-long-enough')).toBe(false)
  })

  test('validates minimum key length for OpenAI', () => {
    expect(validateKeyFormat(1, 'sk-short')).toBe(false)
    expect(validateKeyFormat(1, 'sk-12345678901234567890')).toBe(true)
  })

  test('returns true for types without validation', () => {
    expect(validateKeyFormat(3, 'any-azure-key')).toBe(true)
    expect(validateKeyFormat(24, 'any-google-key')).toBe(true)
  })
})
