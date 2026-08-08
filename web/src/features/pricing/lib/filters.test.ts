import {
  filterBySearch,
  filterByVendor,
  filterByGroup,
  sortModels,
  filterAndSortModels,
  parseTags,
  extractAllTags,
  filterByTag,
} from './filters'
import type { PricingModel } from '../types'

function makeModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    ...overrides,
  }
}

describe('filterBySearch', () => {
  const models = [
    makeModel({ id: 1, model_name: 'gpt-4o', vendor_name: 'OpenAI', tags: 'chat' }),
    makeModel({ id: 2, model_name: 'claude-3', vendor_name: 'Anthropic', description: 'Large model' }),
    makeModel({ id: 3, model_name: 'gemini-pro', vendor_name: 'Google' }),
  ]

  test('returns all models when query is empty', () => {
    expect(filterBySearch(models, '')).toEqual(models)
  })

  test('filters by model name (case-insensitive)', () => {
    expect(filterBySearch(models, 'GPT')).toHaveLength(1)
    expect(filterBySearch(models, 'gpt')[0].model_name).toBe('gpt-4o')
  })

  test('filters by vendor name', () => {
    const result = filterBySearch(models, 'anthropic')
    expect(result).toHaveLength(1)
    expect(result[0].model_name).toBe('claude-3')
  })

  test('filters by description', () => {
    const result = filterBySearch(models, 'large')
    expect(result).toHaveLength(1)
    expect(result[0].model_name).toBe('claude-3')
  })

  test('filters by tags', () => {
    const result = filterBySearch(models, 'chat')
    expect(result).toHaveLength(1)
    expect(result[0].model_name).toBe('gpt-4o')
  })

  test('returns empty array when no match', () => {
    expect(filterBySearch(models, 'nonexistent')).toEqual([])
  })
})

describe('filterByVendor', () => {
  const models = [
    makeModel({ id: 1, vendor_name: 'OpenAI' }),
    makeModel({ id: 2, vendor_name: 'Anthropic' }),
  ]

  test('returns all models when vendor is "all"', () => {
    expect(filterByVendor(models, 'all')).toEqual(models)
  })

  test('filters by exact vendor name', () => {
    const result = filterByVendor(models, 'OpenAI')
    expect(result).toHaveLength(1)
    expect(result[0].vendor_name).toBe('OpenAI')
  })

  test('returns empty when vendor does not match', () => {
    expect(filterByVendor(models, 'Google')).toEqual([])
  })
})

describe('filterByGroup', () => {
  const models = [
    makeModel({ id: 1, enable_groups: ['default', 'premium'] }),
    makeModel({ id: 2, enable_groups: ['premium'] }),
    makeModel({ id: 3, enable_groups: ['default'] }),
  ]

  test('returns all models when group is "all"', () => {
    expect(filterByGroup(models, 'all')).toEqual(models)
  })

  test('filters by group membership', () => {
    const result = filterByGroup(models, 'premium')
    expect(result).toHaveLength(2)
  })

  test('returns only default group models', () => {
    const result = filterByGroup(models, 'default')
    expect(result).toHaveLength(2)
    expect(result.map((m) => m.id)).toEqual([1, 3])
  })
})

describe('sortModels', () => {
  const models = [
    makeModel({ id: 1, model_name: 'banana', model_ratio: 3, quota_type: 0 }),
    makeModel({ id: 2, model_name: 'apple', model_ratio: 1, quota_type: 0 }),
    makeModel({ id: 3, model_name: 'cherry', model_ratio: 2, quota_type: 0 }),
  ]

  test('sorts by name alphabetically', () => {
    const sorted = sortModels(models, 'name')
    expect(sorted.map((m) => m.model_name)).toEqual([
      'apple',
      'banana',
      'cherry',
    ])
  })

  test('sorts by price low to high', () => {
    const sorted = sortModels(models, 'price-low')
    expect(sorted.map((m) => m.model_ratio)).toEqual([1, 2, 3])
  })

  test('sorts by price high to low', () => {
    const sorted = sortModels(models, 'price-high')
    expect(sorted.map((m) => m.model_ratio)).toEqual([3, 2, 1])
  })

  test('does not mutate original array', () => {
    const original = [...models]
    sortModels(models, 'name')
    expect(models).toEqual(original)
  })

  test('returns unsorted copy for unknown sort option', () => {
    const sorted = sortModels(models, 'unknown')
    expect(sorted).toEqual(models)
    expect(sorted).not.toBe(models)
  })

  test('uses model_price for request quota type models', () => {
    const requestModels = [
      makeModel({ id: 1, quota_type: 1, model_ratio: 100, model_price: 5 }),
      makeModel({ id: 2, quota_type: 1, model_ratio: 100, model_price: 1 }),
    ]
    const sorted = sortModels(requestModels, 'price-low')
    expect(sorted[0].model_price).toBe(1)
    expect(sorted[1].model_price).toBe(5)
  })
})

