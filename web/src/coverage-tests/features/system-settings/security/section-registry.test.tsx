import { describe, it, expect, vi } from 'vitest'
import type { TFunction } from 'i18next'

vi.mock('@/features/system-settings/request-limits/rate-limit-section', () => ({
  RateLimitSection: () => 'RateLimitSection',
}))
vi.mock('@/features/system-settings/request-limits/ssrf-section', () => ({
  SSRFSection: () => 'SSRFSection',
}))
vi.mock('@/features/system-settings/request-limits/token-limit-section', () => ({
  TokenLimitSection: () => 'TokenLimitSection',
}))

import {
  SECURITY_SECTION_IDS,
  SECURITY_DEFAULT_SECTION,
  getSecuritySectionNavItems,
  getSecuritySectionMeta,
} from '@/features/system-settings/security/section-registry'

// After the upstream request-policies refactor, sensitive-words moved out of
// the security registry. The security registry now exposes 3 sections.
describe('security section-registry', () => {
  it('exports correct section IDs', () => {
    expect(SECURITY_SECTION_IDS).toEqual(['rate-limit', 'ssrf', 'token-limits'])
  })

  it('has rate-limit as default section', () => {
    expect(SECURITY_DEFAULT_SECTION).toBe('rate-limit')
  })

  it('generates nav items with path-style URLs', () => {
    const t = ((key: string) => key) as unknown as TFunction
    const items = getSecuritySectionNavItems(t)
    expect(items).toHaveLength(3)
    expect(items[0]).toEqual({
      title: 'Rate Limiting',
      url: '/system-settings/security/rate-limit',
    })
    expect(items[1]).toEqual({
      title: 'SSRF Protection',
      url: '/system-settings/security/ssrf',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getSecuritySectionMeta('ssrf')
    expect(meta.titleKey).toBe('SSRF Protection')
  })
})
