import { describe, it, expect } from 'vitest'

import {
  DEFAULT_SYSTEM_NAME,
  DEFAULT_LOGO,
  STORAGE_KEYS,
} from './constants'

describe('constants', () => {
  it('DEFAULT_SYSTEM_NAME is "New API"', () => {
    expect(DEFAULT_SYSTEM_NAME).toBe('New API')
  })

  it('DEFAULT_LOGO is "/logo.png"', () => {
    expect(DEFAULT_LOGO).toBe('/logo.png')
  })

  it('STORAGE_KEYS contains expected keys', () => {
    expect(STORAGE_KEYS.SYSTEM_NAME).toBe('system_name')
    expect(STORAGE_KEYS.LOGO).toBe('logo')
    expect(STORAGE_KEYS.FOOTER_HTML).toBe('footer_html')
  })
})
