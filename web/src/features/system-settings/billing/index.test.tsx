import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('../components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    ;(globalThis as any).__lastBillingPageProps = props
    return null
  },
}))
vi.mock('./section-registry.tsx', () => ({
  BILLING_DEFAULT_SECTION: 'quota',
  getBillingSectionContent: vi.fn(),
  getBillingSectionMeta: vi.fn(),
}))

import { BillingSettings } from './index'

describe('BillingSettings page component', () => {
  it('renders SettingsPage with correct route path', () => {
    render(React.createElement(BillingSettings))
    const props = (globalThis as any).__lastBillingPageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/billing/$section'
    )
    expect(props.defaultSection).toBe('quota')
  })

  it('provides default billing settings with expected keys', () => {
    render(React.createElement(BillingSettings))
    const props = (globalThis as any).__lastBillingPageProps
    const defaults = props.defaultSettings
    expect(defaults.QuotaForNewUser).toBe(0)
    expect(defaults.QuotaPerUnit).toBe(500000)
    expect(defaults.USDExchangeRate).toBe(7)
    expect(defaults.MinTopUp).toBe(1)
    expect(defaults.StripePromotionCodesEnabled).toBe(false)
    expect(defaults['checkin_setting.enabled']).toBe(false)
    expect(defaults['checkin_setting.min_quota']).toBe(1000)
  })
})
