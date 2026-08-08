import {
  parseModelsString,
  formatModelsArray,
  normalizeModelName,
  extractMappingSourceModels,
  extractRedirectModels,
  hasModelConfigChanged,
  findMissingModelsInMapping,
  validateModelMappingJson,
  findExposedTargetModels,
  categorizeModelsWithRedirect,
} from './model-mapping-validation'

describe('parseModelsString', () => {
  test('returns empty array for empty string', () => {
    expect(parseModelsString('')).toEqual([])
  })

  test('parses comma-separated models', () => {
    expect(parseModelsString('gpt-4,gpt-3.5')).toEqual(['gpt-4', 'gpt-3.5'])
  })

  test('trims whitespace and filters empty', () => {
    expect(parseModelsString(' gpt-4 , , gpt-3.5 ')).toEqual(['gpt-4', 'gpt-3.5'])
  })
})

describe('formatModelsArray', () => {
  test('joins models and deduplicates', () => {
    expect(formatModelsArray(['gpt-4', 'gpt-3.5', 'gpt-4'])).toBe('gpt-4,gpt-3.5')
  })

  test('returns empty string for empty array', () => {
    expect(formatModelsArray([])).toBe('')
  })
})

describe('normalizeModelName', () => {
  test('trims whitespace', () => {
    expect(normalizeModelName('  gpt-4  ')).toBe('gpt-4')
  })

  test('returns empty string for non-string input', () => {
    expect(normalizeModelName(123 as unknown as string)).toBe('')
    expect(normalizeModelName(null as unknown as string)).toBe('')
  })
})

describe('extractMappingSourceModels', () => {
  test('returns empty array for empty input', () => {
    expect(extractMappingSourceModels('')).toEqual([])
    expect(extractMappingSourceModels('  ')).toEqual([])
  })

  test('extracts keys from valid mapping JSON', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo', 'gpt-3.5': 'gpt-3.5-turbo' })
    expect(extractMappingSourceModels(mapping)).toEqual(['gpt-4', 'gpt-3.5'])
  })

  test('deduplicates keys', () => {
    const mapping = JSON.stringify({ ' gpt-4 ': 'a' })
    const result = extractMappingSourceModels(mapping)
    expect(result).toEqual(['gpt-4'])
  })

  test('returns empty array for invalid JSON', () => {
    expect(extractMappingSourceModels('{bad}')).toEqual([])
  })

  test('returns empty array for array JSON', () => {
    expect(extractMappingSourceModels('["a","b"]')).toEqual([])
  })

  test('returns empty array for non-string input', () => {
    expect(extractMappingSourceModels(123 as unknown as string)).toEqual([])
  })
})

describe('extractRedirectModels', () => {
  test('returns empty array for empty input', () => {
    expect(extractRedirectModels('')).toEqual([])
  })

  test('extracts string values from mapping', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo', 'gpt-3.5': 'gpt-3.5-16k' })
    expect(extractRedirectModels(mapping)).toEqual(['gpt-4-turbo', 'gpt-3.5-16k'])
  })

  test('deduplicates values', () => {
    const mapping = JSON.stringify({ a: 'target', b: 'target' })
    expect(extractRedirectModels(mapping)).toEqual(['target'])
  })

  test('filters non-string values', () => {
    const mapping = JSON.stringify({ a: 'valid', b: 123 })
    expect(extractRedirectModels(mapping)).toEqual(['valid'])
  })

  test('returns empty array for invalid JSON', () => {
    expect(extractRedirectModels('{bad}')).toEqual([])
  })

  test('returns empty array for array JSON', () => {
    expect(extractRedirectModels('["a"]')).toEqual([])
  })
})

describe('hasModelConfigChanged', () => {
  test('returns true for new channel (empty initial)', () => {
    expect(hasModelConfigChanged(['gpt-4'], '', [], '')).toBe(true)
  })

  test('returns false when nothing changed', () => {
    expect(hasModelConfigChanged(['gpt-4'], '{}', ['gpt-4'], '{}')).toBe(false)
  })

  test('returns true when models array length changed', () => {
    expect(hasModelConfigChanged(['gpt-4', 'gpt-3.5'], '{}', ['gpt-4'], '{}')).toBe(true)
  })

  test('returns true when model names changed', () => {
    expect(hasModelConfigChanged(['gpt-4-turbo'], '{}', ['gpt-4'], '{}')).toBe(true)
  })

  test('returns true when model_mapping changed', () => {
    expect(hasModelConfigChanged(['gpt-4'], '{"a":"b"}', ['gpt-4'], '{}')).toBe(true)
  })

  test('treats whitespace differences in mapping as no change', () => {
    expect(hasModelConfigChanged(['gpt-4'], '  {}  ', ['gpt-4'], '{}')).toBe(false)
  })
})

