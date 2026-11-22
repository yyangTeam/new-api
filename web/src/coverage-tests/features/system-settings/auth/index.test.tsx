import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('@/features/system-settings/components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    ;(globalThis as any).__lastAuthPageProps = props
    return null
  },
}))
vi.mock('@/features/system-settings/auth/section-registry', () => ({
  AUTH_DEFAULT_SECTION: 'basic-auth',
  getAuthSectionContent: vi.fn(),
  getAuthSectionMeta: vi.fn(),
}))

import { AuthSettings } from '@/features/system-settings/auth/index'

describe('AuthSettings page component', () => {
  it('renders SettingsPage with correct route path', () => {
    render(React.createElement(AuthSettings))
    const props = (globalThis as any).__lastAuthPageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/auth/$section'
    )
    expect(props.defaultSection).toBe('basic-auth')
  })

  it('provides default auth settings with expected keys', () => {
    render(React.createElement(AuthSettings))
    const props = (globalThis as any).__lastAuthPageProps
    const defaults = props.defaultSettings
    expect(defaults.PasswordLoginEnabled).toBe(true)
    expect(defaults.RegisterEnabled).toBe(true)
    expect(defaults.GitHubOAuthEnabled).toBe(false)
    expect(defaults['passkey.enabled']).toBe(false)
    expect(defaults['passkey.user_verification']).toBe('preferred')
    expect(defaults.TurnstileCheckEnabled).toBe(false)
  })
})
