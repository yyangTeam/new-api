import {
  isObjectRecord,
  isArray,
  isStringArray,
  isNumberArray,
  isObjectArray,
  createObjectValidator,
  createArrayValidator,
} from './json-validators'

describe('isObjectRecord', () => {
  test('returns true for plain objects', () => {
    expect(isObjectRecord({})).toBe(true)
    expect(isObjectRecord({ a: 1, b: 'two' })).toBe(true)
  })

  test('returns false for arrays', () => {
    expect(isObjectRecord([])).toBe(false)
    expect(isObjectRecord([1, 2, 3])).toBe(false)
  })

  test('returns false for null', () => {
    expect(isObjectRecord(null)).toBe(false)
  })

  test('returns false for primitives', () => {
    expect(isObjectRecord(42)).toBe(false)
    expect(isObjectRecord('string')).toBe(false)
    expect(isObjectRecord(true)).toBe(false)
    expect(isObjectRecord(undefined)).toBe(false)
  })

  test('returns true for objects with nested values', () => {
    expect(isObjectRecord({ nested: { deep: true } })).toBe(true)
  })
})

describe('isArray', () => {
  test('returns true for arrays', () => {
    expect(isArray([])).toBe(true)
    expect(isArray([1, 'two', null])).toBe(true)
  })

  test('returns false for non-arrays', () => {
    expect(isArray({})).toBe(false)
    expect(isArray('string')).toBe(false)
    expect(isArray(42)).toBe(false)
    expect(isArray(null)).toBe(false)
    expect(isArray(undefined)).toBe(false)
  })
})

describe('isStringArray', () => {
  test('returns true for string arrays', () => {
    expect(isStringArray(['a', 'b', 'c'])).toBe(true)
  })

  test('returns true for empty arrays', () => {
    expect(isStringArray([])).toBe(true)
  })

  test('returns false for mixed arrays', () => {
    expect(isStringArray(['a', 1, 'c'])).toBe(false)
  })

  test('returns false for number arrays', () => {
    expect(isStringArray([1, 2, 3])).toBe(false)
  })

  test('returns false for non-arrays', () => {
    expect(isStringArray('not array')).toBe(false)
    expect(isStringArray(null)).toBe(false)
    expect(isStringArray({})).toBe(false)
  })
})

describe('isNumberArray', () => {
  test('returns true for number arrays', () => {
    expect(isNumberArray([1, 2, 3])).toBe(true)
    expect(isNumberArray([0, -1, 3.14])).toBe(true)
  })

  test('returns true for empty arrays', () => {
    expect(isNumberArray([])).toBe(true)
  })

  test('returns false for mixed arrays', () => {
    expect(isNumberArray([1, 'two', 3])).toBe(false)
  })

  test('returns false for string arrays', () => {
    expect(isNumberArray(['1', '2'])).toBe(false)
  })

  test('returns false for non-arrays', () => {
    expect(isNumberArray(42)).toBe(false)
    expect(isNumberArray(null)).toBe(false)
    expect(isNumberArray({})).toBe(false)
  })
})

describe('isObjectArray', () => {
  test('returns true for arrays of objects', () => {
    expect(isObjectArray([{ a: 1 }, { b: 2 }])).toBe(true)
  })

  test('returns true for empty arrays', () => {
    expect(isObjectArray([])).toBe(true)
  })

  test('returns false when array contains non-objects', () => {
    expect(isObjectArray([{ a: 1 }, 'string'])).toBe(false)
  })

  test('returns false when array contains null', () => {
    expect(isObjectArray([{ a: 1 }, null])).toBe(false)
  })

  test('returns false when array contains arrays', () => {
    expect(isObjectArray([{ a: 1 }, [1, 2]])).toBe(false)
  })

  test('returns false for non-arrays', () => {
    expect(isObjectArray({})).toBe(false)
    expect(isObjectArray(null)).toBe(false)
  })
})

describe('createObjectValidator', () => {
  test('creates validator that checks required keys exist', () => {
    const validator = createObjectValidator<{ name: string; age: number }>(['name', 'age'])
    expect(validator({ name: 'John', age: 30 })).toBe(true)
  })

  test('passes with extra keys present', () => {
    const validator = createObjectValidator<{ id: number }>(['id'])
    expect(validator({ id: 1, extra: 'data' })).toBe(true)
  })

  test('fails when required key is missing', () => {
    const validator = createObjectValidator<{ name: string; age: number }>(['name', 'age'])
    expect(validator({ name: 'John' })).toBe(false)
  })

  test('fails for non-objects', () => {
    const validator = createObjectValidator<{ id: number }>(['id'])
    expect(validator(null)).toBe(false)
    expect(validator([])).toBe(false)
    expect(validator('string')).toBe(false)
    expect(validator(42)).toBe(false)
  })

  test('passes with empty required keys', () => {
    const validator = createObjectValidator<Record<string, unknown>>([])
    expect(validator({})).toBe(true)
    expect(validator({ any: 'thing' })).toBe(true)
  })

  test('handles keys with undefined values as present', () => {
    const validator = createObjectValidator<{ key: string }>(['key'])
    expect(validator({ key: undefined })).toBe(true)
  })
})

describe('createArrayValidator', () => {
  test('creates validator that checks all items', () => {
    const isString = (item: unknown): item is string => typeof item === 'string'
    const validator = createArrayValidator(isString)
    expect(validator(['a', 'b', 'c'])).toBe(true)
  })

  test('passes for empty arrays', () => {
    const isString = (item: unknown): item is string => typeof item === 'string'
    const validator = createArrayValidator(isString)
    expect(validator([])).toBe(true)
  })

  test('fails when any item fails validation', () => {
    const isString = (item: unknown): item is string => typeof item === 'string'
    const validator = createArrayValidator(isString)
    expect(validator(['a', 42, 'c'])).toBe(false)
  })

  test('fails for non-arrays', () => {
    const isString = (item: unknown): item is string => typeof item === 'string'
    const validator = createArrayValidator(isString)
    expect(validator({})).toBe(false)
    expect(validator('string')).toBe(false)
    expect(validator(null)).toBe(false)
  })

  test('works with object item validators', () => {
    const hasId = (item: unknown): item is { id: number } =>
      typeof item === 'object' && item !== null && 'id' in item
    const validator = createArrayValidator(hasId)
    expect(validator([{ id: 1 }, { id: 2 }])).toBe(true)
    expect(validator([{ id: 1 }, { name: 'no-id' }])).toBe(false)
  })
})
