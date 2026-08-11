import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('@/features/system-settings/components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    ;(globalThis as any).__lastSecPageProps = props
    return null
  },
}))
vi.mock('@/features/system-settings/security/section-registry', () => ({
  SECURITY_DEFAULT_SECTION: 'rate-limit',
  getSecuritySectionContent: vi.fn(),
  getSecuritySectionMeta: vi.fn(),
}))

import { SecuritySettings } from '@/features/system-settings/security/index'

describe('SecuritySettings page component', () => {
  it('renders SettingsPage with correct route path', () => {
    render(React.createElement(SecuritySettings))
    const props = (globalThis as any).__lastSecPageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/security/$section'
    )
    expect(props.defaultSection).toBe('rate-limit')
  })

  it('provides default security settings', () => {
    render(React.createElement(SecuritySettings))
    const props = (globalThis as any).__lastSecPageProps
    const defaults = props.defaultSettings
    expect(defaults.ModelRequestRateLimitEnabled).toBe(false)
    expect(defaults.ModelRequestRateLimitSuccessCount).toBe(1000)
    expect(defaults.CheckSensitiveEnabled).toBe(false)
    expect(defaults['fetch_setting.enable_ssrf_protection']).toBe(true)
    expect(defaults['fetch_setting.allow_private_ip']).toBe(false)
    expect(defaults['token_setting.max_user_tokens']).toBe(1000)
  })
})
