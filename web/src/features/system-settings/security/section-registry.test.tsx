import { describe, it, expect, vi } from 'vitest'

vi.mock('../request-limits/rate-limit-section', () => ({
  RateLimitSection: () => 'RateLimitSection',
}))
vi.mock('../request-limits/sensitive-words-section', () => ({
  SensitiveWordsSection: () => 'SensitiveWordsSection',
}))
vi.mock('../request-limits/ssrf-section', () => ({
  SSRFSection: () => 'SSRFSection',
}))
vi.mock('../request-limits/token-limit-section', () => ({
  TokenLimitSection: () => 'TokenLimitSection',
}))

import {
  SECURITY_SECTION_IDS,
  SECURITY_DEFAULT_SECTION,
  getSecuritySectionNavItems,
  getSecuritySectionMeta,
} from './section-registry'

describe('security section-registry', () => {
  it('exports correct section IDs', () => {
    expect(SECURITY_SECTION_IDS).toEqual([
      'rate-limit',
      'sensitive-words',
      'ssrf',
      'token-limits',
    ])
  })

  it('has rate-limit as default section', () => {
    expect(SECURITY_DEFAULT_SECTION).toBe('rate-limit')
  })

  it('generates nav items with path-style URLs', () => {
    const t = (key: string) => key
    const items = getSecuritySectionNavItems(t)
    expect(items).toHaveLength(4)
    expect(items[0]).toEqual({
      title: 'Rate Limiting',
      url: '/system-settings/security/rate-limit',
    })
    expect(items[2]).toEqual({
      title: 'SSRF Protection',
      url: '/system-settings/security/ssrf',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getSecuritySectionMeta('ssrf')
    expect(meta.titleKey).toBe('SSRF Protection')
  })
})
