import {
  isCurrencyDisplayType,
  parseCurrencyDisplayType,
  formatCurrencyFromUSD,
  formatBillingCurrencyFromUSD,
  formatQuotaWithCurrency,
  formatLocalCurrencyAmount,
  getCurrencyLabel,
  getCurrencyDisplay,
  isCurrencyDisplayEnabled,
} from './currency'

vi.mock('@/stores/system-config-store', () => {
  const DEFAULT_CURRENCY_CONFIG = {
    displayInCurrency: true,
    quotaDisplayType: 'USD' as const,
    quotaPerUnit: 500000,
    usdExchangeRate: 1,
    customCurrencySymbol: '¤',
    customCurrencyExchangeRate: 1,
  }

  let currentConfig = { ...DEFAULT_CURRENCY_CONFIG }

  return {
    DEFAULT_CURRENCY_CONFIG,
    useSystemConfigStore: {
      getState: () => ({
        config: {
          systemName: 'Test',
          logo: '',
          currency: currentConfig,
        },
      }),
      __setMockConfig: (overrides: Record<string, unknown>) => {
        currentConfig = { ...DEFAULT_CURRENCY_CONFIG, ...overrides }
      },
      __resetMockConfig: () => {
        currentConfig = { ...DEFAULT_CURRENCY_CONFIG }
      },
    },
  }
})

import { useSystemConfigStore } from '@/stores/system-config-store'

const mockStore = useSystemConfigStore as unknown as {
  getState: () => unknown
  __setMockConfig: (overrides: Record<string, unknown>) => void
  __resetMockConfig: () => void
}

beforeEach(() => {
  mockStore.__resetMockConfig()
})

describe('isCurrencyDisplayType', () => {
  test('returns true for valid display types', () => {
    expect(isCurrencyDisplayType('USD')).toBe(true)
    expect(isCurrencyDisplayType('CNY')).toBe(true)
    expect(isCurrencyDisplayType('TOKENS')).toBe(true)
    expect(isCurrencyDisplayType('CUSTOM')).toBe(true)
  })

  test('returns false for invalid values', () => {
    expect(isCurrencyDisplayType('EUR')).toBe(false)
    expect(isCurrencyDisplayType('usd')).toBe(false)
    expect(isCurrencyDisplayType('')).toBe(false)
    expect(isCurrencyDisplayType(null)).toBe(false)
    expect(isCurrencyDisplayType(undefined)).toBe(false)
    expect(isCurrencyDisplayType(42)).toBe(false)
    expect(isCurrencyDisplayType({})).toBe(false)
  })
})

describe('parseCurrencyDisplayType', () => {
  test('returns valid display type as-is', () => {
    expect(parseCurrencyDisplayType('USD')).toBe('USD')
    expect(parseCurrencyDisplayType('CNY')).toBe('CNY')
    expect(parseCurrencyDisplayType('TOKENS')).toBe('TOKENS')
    expect(parseCurrencyDisplayType('CUSTOM')).toBe('CUSTOM')
  })

  test('returns fallback for invalid value', () => {
    expect(parseCurrencyDisplayType('invalid')).toBe('USD')
    expect(parseCurrencyDisplayType(null)).toBe('USD')
    expect(parseCurrencyDisplayType(undefined)).toBe('USD')
  })

  test('uses custom fallback when provided', () => {
    expect(parseCurrencyDisplayType('invalid', 'CNY')).toBe('CNY')
    expect(parseCurrencyDisplayType(null, 'TOKENS')).toBe('TOKENS')
  })
})

describe('formatCurrencyFromUSD', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatCurrencyFromUSD(null)).toBe('-')
    expect(formatCurrencyFromUSD(undefined)).toBe('-')
    expect(formatCurrencyFromUSD(NaN)).toBe('-')
  })

  test('formats USD amounts with dollar sign by default', () => {
    const result = formatCurrencyFromUSD(10)
    expect(result).toContain('10')
    expect(result).toContain('$')
  })

  test('formats zero amount', () => {
    const result = formatCurrencyFromUSD(0)
    expect(result).toContain('0')
  })

  test('formats CNY amounts with exchange rate', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7,
    })
    const result = formatCurrencyFromUSD(10)
    expect(result).toContain('70')
  })

  test('formats TOKENS display type', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'TOKENS',
      quotaPerUnit: 500000,
    })
    const result = formatCurrencyFromUSD(10)
    expect(result).toContain('5000k')
  })

  test('formats CUSTOM currency with symbol and rate', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'CUSTOM',
      customCurrencySymbol: '€',
      customCurrencyExchangeRate: 0.9,
    })
    const result = formatCurrencyFromUSD(10)
    expect(result).toContain('€')
    expect(result).toContain('9')
  })
})

