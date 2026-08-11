import { formatTokens, formatShare, formatReleaseDate } from '@/features/rankings/lib/index'

describe('rankings lib/index re-exports', () => {
  test('exports formatTokens', () => {
    expect(formatTokens).toBeDefined()
    expect(formatTokens(1000)).toBe('1.0K')
  })

  test('exports formatShare', () => {
    expect(formatShare).toBeDefined()
    expect(formatShare(0.5)).toBe('50.0%')
  })

  test('exports formatReleaseDate', () => {
    expect(formatReleaseDate).toBeDefined()
    expect(formatReleaseDate('invalid')).toBe('invalid')
  })
})
