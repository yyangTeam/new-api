import { getDashboardChartColors, processChartData, processUserChartData } from './charts'

vi.mock('@visactor/vchart/esm/theme/color-scheme/builtin/default', () => ({
  dataScheme: [
    { maxDomainLength: 5, scheme: ['#1', '#2', '#3', '#4', '#5'] },
    { maxDomainLength: 10, scheme: ['#A', '#B', '#C', '#D', '#E', '#F', '#G', '#H', '#I', '#J'] },
    { scheme: ['#X1', '#X2', '#X3', '#X4', '#X5', '#X6', '#X7', '#X8', '#X9', '#X10', '#X11', '#X12'] },
  ],
}))

vi.mock('@/lib/currency', () => ({
  getCurrencyDisplay: () => ({
    config: {
      quotaPerUnit: 500000,
      quotaDisplayType: 'USD',
      usdExchangeRate: 1,
    },
    meta: {
      kind: 'currency',
      symbol: '$',
      currencyCode: 'USD',
      exchangeRate: 1,
    },
  }),
}))

vi.mock('@/lib/time', () => ({
  formatChartTime: (ts: number, granularity: string) => {
    const d = new Date(ts * 1000)
    if (granularity === 'hour') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:00`
    if (granularity === 'week') return `W${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  },
}))

describe('getDashboardChartColors', () => {
  test('returns colors from the first matching scheme for small domain', () => {
    const colors = getDashboardChartColors(3)
    expect(colors).toEqual(['#1', '#2', '#3', '#4', '#5'])
  })

  test('returns colors from matching scheme for medium domain', () => {
    const colors = getDashboardChartColors(7)
    expect(colors).toEqual(['#A', '#B', '#C', '#D', '#E', '#F', '#G', '#H', '#I', '#J'])
  })

  test('returns last scheme for very large domain', () => {
    const colors = getDashboardChartColors(100)
    expect(colors.length).toBeGreaterThan(0)
    expect(colors[0]).toBe('#X1')
  })

  test('filters out non-string items', () => {
    const colors = getDashboardChartColors(3)
    colors.forEach((c) => {
      expect(typeof c).toBe('string')
    })
  })
})

describe('processChartData', () => {
  test('returns empty chart specs when data is empty', () => {
    const result = processChartData([])
    expect(result.spec_pie.data[0].values).toEqual([])
    expect(result.spec_line.data[0].values).toEqual([])
    expect(result.spec_area.data[0].values).toEqual([])
    expect(result.spec_model_line.data[0].values).toEqual([])
    expect(result.spec_rank_bar.data[0].values).toEqual([])
    expect(result.totalCountDisplay).toBe('0')
  })

  test('returns empty chart specs when data is undefined', () => {
    const result = processChartData(undefined as never)
    expect(result.spec_pie.data[0].values).toEqual([])
  })

  test('uses translation function for labels when provided', () => {
    const t = (key: string) => `translated:${key}`
    const result = processChartData([], 'day', t)
    expect(result.spec_pie.title.text).toBe('translated:Call Count Distribution')
    expect(result.spec_pie.title.subtext).toBe('translated:No data available')
  })

  test('processes single data point correctly', () => {
    const data = [
      { created_at: 1700000000, model_name: 'gpt-4', quota: 1000, count: 5, token_used: 200 },
    ]
    const result = processChartData(data, 'day')

    expect(result.spec_pie.data[0].values.length).toBe(1)
    expect(result.spec_pie.data[0].values[0].type).toBe('gpt-4')
    expect(result.spec_pie.data[0].values[0].value).toBe(5)

    expect(result.spec_rank_bar.data[0].values.length).toBe(1)
    expect(result.spec_rank_bar.data[0].values[0].Model).toBe('gpt-4')
    expect(result.spec_rank_bar.data[0].values[0].Count).toBe(5)

    expect(result.totalCountDisplay).toBe('5')
  })

  test('processes multiple models and aggregates correctly', () => {
    const data = [
      { created_at: 1700000000, model_name: 'gpt-4', quota: 1000, count: 5, token_used: 200 },
      { created_at: 1700000000, model_name: 'gpt-3.5', quota: 500, count: 10, token_used: 100 },
      { created_at: 1700086400, model_name: 'gpt-4', quota: 2000, count: 3, token_used: 400 },
    ]
    const result = processChartData(data, 'day')

    expect(result.spec_pie.data[0].values.length).toBe(2)

    const totalCount = result.spec_pie.data[0].values.reduce(
      (sum: number, v: { value: number }) => sum + v.value,
      0
    )
    expect(totalCount).toBe(18)

    expect(result.spec_rank_bar.data[0].values.length).toBe(2)
  })

  test('assigns Unknown model name when model_name is empty', () => {
    const data = [
      { created_at: 1700000000, model_name: '', quota: 100, count: 1, token_used: 50 },
    ]
    const result = processChartData(data, 'day')
    expect(result.spec_pie.data[0].values[0].type).toBe('Unknown')
  })

  test('applies chartCornerRadius when provided', () => {
    const data = [
      { created_at: 1700000000, model_name: 'gpt-4', quota: 1000, count: 5 },
    ]
    const result = processChartData(data, 'day', undefined, 8)
    expect(result.spec_pie.pie.style.cornerRadius).toBe(8)
  })

  test('pie style is empty object when chartCornerRadius is not provided', () => {
    const data = [
      { created_at: 1700000000, model_name: 'gpt-4', quota: 1000, count: 5 },
    ]
    const result = processChartData(data, 'day')
    expect(result.spec_pie.pie.style).toEqual({})
  })

  test('chart specs have correct types', () => {
    const data = [
      { created_at: 1700000000, model_name: 'gpt-4', quota: 1000, count: 5 },
    ]
    const result = processChartData(data, 'day')
    expect(result.spec_pie.type).toBe('pie')
    expect(result.spec_line.type).toBe('bar')
    expect(result.spec_area.type).toBe('area')
    expect(result.spec_model_line.type).toBe('area')
    expect(result.spec_rank_bar.type).toBe('bar')
  })
})

describe('processUserChartData', () => {
  test('returns empty specs when data is empty', () => {
    const result = processUserChartData([])
    expect(result.spec_user_rank.data[0].values).toEqual([])
    expect(result.spec_user_trend.data[0].values).toEqual([])
  })

  test('returns empty specs when data is undefined', () => {
    const result = processUserChartData(undefined as never)
    expect(result.spec_user_rank.data[0].values).toEqual([])
    expect(result.spec_user_trend.data[0].values).toEqual([])
  })

  test('uses translation function for labels', () => {
    const t = (key: string) => `t:${key}`
    const result = processUserChartData([], 'day', t)
    expect(result.spec_user_rank.title.text).toBe('t:User Consumption Ranking')
    expect(result.spec_user_rank.title.subtext).toBe('t:No data available')
    expect(result.spec_user_trend.title.text).toBe('t:User Consumption Trend')
    expect(result.spec_user_trend.title.subtext).toBe('t:No data available')
  })

  test('processes single user data correctly', () => {
    const data = [
      { created_at: 1700000000, username: 'alice', quota: 5000, count: 10 },
    ]
    const result = processUserChartData(data, 'day')
    expect(result.spec_user_rank.data[0].values.length).toBe(1)
    expect(result.spec_user_rank.data[0].values[0].User).toBe('alice')
    expect(result.spec_user_rank.data[0].values[0].rawQuota).toBe(5000)
  })

  test('ranks users by total quota descending', () => {
    const data = [
      { created_at: 1700000000, username: 'alice', quota: 1000 },
      { created_at: 1700000000, username: 'bob', quota: 5000 },
      { created_at: 1700000000, username: 'carol', quota: 3000 },
    ]
    const result = processUserChartData(data, 'day')
    const rankValues = result.spec_user_rank.data[0].values
    expect(rankValues[0].User).toBe('bob')
    expect(rankValues[1].User).toBe('carol')
    expect(rankValues[2].User).toBe('alice')
  })

  test('limits users to specified limit', () => {
    const data = Array.from({ length: 15 }, (_, i) => ({
      created_at: 1700000000,
      username: `user${i}`,
      quota: (15 - i) * 1000,
    }))
    const result = processUserChartData(data, 'day', undefined, 5)
    expect(result.spec_user_rank.data[0].values.length).toBe(5)
  })

  test('defaults username to unknown when missing', () => {
    const data = [
      { created_at: 1700000000, username: '', quota: 1000 },
    ]
    const result = processUserChartData(data, 'day')
    expect(result.spec_user_rank.data[0].values[0].User).toBe('unknown')
  })

  test('chart specs have correct types', () => {
    const data = [
      { created_at: 1700000000, username: 'alice', quota: 5000, count: 10 },
    ]
    const result = processUserChartData(data, 'day')
    expect(result.spec_user_rank.type).toBe('bar')
    expect(result.spec_user_trend.type).toBe('area')
  })

  test('generates trend data points for each user at each time', () => {
    const data = [
      { created_at: 1700000000, username: 'alice', quota: 1000 },
      { created_at: 1700086400, username: 'alice', quota: 2000 },
      { created_at: 1700000000, username: 'bob', quota: 500 },
    ]
    const result = processUserChartData(data, 'day')
    const trendValues = result.spec_user_trend.data[0].values
    expect(trendValues.length).toBeGreaterThanOrEqual(4)
    const aliceEntries = trendValues.filter((v: { User: string }) => v.User === 'alice')
    expect(aliceEntries.length).toBe(2)
  })
})
