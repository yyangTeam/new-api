import { describe, it, expect } from 'vitest'

// The hooks index re-exports; verifying the module loads and exports are present.
import * as hooksIndex from './index'

describe('hooks/index', () => {
  it('exports useSystemConfig', () => {
    expect(hooksIndex.useSystemConfig).toBeDefined()
    expect(typeof hooksIndex.useSystemConfig).toBe('function')
  })

  it('exports useTopNavLinks', () => {
    expect(hooksIndex.useTopNavLinks).toBeDefined()
    expect(typeof hooksIndex.useTopNavLinks).toBe('function')
  })

  it('exports useNotifications', () => {
    expect(hooksIndex.useNotifications).toBeDefined()
    expect(typeof hooksIndex.useNotifications).toBe('function')
  })

  it('exports useDebounce', () => {
    expect(hooksIndex.useDebounce).toBeDefined()
    expect(typeof hooksIndex.useDebounce).toBe('function')
  })

  it('exports useMediaQuery', () => {
    expect(hooksIndex.useMediaQuery).toBeDefined()
    expect(typeof hooksIndex.useMediaQuery).toBe('function')
  })
})
