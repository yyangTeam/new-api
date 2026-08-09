import { describe, it, expect } from 'vitest'

import { VCHART_OPTION } from './vchart'

describe('vchart', () => {
  it('exports VCHART_OPTION with desktop-browser mode', () => {
    expect(VCHART_OPTION.mode).toBe('desktop-browser')
  })

  it('VCHART_OPTION is a const object', () => {
    // "as const" gives a readonly type at compile time but does not freeze at runtime
    expect(VCHART_OPTION).toEqual({ mode: 'desktop-browser' })
  })
})
