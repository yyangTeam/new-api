import { describe, test, expect } from 'vitest'

import {
  filterAndSortModels,
  extractAllTags,
} from './index'

describe('pricing/lib/index exports', () => {
  test('exports filterAndSortModels', () => {
    expect(filterAndSortModels).toBeDefined()
    expect(typeof filterAndSortModels).toBe('function')
  })

  test('exports extractAllTags', () => {
    expect(extractAllTags).toBeDefined()
    expect(typeof extractAllTags).toBe('function')
  })
})
