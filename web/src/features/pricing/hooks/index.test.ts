import { describe, test, expect } from 'vitest'

import { useFilters, usePricingData } from './index'

describe('hooks/index exports', () => {
  test('exports useFilters', () => {
    expect(useFilters).toBeDefined()
    expect(typeof useFilters).toBe('function')
  })

  test('exports usePricingData', () => {
    expect(usePricingData).toBeDefined()
    expect(typeof usePricingData).toBe('function')
  })
})
