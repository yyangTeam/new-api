import { describe, it, expect, vi } from 'vitest'

vi.mock('./basic-auth-section', () => ({
  BasicAuthSection: () => 'BasicAuthSection',
}))
vi.mock('./bot-protection-section', () => ({
  BotProtectionSection: () => 'BotProtectionSection',
}))
vi.mock('./custom-oauth/custom-oauth-section', () => ({
  CustomOAuthSection: () => 'CustomOAuthSection',
}))
vi.mock('./oauth-section', () => ({
  OAuthSection: () => 'OAuthSection',
}))
vi.mock('./passkey-section', () => ({
  PasskeySection: () => 'PasskeySection',
}))

import {
  AUTH_SECTION_IDS,
  AUTH_DEFAULT_SECTION,
  getAuthSectionNavItems,
  getAuthSectionMeta,
} from './section-registry'

describe('auth section-registry', () => {
  it('exports correct section IDs', () => {
    expect(AUTH_SECTION_IDS).toEqual([
      'basic-auth',
      'oauth',
      'passkey',
      'bot-protection',
      'custom-oauth',
    ])
  })

  it('has basic-auth as default section', () => {
    expect(AUTH_DEFAULT_SECTION).toBe('basic-auth')
  })

  it('generates nav items with path-style URLs', () => {
    const t = (key: string) => key
    const items = getAuthSectionNavItems(t)
    expect(items).toHaveLength(5)
    expect(items[0]).toEqual({
      title: 'Basic Authentication',
      url: '/system-settings/auth/basic-auth',
    })
    expect(items[1]).toEqual({
      title: 'OAuth Integrations',
      url: '/system-settings/auth/oauth',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getAuthSectionMeta('passkey')
    expect(meta.titleKey).toBe('Passkey Authentication')
  })

  it('returns first section for unknown ID', () => {
    const meta = getAuthSectionMeta('unknown' as 'basic-auth')
    expect(meta.id).toBe('basic-auth')
  })
})