describe('parseTags', () => {
  test('returns empty array for undefined input', () => {
    expect(parseTags(undefined)).toEqual([])
  })

  test('returns empty array for empty string', () => {
    expect(parseTags('')).toEqual([])
  })

  test('splits by comma', () => {
    expect(parseTags('chat,vision,audio')).toEqual(['chat', 'vision', 'audio'])
  })

  test('splits by semicolon', () => {
    expect(parseTags('chat;vision')).toEqual(['chat', 'vision'])
  })

  test('splits by pipe', () => {
    expect(parseTags('chat|vision')).toEqual(['chat', 'vision'])
  })

  test('splits by whitespace', () => {
    expect(parseTags('chat vision')).toEqual(['chat', 'vision'])
  })

  test('trims resulting tags', () => {
    expect(parseTags('chat , vision')).toEqual(['chat', 'vision'])
  })

  test('filters out empty strings', () => {
    expect(parseTags(',chat,,vision,')).toEqual(['chat', 'vision'])
  })
})

describe('extractAllTags', () => {
  test('returns empty array for models without tags', () => {
    const models = [makeModel({ tags: undefined })]
    expect(extractAllTags(models)).toEqual([])
  })

  test('extracts and deduplicates tags', () => {
    const models = [
      makeModel({ tags: 'Chat,Vision' }),
      makeModel({ tags: 'chat,Audio' }),
    ]
    const tags = extractAllTags(models)
    expect(tags).toEqual(['audio', 'chat', 'vision'])
  })

  test('returns tags sorted alphabetically', () => {
    const models = [makeModel({ tags: 'z,a,m' })]
    const tags = extractAllTags(models)
    expect(tags).toEqual(['a', 'm', 'z'])
  })

  test('lowercases all tags', () => {
    const models = [makeModel({ tags: 'Chat,VISION' })]
    const tags = extractAllTags(models)
    expect(tags).toEqual(['chat', 'vision'])
  })
})

describe('filterByTag', () => {
  const models = [
    makeModel({ id: 1, tags: 'chat,vision' }),
    makeModel({ id: 2, tags: 'audio,chat' }),
    makeModel({ id: 3, tags: undefined }),
  ]

  test('returns all models when tag is "all"', () => {
    expect(filterByTag(models, 'all')).toEqual(models)
  })

  test('filters by tag (case-insensitive)', () => {
    const result = filterByTag(models, 'Vision')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  test('excludes models without tags', () => {
    const result = filterByTag(models, 'chat')
    expect(result).toHaveLength(2)
    expect(result.map((m) => m.id)).toEqual([1, 2])
  })

  test('returns empty array when no match', () => {
    expect(filterByTag(models, 'nonexistent')).toEqual([])
  })
})

describe('filterAndSortModels', () => {
  const models = [
    makeModel({
      id: 1,
      model_name: 'gpt-4',
      vendor_name: 'OpenAI',
      enable_groups: ['default'],
      quota_type: 0,
      model_ratio: 5,
      tags: 'chat',
    }),
    makeModel({
      id: 2,
      model_name: 'claude-3',
      vendor_name: 'Anthropic',
      enable_groups: ['premium'],
      quota_type: 0,
      model_ratio: 3,
      tags: 'chat,vision',
    }),
    makeModel({
      id: 3,
      model_name: 'gemini',
      vendor_name: 'Google',
      enable_groups: ['default'],
      quota_type: 1,
      model_ratio: 1,
      model_price: 2,
      tags: 'vision',
    }),
  ]

  test('applies all filters and sorting', () => {
    const result = filterAndSortModels(models, {
      search: '',
      vendor: 'all',
      group: 'all',
      quotaType: 'all',
      endpointType: 'all',
      tag: 'all',
      sortBy: 'name',
    })
    expect(result).toHaveLength(3)
    expect(result[0].model_name).toBe('claude-3')
    expect(result[1].model_name).toBe('gemini')
    expect(result[2].model_name).toBe('gpt-4')
  })

  test('combines search and vendor filter', () => {
    const result = filterAndSortModels(models, {
      search: 'gpt',
      vendor: 'OpenAI',
      group: 'all',
      quotaType: 'all',
      endpointType: 'all',
      tag: 'all',
      sortBy: 'name',
    })
    expect(result).toHaveLength(1)
    expect(result[0].model_name).toBe('gpt-4')
  })

  test('filters by group', () => {
    const result = filterAndSortModels(models, {
      search: '',
      vendor: 'all',
      group: 'premium',
      quotaType: 'all',
      endpointType: 'all',
      tag: 'all',
      sortBy: 'name',
    })
    expect(result).toHaveLength(1)
    expect(result[0].model_name).toBe('claude-3')
  })

  test('filters by tag', () => {
    const result = filterAndSortModels(models, {
      search: '',
      vendor: 'all',
      group: 'all',
      quotaType: 'all',
      endpointType: 'all',
      tag: 'vision',
      sortBy: 'name',
    })
    expect(result).toHaveLength(2)
    expect(result.map((m) => m.model_name)).toEqual(['claude-3', 'gemini'])
  })
})
