import type {
  RankingPeriod,
  RankingCategoryId,
  ModelRanking,
  VendorRanking,
  RankingMover,
  ModelHistoryPoint,
  ModelHistorySeries,
  VendorSharePoint,
  VendorShareSeries,
  RankingsSnapshot,
} from '@/features/rankings/types'

describe('Rankings types', () => {
  test('RankingPeriod values', () => {
    const periods: RankingPeriod[] = ['today', 'week', 'month', 'year']
    expect(periods).toHaveLength(4)
  })

  test('RankingCategoryId values', () => {
    const categories: RankingCategoryId[] = [
      'all',
      'programming',
      'roleplay',
      'marketing',
      'translation',
      'science',
      'finance',
      'health',
      'legal',
      'education',
      'productivity',
      'multimodal',
    ]
    expect(categories).toHaveLength(12)
  })

  test('ModelRanking shape', () => {
    const model: ModelRanking = {
      rank: 1,
      model_name: 'gpt-4o',
      vendor: 'OpenAI',
      category: 'all',
      total_tokens: 1000000,
      share: 0.5,
      growth_pct: 12.5,
    }
    expect(model.rank).toBe(1)
    expect(model.previous_rank).toBeUndefined()
  })

  test('ModelRanking with optional fields', () => {
    const model: ModelRanking = {
      rank: 2,
      previous_rank: 3,
      model_name: 'claude-3',
      vendor: 'Anthropic',
      vendor_icon: 'Claude.Color',
      category: 'programming',
      total_tokens: 500000,
      share: 0.25,
      growth_pct: -5.2,
    }
    expect(model.previous_rank).toBe(3)
    expect(model.vendor_icon).toBe('Claude.Color')
  })

  test('VendorRanking shape', () => {
    const vendor: VendorRanking = {
      rank: 1,
      vendor: 'OpenAI',
      total_tokens: 5000000,
      share: 0.6,
      growth_pct: 8.3,
      models_count: 12,
      top_model: 'gpt-4o',
    }
    expect(vendor.models_count).toBe(12)
    expect(vendor.vendor_icon).toBeUndefined()
  })

  test('RankingMover shape', () => {
    const mover: RankingMover = {
      model_name: 'deepseek-v3',
      vendor: 'DeepSeek',
      rank_delta: 5,
      current_rank: 3,
      growth_pct: 150.0,
    }
    expect(mover.rank_delta).toBe(5)
    expect(mover.vendor_icon).toBeUndefined()
  })

  test('ModelHistoryPoint shape', () => {
    const point: ModelHistoryPoint = {
      ts: '2025-05-01T00:00:00Z',
      label: 'May 1',
      model: 'gpt-4o',
      vendor: 'OpenAI',
      tokens: 100000,
    }
    expect(point.ts).toBeTruthy()
  })

  test('ModelHistorySeries shape', () => {
    const series: ModelHistorySeries = {
      points: [],
      models: [{ name: 'gpt-4o', vendor: 'OpenAI', total: 1000 }],
      buckets: 24,
    }
    expect(series.buckets).toBe(24)
  })

  test('VendorSharePoint shape', () => {
    const point: VendorSharePoint = {
      ts: '2025-05-01T00:00:00Z',
      label: 'May 1',
      vendor: 'OpenAI',
      share: 0.5,
      tokens: 100000,
    }
    expect(point.share).toBe(0.5)
  })

  test('VendorShareSeries shape', () => {
    const series: VendorShareSeries = {
      points: [],
      vendors: [{ name: 'OpenAI', total: 5000, share: 0.6 }],
      buckets: 7,
    }
    expect(series.buckets).toBe(7)
  })

  test('RankingsSnapshot shape', () => {
    const snapshot: RankingsSnapshot = {
      models: [],
      vendors: [],
      top_movers: [],
      top_droppers: [],
      models_history: { points: [], models: [], buckets: 0 },
      vendor_share_history: { points: [], vendors: [], buckets: 0 },
    }
    expect(snapshot.models).toEqual([])
    expect(snapshot.vendor_share_history.vendors).toEqual([])
  })
})
