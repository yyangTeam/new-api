import { getStatusConfig, getPaymentMethodName, formatTimestamp } from './billing'

describe('getStatusConfig', () => {
  test('returns success config', () => {
    const config = getStatusConfig('success')
    expect(config.variant).toBe('success')
    expect(config.label).toBe('Success')
  })

  test('returns pending config', () => {
    const config = getStatusConfig('pending')
    expect(config.variant).toBe('warning')
    expect(config.label).toBe('Pending')
  })

  test('returns expired config', () => {
    const config = getStatusConfig('expired')
    expect(config.variant).toBe('danger')
    expect(config.label).toBe('Expired')
  })

  test('falls back to pending for unknown status', () => {
    const config = getStatusConfig('unknown' as never)
    expect(config.variant).toBe('warning')
    expect(config.label).toBe('Pending')
  })
})

describe('getPaymentMethodName', () => {
  test('returns Stripe for stripe', () => {
    expect(getPaymentMethodName('stripe')).toBe('Stripe')
  })

  test('returns Alipay for alipay', () => {
    expect(getPaymentMethodName('alipay')).toBe('Alipay')
  })

  test('returns WeChat Pay for wxpay', () => {
    expect(getPaymentMethodName('wxpay')).toBe('WeChat Pay')
  })

  test('returns Waffo for waffo', () => {
    expect(getPaymentMethodName('waffo')).toBe('Waffo')
  })

  test('returns raw method for unknown methods', () => {
    expect(getPaymentMethodName('crypto')).toBe('crypto')
  })

  test('uses translation function when provided', () => {
    const t = (key: string) => `[${key}]`
    expect(getPaymentMethodName('stripe', t)).toBe('[Stripe]')
  })

  test('translates unknown method name via t', () => {
    const t = (key: string) => `translated:${key}`
    expect(getPaymentMethodName('crypto', t)).toBe('translated:crypto')
  })
})

describe('formatTimestamp', () => {
  test('returns formatted date for valid timestamp', () => {
    const result = formatTimestamp(1700000000)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('returns "-" for 0', () => {
    expect(formatTimestamp(0)).toBe('-')
  })
})