describe('formatBillingCurrencyFromUSD', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatBillingCurrencyFromUSD(null)).toBe('-')
    expect(formatBillingCurrencyFromUSD(undefined)).toBe('-')
    expect(formatBillingCurrencyFromUSD(NaN)).toBe('-')
  })

  test('never shows tokens, falls back to USD', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'TOKENS',
      quotaPerUnit: 500000,
    })
    const result = formatBillingCurrencyFromUSD(10)
    expect(result).toContain('$')
    expect(result).toContain('10')
  })

  test('formats CNY billing amounts', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7,
    })
    const result = formatBillingCurrencyFromUSD(10)
    expect(result).toContain('70')
  })
})

describe('formatQuotaWithCurrency', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatQuotaWithCurrency(null)).toBe('-')
    expect(formatQuotaWithCurrency(undefined)).toBe('-')
    expect(formatQuotaWithCurrency(NaN)).toBe('-')
  })

  test('converts tokens to USD and formats', () => {
    const result = formatQuotaWithCurrency(5000000)
    expect(result).toContain('$')
    expect(result).toContain('10')
  })

  test('formats zero quota', () => {
    const result = formatQuotaWithCurrency(0)
    expect(result).toContain('0')
  })
})

describe('formatLocalCurrencyAmount', () => {
  test('returns dash for null, undefined, and NaN', () => {
    expect(formatLocalCurrencyAmount(null)).toBe('-')
    expect(formatLocalCurrencyAmount(undefined)).toBe('-')
    expect(formatLocalCurrencyAmount(NaN)).toBe('-')
  })

  test('formats amount with currency symbol without applying exchange rate', () => {
    const result = formatLocalCurrencyAmount(50)
    expect(result).toContain('$')
    expect(result).toContain('50')
  })

  test('uses billing meta so tokens config falls back to USD', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'TOKENS',
    })
    const result = formatLocalCurrencyAmount(100)
    expect(result).toContain('$')
    expect(result).toContain('100')
  })
})

describe('getCurrencyLabel', () => {
  test('returns USD by default', () => {
    expect(getCurrencyLabel()).toBe('USD')
  })

  test('returns CNY when configured', () => {
    mockStore.__setMockConfig({ quotaDisplayType: 'CNY' })
    expect(getCurrencyLabel()).toBe('CNY')
  })

  test('returns Tokens when configured', () => {
    mockStore.__setMockConfig({ quotaDisplayType: 'TOKENS' })
    expect(getCurrencyLabel()).toBe('Tokens')
  })

  test('returns custom symbol when configured', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'CUSTOM',
      customCurrencySymbol: '€',
      customCurrencyExchangeRate: 0.9,
    })
    expect(getCurrencyLabel()).toBe('€')
  })
})

describe('getCurrencyDisplay', () => {
  test('returns config and meta for USD', () => {
    const { config, meta } = getCurrencyDisplay()
    expect(config.quotaDisplayType).toBe('USD')
    expect(meta.kind).toBe('currency')
    if (meta.kind === 'currency') {
      expect(meta.symbol).toBe('$')
      expect(meta.exchangeRate).toBe(1)
    }
  })

  test('returns config and meta for CNY', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'CNY',
      usdExchangeRate: 7.2,
    })
    const { meta } = getCurrencyDisplay()
    expect(meta.kind).toBe('currency')
    if (meta.kind === 'currency') {
      expect(meta.symbol).toBe('¥')
      expect(meta.exchangeRate).toBe(7.2)
    }
  })

  test('returns tokens meta', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'TOKENS',
      quotaPerUnit: 1000000,
    })
    const { meta } = getCurrencyDisplay()
    expect(meta.kind).toBe('tokens')
    if (meta.kind === 'tokens') {
      expect(meta.quotaPerUnit).toBe(1000000)
    }
  })

  test('returns custom meta', () => {
    mockStore.__setMockConfig({
      quotaDisplayType: 'CUSTOM',
      customCurrencySymbol: '₿',
      customCurrencyExchangeRate: 0.00001,
    })
    const { meta } = getCurrencyDisplay()
    expect(meta.kind).toBe('custom')
    if (meta.kind === 'custom') {
      expect(meta.symbol).toBe('₿')
      expect(meta.exchangeRate).toBe(0.00001)
    }
  })
})

describe('isCurrencyDisplayEnabled', () => {
  test('returns true for USD', () => {
    expect(isCurrencyDisplayEnabled()).toBe(true)
  })

  test('returns true for CNY', () => {
    mockStore.__setMockConfig({ quotaDisplayType: 'CNY' })
    expect(isCurrencyDisplayEnabled()).toBe(true)
  })

  test('returns false for TOKENS', () => {
    mockStore.__setMockConfig({ quotaDisplayType: 'TOKENS' })
    expect(isCurrencyDisplayEnabled()).toBe(false)
  })

  test('returns true for CUSTOM', () => {
    mockStore.__setMockConfig({ quotaDisplayType: 'CUSTOM' })
    expect(isCurrencyDisplayEnabled()).toBe(true)
  })
})
