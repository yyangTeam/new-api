import {
  formatRateLimit,
  formatTokenVolume,
  buildSupportedParameters,
  buildRateLimits,
  buildGroupPerformance,
  buildLatencyTimeSeries,
  buildUptimeSeries,
  buildAppRankings,
  aggregateUptime,
} from './mock-stats'
import type { PricingModel } from '../types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'gpt-4o',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    ...overrides,
  }
}

describe('mock-stats - branch coverage', () => {
  describe('formatRateLimit', () => {
    test('returns dash for 0', () => {
      expect(formatRateLimit(0)).toBe('—')
    })

    test('returns dash for negative', () => {
      expect(formatRateLimit(-1)).toBe('—')
    })

    test('formats millions', () => {
      expect(formatRateLimit(2_500_000)).toBe('2.5M')
    })

    test('formats exact million', () => {
      expect(formatRateLimit(1_000_000)).toBe('1.0M')
    })

    test('formats tens of thousands without decimals', () => {
      expect(formatRateLimit(50_000)).toBe('50K')
    })

    test('formats thousands with one decimal', () => {
      expect(formatRateLimit(5_500)).toBe('5.5K')
    })

    test('formats exact thousand', () => {
      expect(formatRateLimit(1_000)).toBe('1.0K')
    })

    test('formats small numbers with locale string', () => {
      const result = formatRateLimit(500)
      expect(result).toBe('500')
    })
  })

  describe('formatTokenVolume', () => {
    test('returns 0 for 0', () => {
      expect(formatTokenVolume(0)).toBe('0')
    })

    test('returns 0 for negative', () => {
      expect(formatTokenVolume(-100)).toBe('0')
    })

    test('returns 0 for NaN', () => {
      expect(formatTokenVolume(NaN)).toBe('0')
    })

    test('returns 0 for Infinity', () => {
      expect(formatTokenVolume(Infinity)).toBe('0')
    })

    test('formats billions', () => {
      expect(formatTokenVolume(2_500_000_000)).toBe('2.5B')
    })

    test('formats millions', () => {
      expect(formatTokenVolume(150_000_000)).toBe('150.0M')
    })

    test('formats thousands', () => {
      expect(formatTokenVolume(5_500)).toBe('5.5K')
    })

    test('formats small numbers', () => {
      expect(formatTokenVolume(500)).toBe('500')
    })
  })

  describe('buildSupportedParameters', () => {
    test('returns reasoning params for reasoning model', () => {
      const model = createModel({ model_name: 'o1-preview' })
      const params = buildSupportedParameters(model)
      expect(params.some((p) => p.name === 'reasoning_effort')).toBe(true)
    })

    test('returns embedding params for embedding model', () => {
      const model = createModel({ model_name: 'text-embedding-3-large' })
      const params = buildSupportedParameters(model)
      expect(params.some((p) => p.name === 'input')).toBe(true)
      expect(params.some((p) => p.name === 'dimensions')).toBe(true)
    })

    test('returns image params for image model', () => {
      const model = createModel({ model_name: 'dalle-3' })
      const params = buildSupportedParameters(model)
      expect(params.some((p) => p.name === 'prompt')).toBe(true)
      expect(params.some((p) => p.name === 'size')).toBe(true)
    })

    test('returns video params for video model', () => {
      const model = createModel({ model_name: 'sora-turbo' })
      const params = buildSupportedParameters(model)
      expect(params.some((p) => p.name === 'duration')).toBe(true)
      expect(params.some((p) => p.name === 'aspect_ratio')).toBe(true)
    })

    test('returns chat params for standard model', () => {
      const model = createModel({ model_name: 'gpt-4o' })
      const params = buildSupportedParameters(model)
      expect(params.some((p) => p.name === 'temperature')).toBe(true)
      expect(params.some((p) => p.name === 'max_tokens')).toBe(true)
    })
  })

  describe('buildRateLimits', () => {
    test('returns rate limits for each group', () => {
      const model = createModel({ enable_groups: ['default', 'premium'] })
      const limits = buildRateLimits(model)
      expect(limits).toHaveLength(2)
      expect(limits[0].rpm).toBeGreaterThan(0)
    })

    test('returns default group when enable_groups is empty', () => {
      const model = createModel({ enable_groups: [] })
      const limits = buildRateLimits(model)
      expect(limits).toHaveLength(1)
      expect(limits[0].group).toBe('default')
    })

    test('filters out auto group', () => {
      const model = createModel({ enable_groups: ['default', 'auto'] })
      const limits = buildRateLimits(model)
      expect(limits).toHaveLength(1)
      expect(limits[0].group).toBe('default')
    })

    test('returns 0 tpm for image models', () => {
      const model = createModel({ model_name: 'dalle-3' })
      const limits = buildRateLimits(model)
      expect(limits[0].tpm).toBe(0)
    })
  })

  describe('buildGroupPerformance', () => {
    test('returns performance for each group', () => {
      const model = createModel({ enable_groups: ['default', 'premium'] })
      const perfs = buildGroupPerformance(model)
      expect(perfs).toHaveLength(2)
      expect(perfs[0].ttft_p50_ms).toBeGreaterThan(0)
    })

    test('returns default group when no groups', () => {
      const model = createModel({ enable_groups: [] })
      const perfs = buildGroupPerformance(model)
      expect(perfs).toHaveLength(1)
      expect(perfs[0].group).toBe('default')
    })

    test('is deterministic', () => {
      const model = createModel()
      const perfs1 = buildGroupPerformance(model)
      const perfs2 = buildGroupPerformance(model)
      expect(perfs1[0].ttft_p50_ms).toBe(perfs2[0].ttft_p50_ms)
    })
  })

  describe('buildLatencyTimeSeries', () => {
    test('returns 24 points per group', () => {
      const model = createModel({ enable_groups: ['default'] })
      const series = buildLatencyTimeSeries(model)
      expect(series).toHaveLength(24)
    })

    test('returns multiple groups * 24 points', () => {
      const model = createModel({ enable_groups: ['a', 'b'] })
      const series = buildLatencyTimeSeries(model)
      expect(series).toHaveLength(48)
    })
  })

  describe('buildUptimeSeries', () => {
    test('returns 30 points', () => {
      const model = createModel()
      const series = buildUptimeSeries(model)
      expect(series).toHaveLength(30)
    })

    test('accepts optional group parameter', () => {
      const model = createModel({ enable_groups: ['default'] })
      const series = buildUptimeSeries(model, 'default')
      expect(series).toHaveLength(30)
    })

    test('uses average uptime when group not found', () => {
      const model = createModel({ enable_groups: ['default'] })
      const series = buildUptimeSeries(model, 'nonexistent')
      expect(series).toHaveLength(30)
    })
  })

  describe('buildAppRankings', () => {
    test('returns requested count of apps', () => {
      const model = createModel()
      const apps = buildAppRankings(model, 5)
      expect(apps).toHaveLength(5)
    })

    test('defaults to 12 apps', () => {
      const model = createModel()
      const apps = buildAppRankings(model)
      expect(apps).toHaveLength(12)
    })

    test('apps have sequential ranks', () => {
      const model = createModel()
      const apps = buildAppRankings(model, 5)
      expect(apps.map((a) => a.rank)).toEqual([1, 2, 3, 4, 5])
    })

    test('is deterministic', () => {
      const model = createModel()
      const apps1 = buildAppRankings(model, 3)
      const apps2 = buildAppRankings(model, 3)
      expect(apps1[0].name).toBe(apps2[0].name)
    })
  })

  describe('aggregateUptime', () => {
    test('returns zeros for empty points', () => {
      expect(aggregateUptime([])).toEqual({
        uptime_pct: 0,
        incidents: 0,
        outage_minutes: 0,
      })
    })

    test('aggregates incidents and outage minutes', () => {
      const points = [
        { date: '2024-01-01', uptime_pct: 99, incidents: 1, outage_minutes: 10 },
        { date: '2024-01-02', uptime_pct: 100, incidents: 0, outage_minutes: 0 },
        { date: '2024-01-03', uptime_pct: 98, incidents: 2, outage_minutes: 20 },
      ]
      const result = aggregateUptime(points)
      expect(result.incidents).toBe(3)
      expect(result.outage_minutes).toBe(30)
    })

    test('calculates correct uptime percentage', () => {
      const points = [
        { date: '2024-01-01', uptime_pct: 100, incidents: 0, outage_minutes: 0 },
      ]
      const result = aggregateUptime(points)
      expect(result.uptime_pct).toBe(100)
    })
  })
})
