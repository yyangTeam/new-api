import { isTimestampExpired, isRedemptionExpired } from './utils'

describe('isTimestampExpired', () => {
  test('returns false for 0 (never expires)', () => {
    expect(isTimestampExpired(0)).toBe(false)
  })

  test('returns true for past timestamp', () => {
    expect(isTimestampExpired(1000000000)).toBe(true)
  })

  test('returns false for future timestamp', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 100000
    expect(isTimestampExpired(futureTimestamp)).toBe(false)
  })
})

describe('isRedemptionExpired', () => {
  test('returns false when status is not 1', () => {
    expect(isRedemptionExpired(1000000000, 2)).toBe(false)
  })

  test('returns false when status is 3 (used)', () => {
    expect(isRedemptionExpired(1000000000, 3)).toBe(false)
  })

  test('returns true when status is 1 and timestamp is expired', () => {
    expect(isRedemptionExpired(1000000000, 1)).toBe(true)
  })

  test('returns false when status is 1 and timestamp is 0 (never expires)', () => {
    expect(isRedemptionExpired(0, 1)).toBe(false)
  })

  test('returns false when status is 1 and timestamp is in the future', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 100000
    expect(isRedemptionExpired(futureTimestamp, 1)).toBe(false)
  })
})
