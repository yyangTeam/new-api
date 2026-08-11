import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/currency', () => ({
  parseCurrencyDisplayType: (v: string) => v,
}))
vi.mock('@/features/system-settings/general/checkin-settings-section', () => ({
  CheckinSettingsSection: () => 'CheckinSettingsSection',
}))
vi.mock('@/features/system-settings/general/pricing-section', () => ({
  PricingSection: () => 'PricingSection',
}))
vi.mock('@/features/system-settings/general/quota-settings-section', () => ({
  QuotaSettingsSection: () => 'QuotaSettingsSection',
}))
vi.mock('@/features/system-settings/integrations/payment-settings-section', () => ({
  PaymentSettingsSection: () => 'PaymentSettingsSection',
}))
vi.mock('@/features/system-settings/models/ratio-settings-card', () => ({
  RatioSettingsCard: () => 'RatioSettingsCard',
}))

import {
  BILLING_SECTION_IDS,
  BILLING_DEFAULT_SECTION,
  getBillingSectionNavItems,
  getBillingSectionMeta,
} from '@/features/system-settings/billing/section-registry'

describe('billing section-registry', () => {
  it('exports correct section IDs', () => {
    expect(BILLING_SECTION_IDS).toEqual([
      'quota',
      'currency',
      'model-pricing',
      'group-pricing',
      'payment',
      'checkin',
    ])
  })

  it('has quota as default section', () => {
    expect(BILLING_DEFAULT_SECTION).toBe('quota')
  })

  it('generates nav items with path-style URLs', () => {
    const t = (key: string) => key
    const items = getBillingSectionNavItems(t)
    expect(items).toHaveLength(6)
    expect(items[0]).toEqual({
      title: 'Quota Settings',
      url: '/system-settings/billing/quota',
    })
    expect(items[4]).toEqual({
      title: 'Payment Gateway',
      url: '/system-settings/billing/payment',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getBillingSectionMeta('payment')
    expect(meta.titleKey).toBe('Payment Gateway')
  })
})
