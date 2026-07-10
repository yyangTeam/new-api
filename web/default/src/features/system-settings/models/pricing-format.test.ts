import { formatPricingNumber } from './pricing-format'

describe('formatPricingNumber', () => {
  test('formats integer values', () => {
    expect(formatPricingNumber(1)).toBe('1')
    expect(formatPricingNumber(0)).toBe('0')
    expect(formatPricingNumber(100)).toBe('100')
  })

  test('formats decimal values', () => {
    expect(formatPricingNumber(1.5)).toBe('1.5')
    expect(formatPricingNumber(0.001)).toBe('0.001')
    expect(formatPricingNumber(3.14)).toBe('3.14')
  })

  test('formats string number inputs', () => {
    expect(formatPricingNumber('42')).toBe('42')
    expect(formatPricingNumber('3.14')).toBe('3.14')
    expect(formatPricingNumber('0.001')).toBe('0.001')
  })

  test('returns empty string for empty string', () => {
    expect(formatPricingNumber('')).toBe('')
  })

  test('returns empty string for null', () => {
    expect(formatPricingNumber(null)).toBe('')
  })

  test('returns empty string for undefined', () => {
    expect(formatPricingNumber(undefined)).toBe('')
  })

  test('returns empty string for false', () => {
    expect(formatPricingNumber(false)).toBe('')
  })

  test('returns empty string for NaN-producing input', () => {
    expect(formatPricingNumber('not-a-number')).toBe('')
  })

  test('returns empty string for Infinity', () => {
    expect(formatPricingNumber(Infinity)).toBe('')
    expect(formatPricingNumber(-Infinity)).toBe('')
  })

  test('handles negative numbers', () => {
    expect(formatPricingNumber(-5)).toBe('-5')
    expect(formatPricingNumber(-0.5)).toBe('-0.5')
  })

  test('snaps floating point drift', () => {
    expect(formatPricingNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatPricingNumber(1.0000000000001)).toBe('1')
  })

  test('formats very small numbers', () => {
    expect(formatPricingNumber(0.00000001)).toBe('1e-8')
  })

  test('strips trailing zeros', () => {
    expect(formatPricingNumber(1.0)).toBe('1')
    expect(formatPricingNumber(2.50)).toBe('2.5')
    expect(formatPricingNumber(3.100)).toBe('3.1')
  })

  test('handles zero as number', () => {
    expect(formatPricingNumber(0)).toBe('0')
  })

  test('handles zero as string', () => {
    expect(formatPricingNumber('0')).toBe('0')
  })

  test('handles true (converts to 1)', () => {
    expect(formatPricingNumber(true)).toBe('1')
  })
})
