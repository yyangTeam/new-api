import { describe, test, expect } from 'vitest'

import {
  filterAndSortModels,
  extractAllTags,
} from '@/features/pricing/lib/index'

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
