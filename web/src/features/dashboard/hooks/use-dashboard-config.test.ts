import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

import {
  useModelStatCardsConfig,
  useSummaryCardsConfig,
} from './use-dashboard-config'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

describe('useModelStatCardsConfig', () => {
  it('returns 5 stat card configurations', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())

    expect(result.current).toHaveLength(5)
  })

  it('includes count, quota, tokens, avgRpm, avgTpm cards', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const keys = result.current.map((c) => c.key)

    expect(keys).toContain('count')
    expect(keys).toContain('quota')
    expect(keys).toContain('tokens')
    expect(keys).toContain('avgRpm')
    expect(keys).toContain('avgTpm')
  })

  it('each card has required properties', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())

    for (const card of result.current) {
      expect(card).toHaveProperty('key')
      expect(card).toHaveProperty('title')
      expect(card).toHaveProperty('description')
      expect(card).toHaveProperty('icon')
      expect(card).toHaveProperty('iconTone')
      expect(card).toHaveProperty('getValue')
      expect(typeof card.getValue).toBe('function')
    }
  })

  it('count card getValue returns rpm from stat', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const countCard = result.current.find((c) => c.key === 'count')!

    expect(countCard.getValue({ rpm: 42, tpm: 100, quota: 50 })).toBe(42)
  })

  it('quota card getValue returns quota from stat', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const quotaCard = result.current.find((c) => c.key === 'quota')!

    expect(quotaCard.getValue({ rpm: 42, tpm: 100, quota: 50 })).toBe(50)
  })

  it('tokens card getValue returns tpm from stat', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const tokensCard = result.current.find((c) => c.key === 'tokens')!

    expect(tokensCard.getValue({ rpm: 42, tpm: 100, quota: 50 })).toBe(100)
  })

  it('avgRpm card getValue divides rpm by timeRangeMinutes', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const avgRpmCard = result.current.find((c) => c.key === 'avgRpm')!

    expect(avgRpmCard.getValue({ rpm: 100, tpm: 0, quota: 0 }, 10)).toBe(10)
  })

  it('avgTpm card getValue divides tpm by timeRangeMinutes', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const avgTpmCard = result.current.find((c) => c.key === 'avgTpm')!

    expect(avgTpmCard.getValue({ rpm: 0, tpm: 200, quota: 0 }, 4)).toBe(50)
  })

  it('getValue returns 0 when stat values are missing', () => {
    const { result } = renderHook(() => useModelStatCardsConfig())
    const countCard = result.current.find((c) => c.key === 'count')!

    expect(countCard.getValue({})).toBe(0)
  })
})

describe('useSummaryCardsConfig', () => {
  it('returns 3 summary card configurations', () => {
    const { result } = renderHook(() =>
      useSummaryCardsConfig({
        todayUsageDisplay: '$5.00',
        usedDisplay: '$100.00',
        requestCountDisplay: '1,234',
        currencyLabel: 'USD',
        currencyEnabled: true,
      })
    )

    expect(result.current).toHaveLength(3)
  })

  it('includes todayUsage, usage, and requests cards', () => {
    const { result } = renderHook(() =>
      useSummaryCardsConfig({
        todayUsageDisplay: '$5.00',
        usedDisplay: '$100.00',
        requestCountDisplay: '1,234',
        currencyLabel: 'USD',
        currencyEnabled: true,
      })
    )
    const keys = result.current.map((c) => c.key)

    expect(keys).toEqual(['todayUsage', 'usage', 'requests'])
  })

  it('uses todayUsageDisplay as value for todayUsage card', () => {
    const { result } = renderHook(() =>
      useSummaryCardsConfig({
        todayUsageDisplay: '$7.50',
        usedDisplay: '$200.00',
        requestCountDisplay: '500',
        currencyLabel: 'USD',
        currencyEnabled: true,
      })
    )
    const todayCard = result.current.find((c) => c.key === 'todayUsage')!

    expect(todayCard.value).toBe('$7.50')
  })

  it('includes currency label in description when currency is enabled', () => {
    const { result } = renderHook(() =>
      useSummaryCardsConfig({
        todayUsageDisplay: '$5.00',
        usedDisplay: '$100.00',
        requestCountDisplay: '1,234',
        currencyLabel: 'EUR',
        currencyEnabled: true,
      })
    )
    const usageCard = result.current.find((c) => c.key === 'usage')!

    expect(usageCard.description).toContain('EUR')
  })

  it('omits currency label from description when currency is disabled', () => {
    const { result } = renderHook(() =>
      useSummaryCardsConfig({
        todayUsageDisplay: '5000',
        usedDisplay: '100000',
        requestCountDisplay: '1,234',
        currencyLabel: 'USD',
        currencyEnabled: false,
      })
    )
    const usageCard = result.current.find((c) => c.key === 'usage')!

    expect(usageCard.description).not.toContain('USD')
  })
})
