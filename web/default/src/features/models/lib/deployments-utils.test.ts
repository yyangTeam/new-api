import {
  normalizeDeploymentStatus,
  formatRemainingMinutes,
} from './deployments-utils'

describe('normalizeDeploymentStatus', () => {
  test('lowercases and trims a string', () => {
    expect(normalizeDeploymentStatus('  Running  ')).toBe('running')
  })

  test('returns empty string for non-string input', () => {
    expect(normalizeDeploymentStatus(123)).toBe('')
    expect(normalizeDeploymentStatus(null)).toBe('')
    expect(normalizeDeploymentStatus(undefined)).toBe('')
  })

  test('handles already lowercase string', () => {
    expect(normalizeDeploymentStatus('failed')).toBe('failed')
  })

  test('handles mixed case', () => {
    expect(normalizeDeploymentStatus('Deployment Requested')).toBe(
      'deployment requested'
    )
  })
})

describe('formatRemainingMinutes', () => {
  test('returns "0m" for 0 minutes', () => {
    expect(formatRemainingMinutes(0)).toBe('0m')
  })

  test('formats minutes only', () => {
    expect(formatRemainingMinutes(45)).toBe('45m')
  })

  test('formats hours and minutes', () => {
    expect(formatRemainingMinutes(90)).toBe('1h 30m')
  })

  test('formats hours only (no trailing minutes)', () => {
    expect(formatRemainingMinutes(120)).toBe('2h')
  })

  test('formats days, hours, and minutes', () => {
    expect(formatRemainingMinutes(1500)).toBe('1d 1h')
  })

  test('formats days only', () => {
    expect(formatRemainingMinutes(1440)).toBe('1d')
  })

  test('formats days and minutes (no hours)', () => {
    expect(formatRemainingMinutes(1470)).toBe('1d 30m')
  })

  test('parses string input', () => {
    expect(formatRemainingMinutes('90')).toBe('1h 30m')
  })

  test('returns null for NaN', () => {
    expect(formatRemainingMinutes(NaN)).toBeNull()
  })

  test('returns null for non-numeric string', () => {
    expect(formatRemainingMinutes('abc')).toBeNull()
  })

  test('returns null for Infinity', () => {
    expect(formatRemainingMinutes(Infinity)).toBeNull()
  })

  test('returns null for non-number/non-string', () => {
    expect(formatRemainingMinutes(null)).toBeNull()
    expect(formatRemainingMinutes(undefined)).toBeNull()
  })

  test('clamps negative to zero', () => {
    expect(formatRemainingMinutes(-10)).toBe('0m')
  })

  test('rounds fractional minutes', () => {
    expect(formatRemainingMinutes(1.7)).toBe('2m')
  })
})
