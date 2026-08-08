import { DEFAULT_CURRENCY_CONFIG } from '@/stores/system-config-store'

import { mapStatusDataToConfig } from './use-system-config'

describe('mapStatusDataToConfig', () => {
  test('returns empty object for undefined data', () => {
    expect(mapStatusDataToConfig(undefined)).toEqual({})
  })

  test('maps all fields from complete data', () => {
    const data = {
      system_name: 'My API',
      logo: '/custom-logo.png',
      footer_html: '<p>Footer</p>',
      demo_site_enabled: true,
      display_token_stat_enabled: true,
      display_in_currency: true,
      quota_display_type: 'USD' as const,
      quota_per_unit: 100000,
      usd_exchange_rate: 7.2,
      custom_currency_symbol: 'CNY',
      custom_currency_exchange_rate: 7.2,
      model_mapped_display_mode: 1,
    }

    const result = mapStatusDataToConfig(data)
    expect(result.systemName).toBe('My API')
    expect(result.logo).toBe('/custom-logo.png')
    expect(result.footerHtml).toBe('<p>Footer</p>')
    expect(result.demoSiteEnabled).toBe(true)
    expect(result.displayTokenStatEnabled).toBe(true)
    expect(result.modelMappedDisplayMode).toBe(1)
    expect(result.currency).toEqual({
      displayInCurrency: true,
      quotaDisplayType: 'USD',
      quotaPerUnit: 100000,
      usdExchangeRate: 7.2,
      customCurrencySymbol: 'CNY',
      customCurrencyExchangeRate: 7.2,
    })
  })

  test('uses defaults for missing system_name and logo', () => {
    const result = mapStatusDataToConfig({})
    expect(result.systemName).toBe('New API')
    expect(result.logo).toBe('/logo.png')
  })

  test('uses empty string system_name as default', () => {
    const result = mapStatusDataToConfig({ system_name: '' })
    expect(result.systemName).toBe('New API')
  })

  test('uses default currency config for missing currency fields', () => {
    const result = mapStatusDataToConfig({})
    expect(result.currency).toEqual(DEFAULT_CURRENCY_CONFIG)
  })

  test('handles numeric string values for quota_per_unit', () => {
    const result = mapStatusDataToConfig({
      quota_per_unit: '250000' as unknown as number,
    })
    expect(result.currency!.quotaPerUnit).toBe(250000)
  })

  test('falls back for NaN quota_per_unit', () => {
    const result = mapStatusDataToConfig({
      quota_per_unit: 'invalid' as unknown as number,
    })
    expect(result.currency!.quotaPerUnit).toBe(
      DEFAULT_CURRENCY_CONFIG.quotaPerUnit
    )
  })

  test('trims whitespace-only custom_currency_symbol to default', () => {
    const result = mapStatusDataToConfig({
      custom_currency_symbol: '   ',
    })
    expect(result.currency!.customCurrencySymbol).toBe(
      DEFAULT_CURRENCY_CONFIG.customCurrencySymbol
    )
  })

  test('defaults model_mapped_display_mode to 0 when absent', () => {
    const result = mapStatusDataToConfig({})
    expect(result.modelMappedDisplayMode).toBe(0)
  })
})