describe('findMissingModelsInMapping', () => {
  test('returns empty for empty mapping', () => {
    expect(findMissingModelsInMapping('', ['gpt-4'])).toEqual([])
  })

  test('finds models in mapping not in current models', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo', 'gpt-3.5': 'gpt-3.5-turbo' })
    expect(findMissingModelsInMapping(mapping, ['gpt-4'])).toEqual(['gpt-3.5'])
  })

  test('returns empty when all mapping keys are in models', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo' })
    expect(findMissingModelsInMapping(mapping, ['gpt-4'])).toEqual([])
  })

  test('returns empty for invalid JSON', () => {
    expect(findMissingModelsInMapping('{bad}', ['gpt-4'])).toEqual([])
  })

  test('returns empty for array JSON', () => {
    expect(findMissingModelsInMapping('["a"]', ['a'])).toEqual([])
  })
})

describe('validateModelMappingJson', () => {
  test('returns valid for empty input', () => {
    expect(validateModelMappingJson('')).toEqual({ valid: true })
    expect(validateModelMappingJson('  ')).toEqual({ valid: true })
  })

  test('returns valid for correct mapping', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo' })
    expect(validateModelMappingJson(mapping)).toEqual({ valid: true })
  })

  test('returns invalid for non-object JSON', () => {
    expect(validateModelMappingJson('["array"]')).toEqual({
      valid: false,
      error: 'Model mapping must be a valid JSON object',
    })
  })

  test('returns invalid for non-string values', () => {
    const mapping = JSON.stringify({ 'gpt-4': 123 })
    expect(validateModelMappingJson(mapping)).toEqual({
      valid: false,
      error: 'Model mapping values must be strings',
    })
  })

  test('returns invalid for invalid JSON', () => {
    expect(validateModelMappingJson('{bad}')).toEqual({
      valid: false,
      error: 'Model mapping must be valid JSON format',
    })
  })

  test('returns invalid for null JSON', () => {
    expect(validateModelMappingJson('null')).toEqual({
      valid: false,
      error: 'Model mapping must be a valid JSON object',
    })
  })
})

describe('findExposedTargetModels', () => {
  test('returns empty when no redirect models', () => {
    expect(findExposedTargetModels('', ['gpt-4'])).toEqual([])
  })

  test('finds redirect targets that are also in models list', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo' })
    expect(findExposedTargetModels(mapping, ['gpt-4', 'gpt-4-turbo'])).toEqual(['gpt-4-turbo'])
  })

  test('returns empty when no overlap', () => {
    const mapping = JSON.stringify({ 'gpt-4': 'gpt-4-turbo' })
    expect(findExposedTargetModels(mapping, ['gpt-4'])).toEqual([])
  })
})

describe('categorizeModelsWithRedirect', () => {
  test('creates correct sets from models and redirect models', () => {
    const result = categorizeModelsWithRedirect(['gpt-4', 'gpt-3.5'], ['gpt-4-turbo', 'gpt-3.5'])
    expect(result.normalizedCurrentModels).toEqual(new Set(['gpt-4', 'gpt-3.5']))
    expect(result.normalizedRedirectModels).toEqual(new Set(['gpt-4-turbo', 'gpt-3.5']))
    expect(result.classificationSet).toEqual(new Set(['gpt-4', 'gpt-3.5', 'gpt-4-turbo']))
    expect(result.redirectOnlySet).toEqual(new Set(['gpt-4-turbo']))
  })

  test('handles empty inputs', () => {
    const result = categorizeModelsWithRedirect([], [])
    expect(result.normalizedCurrentModels.size).toBe(0)
    expect(result.normalizedRedirectModels.size).toBe(0)
    expect(result.classificationSet.size).toBe(0)
    expect(result.redirectOnlySet.size).toBe(0)
  })

  test('filters empty model names', () => {
    const result = categorizeModelsWithRedirect(['', '  ', 'gpt-4'], ['', 'target'])
    expect(result.normalizedCurrentModels).toEqual(new Set(['gpt-4']))
    expect(result.normalizedRedirectModels).toEqual(new Set(['target']))
  })
})
