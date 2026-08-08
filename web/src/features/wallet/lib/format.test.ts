import {
  formatQuotaShort,
  formatCurrency,
  getDiscountLabel,
  calculatePresetPricing,
} from './format'

describe('formatQuotaShort', () => {
  test('returns value as string for small numbers', () => {
    expect(formatQuotaShort(500)).toBe('500')
  })

  test('formats thousands with K suffix', () => {
    expect(formatQuotaShort(1500)).toBe('1.5K')
  })

  test('formats exact thousand', () => {
    expect(formatQuotaShort(1000)).toBe('1.0K')
  })

  test('formats millions with M suffix', () => {
    expect(formatQuotaShort(2500000)).toBe('2.5M')
  })

  test('formats exact million', () => {
    expect(formatQuotaShort(1000000)).toBe('1.0M')
  })

  test('returns "0" for 0', () => {
    expect(formatQuotaShort(0)).toBe('0')
  })
})

describe('formatCurrency', () => {
  test('formats number value', () => {
    const result = formatCurrency(1234.56)
    expect(result).toMatch(/1.*234/)
  })

  test('formats string value', () => {
    const result = formatCurrency('99.99')
    expect(result).toMatch(/99/)
  })

  test('returns "-" for NaN', () => {
    expect(formatCurrency(NaN)).toBe('-')
  })

  test('returns "-" for non-numeric string', () => {
    expect(formatCurrency('abc')).toBe('-')
  })

  test('returns "-" for Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('-')
  })

  test('formats small numbers with more decimal places', () => {
    const result = formatCurrency(0.0012)
    expect(result).toContain('0.0012')
  })

  test('formats zero', () => {
    const result = formatCurrency(0)
    expect(result).toBe('0')
  })
})

describe('getDiscountLabel', () => {
  test('returns empty string for no discount (1.0)', () => {
    expect(getDiscountLabel(1.0)).toBe('')
  })

  test('returns empty string for values above 1.0', () => {
    expect(getDiscountLabel(1.5)).toBe('')
  })

  test('returns "20% OFF" for 0.8 discount', () => {
    expect(getDiscountLabel(0.8)).toBe('20% OFF')
  })

  test('returns "50% OFF" for 0.5 discount', () => {
    expect(getDiscountLabel(0.5)).toBe('50% OFF')
  })

  test('returns "10% OFF" for 0.9 discount', () => {
    expect(getDiscountLabel(0.9)).toBe('10% OFF')
  })
})

describe('calculatePresetPricing', () => {
  test('calculates pricing without discount', () => {
    const result = calculatePresetPricing(100, 0.5, 1.0)
    expect(result).toEqual({
      displayValue: 100,
      originalPrice: 50,
      actualPrice: 50,
      savedAmount: 0,
      hasDiscount: false,
    })
  })

  test('calculates pricing with discount', () => {
    const result = calculatePresetPricing(100, 0.5, 0.8)
    expect(result).toEqual({
      displayValue: 100,
      originalPrice: 50,
      actualPrice: 40,
      savedAmount: 10,
      hasDiscount: true,
    })
  })

  test('applies USD exchange rate', () => {
    const result = calculatePresetPricing(100, 0.5, 1.0, 7.0)
    expect(result.displayValue).toBe(700)
  })

  test('defaults exchange rate to 1', () => {
    const result = calculatePresetPricing(10, 1, 1.0)
    expect(result.displayValue).toBe(10)
  })
})
