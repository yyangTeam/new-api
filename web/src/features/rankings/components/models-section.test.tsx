import { render, screen } from '@/test/test-utils'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}))

let capturedSpec: any = null

vi.mock('@visactor/react-vchart', () => ({
  VChart: (props: any) => {
    capturedSpec = props.spec
    return <div data-testid='vchart' />
  },
}))

vi.mock('@/lib/use-chart-theme', () => ({
  useChartTheme: () => ({ resolvedTheme: 'dark', themeReady: true }),
}))

vi.mock('@/lib/vchart', () => ({
  VCHART_OPTION: {},
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (name: string, size: number) => (
    <span data-testid='lobe-icon' data-name={name} data-size={size} />
  ),
}))

import { ModelsSection } from './models-section'
import type { ModelHistorySeries, ModelRanking } from '../types'

const makeHistory = (
  overrides: Partial<ModelHistorySeries> = {}
): ModelHistorySeries => ({
  points: [
    { ts: '2025-01-01', label: 'Jan 1', model: 'gpt-4o', vendor: 'OpenAI', tokens: 5000 },
    { ts: '2025-01-01', label: 'Jan 1', model: 'claude-3', vendor: 'Anthropic', tokens: 3000 },
  ],
  models: [
    { name: 'gpt-4o', vendor: 'OpenAI', total: 5000 },
    { name: 'claude-3', vendor: 'Anthropic', total: 3000 },
  ],
  buckets: 7,
  ...overrides,
})

const makeRows = (): ModelRanking[] => [
  {
    rank: 1,
    model_name: 'gpt-4o',
    vendor: 'OpenAI',
    vendor_icon: 'OpenAI',
    category: 'all',
    total_tokens: 5000,
    share: 0.6,
    growth_pct: 15,
  },
  {
    rank: 2,
    model_name: 'claude-3',
    vendor: 'Anthropic',
    vendor_icon: 'Claude',
    category: 'all',
    total_tokens: 3000,
    share: 0.4,
    growth_pct: -5,
  },
]

describe('ModelsSection', () => {
  test('renders section title', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    expect(screen.getByText('Top Models')).toBeInTheDocument()
  })

  test('renders period description', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='today' />
    )
    expect(
      screen.getByText('Hourly token usage by model across the last 24 hours')
    ).toBeInTheDocument()
  })

  test('renders total tokens count', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    // 5000 + 3000 = 8000 => 8.0K
    expect(screen.getByText('8.0K')).toBeInTheDocument()
  })

  test('renders chart when themeReady and data available', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='month' />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('renders no history data message when points are empty', () => {
    render(
      <ModelsSection
        history={makeHistory({ points: [], models: [] })}
        rows={makeRows()}
        period='year'
      />
    )
    expect(screen.getByText('No history data available')).toBeInTheDocument()
  })

  test('renders empty models message when rows are empty', () => {
    render(
      <ModelsSection history={makeHistory()} rows={[]} period='week' />
    )
    expect(
      screen.getByText('No models match the selected filters')
    ).toBeInTheDocument()
  })

  test('renders LLM Leaderboard subheading', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    expect(screen.getByText('LLM Leaderboard')).toBeInTheDocument()
    expect(
      screen.getByText('Compare the most popular models on the platform')
    ).toBeInTheDocument()
  })

  test('renders model names from rows via leaderboard', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('claude-3')).toBeInTheDocument()
  })

  test('spec tooltip mark content returns model and tokens', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    const markContent = capturedSpec.tooltip.mark.content[0]
    expect(markContent.key({ model: 'gpt-4o' })).toBe('gpt-4o')
    expect(markContent.value({ tokens: 5000 })).toBe('5.0K')
    expect(markContent.value({ tokens: 0 })).toBe('0')
  })

  test('spec tooltip dimension title returns label', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    const titleValue = capturedSpec.tooltip.dimension.title.value
    expect(titleValue({ label: 'Jan 1' })).toBe('Jan 1')
    expect(titleValue({})).toBe('')
  })

  test('spec tooltip dimension content returns model and tokens', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    const content = capturedSpec.tooltip.dimension.content[0]
    expect(content.key({ model: 'test-model' })).toBe('test-model')
    expect(content.value({ tokens: 100 })).toBe(100)
    expect(content.value({})).toBe(0)
  })

  test('spec tooltip updateContent sorts and truncates', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    const updateContent = capturedSpec.tooltip.dimension.updateContent

    // Less than TOOLTIP_MAX_ROWS items
    const items = [
      { key: 'model-a', value: 500 },
      { key: 'model-b', value: 1000 },
    ]
    const result = updateContent(items)
    // Should have Total: first, then sorted desc
    expect(result[0].key).toBe('Total:')
    expect(result[0].value).toBe('1.5K')
    expect(result[1].key).toBe('model-b')
    expect(result[2].key).toBe('model-a')
  })

  test('spec tooltip updateContent shows overflow when > 10 items', () => {
    render(
      <ModelsSection history={makeHistory()} rows={makeRows()} period='week' />
    )
    const updateContent = capturedSpec.tooltip.dimension.updateContent

    // More than 10 items
    const items = Array.from({ length: 12 }, (_, i) => ({
      key: `model-${i}`,
      value: (12 - i) * 100,
    }))
    const result = updateContent(items)
    // Total + 10 visible + 1 overflow summary
    expect(result.length).toBe(12) // Total: + 10 + "+2 more"
    expect(result[0].key).toBe('Total:')
    expect(result[result.length - 1].key).toContain('more')
  })
})
