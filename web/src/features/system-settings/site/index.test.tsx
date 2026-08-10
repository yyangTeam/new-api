import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('../components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    ;(globalThis as any).__lastSitePageProps = props
    return null
  },
}))
vi.mock('./section-registry.tsx', () => ({
  SITE_DEFAULT_SECTION: 'system-info',
  getSiteSectionContent: vi.fn(),
  getSiteSectionMeta: vi.fn(),
}))

import { SiteSettings } from './index'

describe('SiteSettings page component', () => {
  it('renders SettingsPage with correct route path', () => {
    render(React.createElement(SiteSettings))
    const props = (globalThis as any).__lastSitePageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/site/$section'
    )
    expect(props.defaultSection).toBe('system-info')
  })

  it('provides default site settings', () => {
    render(React.createElement(SiteSettings))
    const props = (globalThis as any).__lastSitePageProps
    const defaults = props.defaultSettings
    expect(defaults.SystemName).toBe('New API')
    expect(defaults.Notice).toBe('')
    expect(defaults.Logo).toBe('')
    expect(defaults.HeaderNavModules).toBe('')
    expect(defaults.SidebarModulesAdmin).toBe('')
    expect(defaults['legal.user_agreement']).toBe('')
    expect(defaults['legal.privacy_policy']).toBe('')
  })
})
