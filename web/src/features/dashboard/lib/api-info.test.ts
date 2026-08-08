import { getLatencyColorClass, getDefaultPingStatus } from './api-info'

describe('getLatencyColorClass', () => {
  test('returns green for latency < 200', () => {
    expect(getLatencyColorClass(100)).toBe(
      'text-green-600 dark:text-green-400'
    )
  })

  test('returns green for latency 0', () => {
    expect(getLatencyColorClass(0)).toBe('text-green-600 dark:text-green-400')
  })

  test('returns green for latency 199', () => {
    expect(getLatencyColorClass(199)).toBe(
      'text-green-600 dark:text-green-400'
    )
  })

  test('returns yellow for latency 200', () => {
    expect(getLatencyColorClass(200)).toBe(
      'text-yellow-600 dark:text-yellow-400'
    )
  })

  test('returns yellow for latency 499', () => {
    expect(getLatencyColorClass(499)).toBe(
      'text-yellow-600 dark:text-yellow-400'
    )
  })

  test('returns red for latency 500', () => {
    expect(getLatencyColorClass(500)).toBe('text-red-600 dark:text-red-400')
  })

  test('returns red for latency 1000', () => {
    expect(getLatencyColorClass(1000)).toBe('text-red-600 dark:text-red-400')
  })
})

describe('getDefaultPingStatus', () => {
  test('returns default ping status', () => {
    expect(getDefaultPingStatus()).toEqual({
      latency: null,
      testing: false,
      error: false,
    })
  })

  test('returns a new object each call', () => {
    const a = getDefaultPingStatus()
    const b = getDefaultPingStatus()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
