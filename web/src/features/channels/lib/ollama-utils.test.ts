import { resolveOllamaBaseUrl, normalizeOllamaModels, formatBytes } from './ollama-utils'
import type { Channel } from '../types'

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 1,
    type: 4,
    key: '',
    status: 1,
    name: 'Ollama',
    created_time: 0,
    test_time: 0,
    response_time: 0,
    balance: 0,
    balance_updated_time: 0,
    models: '',
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

describe('resolveOllamaBaseUrl', () => {
  test('returns empty string for null channel', () => {
    expect(resolveOllamaBaseUrl(null)).toBe('')
  })

  test('returns base_url when set', () => {
    const ch = makeChannel({ base_url: 'http://localhost:11434' })
    expect(resolveOllamaBaseUrl(ch)).toBe('http://localhost:11434')
  })

  test('trims whitespace from base_url', () => {
    const ch = makeChannel({ base_url: '  http://localhost:11434  ' })
    expect(resolveOllamaBaseUrl(ch)).toBe('http://localhost:11434')
  })

  test('falls back to ollama_base_url field', () => {
    const ch = makeChannel({ base_url: '' })
    ;(ch as unknown as Record<string, unknown>).ollama_base_url = 'http://fallback:11434'
    expect(resolveOllamaBaseUrl(ch)).toBe('http://fallback:11434')
  })

  test('falls back to other_info.base_url', () => {
    const ch = makeChannel({
      base_url: '',
      other_info: JSON.stringify({ base_url: 'http://other-info:11434' }),
    })
    expect(resolveOllamaBaseUrl(ch)).toBe('http://other-info:11434')
  })

  test('falls back to other_info.public_url', () => {
    const ch = makeChannel({
      base_url: '',
      other_info: JSON.stringify({ public_url: 'http://public:11434' }),
    })
    expect(resolveOllamaBaseUrl(ch)).toBe('http://public:11434')
  })

  test('falls back to other_info.api_url', () => {
    const ch = makeChannel({
      base_url: '',
      other_info: JSON.stringify({ api_url: 'http://api:11434' }),
    })
    expect(resolveOllamaBaseUrl(ch)).toBe('http://api:11434')
  })

  test('returns empty string when no URL found', () => {
    const ch = makeChannel({ base_url: '', other_info: '' })
    expect(resolveOllamaBaseUrl(ch)).toBe('')
  })

  test('prioritizes base_url over other_info', () => {
    const ch = makeChannel({
      base_url: 'http://primary:11434',
      other_info: JSON.stringify({ base_url: 'http://secondary:11434' }),
    })
    expect(resolveOllamaBaseUrl(ch)).toBe('http://primary:11434')
  })
})

describe('normalizeOllamaModels', () => {
  test('returns empty array for non-array input', () => {
    expect(normalizeOllamaModels(null)).toEqual([])
    expect(normalizeOllamaModels(undefined)).toEqual([])
    expect(normalizeOllamaModels('string')).toEqual([])
    expect(normalizeOllamaModels({})).toEqual([])
  })

  test('converts string items to OllamaModel', () => {
    const result = normalizeOllamaModels(['llama2', 'mistral'])
    expect(result).toEqual([
      { id: 'llama2', owned_by: 'ollama' },
      { id: 'mistral', owned_by: 'ollama' },
    ])
  })

  test('normalizes object items with id field', () => {
    const result = normalizeOllamaModels([{ id: 'llama2', size: 4000000000 }])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('llama2')
    expect(result[0].size).toBe(4000000000)
    expect(result[0].owned_by).toBe('ollama')
  })

  test('uses name field as fallback for id', () => {
    const result = normalizeOllamaModels([{ name: 'llama2:latest' }])
    expect(result[0].id).toBe('llama2:latest')
  })

  test('uses model field as fallback for id', () => {
    const result = normalizeOllamaModels([{ model: 'llama2' }])
    expect(result[0].id).toBe('llama2')
  })

  test('uses Model field as fallback for id', () => {
    const result = normalizeOllamaModels([{ Model: 'llama2' }])
    expect(result[0].id).toBe('llama2')
  })

  test('uses ID field as fallback for id', () => {
    const result = normalizeOllamaModels([{ ID: 'llama2' }])
    expect(result[0].id).toBe('llama2')
  })

  test('skips items without any id field', () => {
    const result = normalizeOllamaModels([{ size: 100 }])
    expect(result).toEqual([])
  })

  test('skips null/falsy items', () => {
    const result = normalizeOllamaModels([null, undefined, '', 0])
    expect(result).toEqual([])
  })

  test('extracts metadata fields', () => {
    const result = normalizeOllamaModels([
      {
        id: 'test',
        metadata: {
          size: 5000,
          digest: 'sha256:abc',
          modified_at: '2024-01-01',
          details: { family: 'llama' },
        },
      },
    ])
    expect(result[0].size).toBe(5000)
    expect(result[0].digest).toBe('sha256:abc')
    expect(result[0].modified_at).toBe('2024-01-01')
    expect(result[0].details).toEqual({ family: 'llama' })
  })

  test('prefers item-level size over metadata size', () => {
    const result = normalizeOllamaModels([
      { id: 'test', size: 1000, metadata: { size: 2000 } },
    ])
    expect(result[0].size).toBe(1000)
  })

  test('uses ownedBy as fallback for owned_by', () => {
    const result = normalizeOllamaModels([{ id: 'test', ownedBy: 'custom' }])
    expect(result[0].owned_by).toBe('custom')
  })
})

describe('formatBytes', () => {
  test('returns "-" for undefined or NaN', () => {
    expect(formatBytes(undefined)).toBe('-')
    expect(formatBytes(NaN)).toBe('-')
  })

  test('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  test('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB')
    expect(formatBytes(1572864)).toBe('1.5 MB')
  })

  test('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB')
    expect(formatBytes(4294967296)).toBe('4.00 GB')
  })
})
