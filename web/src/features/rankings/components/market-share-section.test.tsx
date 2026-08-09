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
  useChartTheme: () => ({ resolvedTheme: 'light', themeReady: true }),
}))

vi.mock('@/lib/vchart', () => ({
  VCHART_OPTION: {},
}))

import { MarketShareSection } from './market-share-section'
import type { VendorRanking, VendorShareSeries } from '../types'

const makeHistory = (
  overrides: Partial<VendorShareSeries> = {}
): VendorShareSeries => ({
  points: [
    { ts: '2025-01-01', label: 'Jan 1', vendor: 'OpenAI', share: 0.6, tokens: 600000 },
    { ts: '2025-01-01', label: 'Jan 1', vendor: 'Anthropic', share: 0.4, tokens: 400000 },
  ],
  vendors: [
    { name: 'OpenAI', total: 600000, share: 0.6 },
    { name: 'Anthropic', total: 400000, share: 0.4 },
  ],
  buckets: 7,
  ...overrides,
})

const makeVendorRows = (): VendorRanking[] => [
  {
    rank: 1,
    vendor: 'OpenAI',
    vendor_icon: 'OpenAI',
    total_tokens: 600000,
    share: 0.6,
    growth_pct: 10,
    models_count: 5,
    top_model: 'gpt-4o',
  },
  {
    rank: 2,
    vendor: 'Anthropic',
    vendor_icon: 'Claude',
    total_tokens: 400000,
    share: 0.4,
    growth_pct: -2,
    models_count: 3,
    top_model: 'claude-3-opus',
  },
]

describe('MarketShareSection', () => {
  test('renders section title', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    expect(screen.getByText('Market Share')).toBeInTheDocument()
  })

  test('renders period description', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    expect(
      screen.getByText('Token share by model author across the past few weeks')
    ).toBeInTheDocument()
  })

  test('renders vendor names', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='month'
      />
    )
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  test('renders chart when themeReady and data available', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='today'
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('renders no-data message when history has no points', () => {
    render(
      <MarketShareSection
        history={makeHistory({ points: [], vendors: [] })}
        rows={makeVendorRows()}
        period='year'
      />
    )
    expect(screen.getByText('No history data available')).toBeInTheDocument()
  })

  test('renders no-vendor message when rows are empty', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={[]}
        period='week'
      />
    )
    expect(screen.getByText('No vendor data available')).toBeInTheDocument()
  })

  test('renders vendor list subheading', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    expect(screen.getByText('By model author')).toBeInTheDocument()
    expect(
      screen.getByText('Vendors ranked by aggregated token volume')
    ).toBeInTheDocument()
  })

  test('uses fallback colours for unknown vendors', () => {
    const history: VendorShareSeries = {
      points: [
        { ts: '2025-01-01', label: 'Jan 1', vendor: 'UnknownVendor', share: 1, tokens: 100 },
      ],
      vendors: [{ name: 'UnknownVendor', total: 100, share: 1 }],
      buckets: 1,
    }
    const rows: VendorRanking[] = [
      {
        rank: 1,
        vendor: 'UnknownVendor',
        total_tokens: 100,
        share: 1,
        growth_pct: 0,
        models_count: 1,
        top_model: 'unknown-model',
      },
    ]
    render(<MarketShareSection history={history} rows={rows} period='week' />)
    expect(screen.getByText('UnknownVendor')).toBeInTheDocument()
  })

  test('spec tooltip mark content shows vendor and share', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    const markContent = capturedSpec.tooltip.mark.content[0]
    expect(markContent.key({ vendor: 'OpenAI' })).toBe('OpenAI')
    expect(markContent.key({})).toBe('')
    const val = markContent.value({ share: 0.6, tokens: 600000 })
    expect(val).toContain('60.0%')
    expect(val).toContain('600K')
  })

  test('spec tooltip dimension title returns label', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    expect(capturedSpec.tooltip.dimension.title.value({ label: 'Jan 1' })).toBe('Jan 1')
    expect(capturedSpec.tooltip.dimension.title.value({})).toBe('')
  })

  test('spec tooltip dimension content returns vendor and share', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    const content = capturedSpec.tooltip.dimension.content[0]
    expect(content.key({ vendor: 'Anthropic' })).toBe('Anthropic')
    expect(content.value({ share: 0.4 })).toBe(0.4)
    expect(content.value({})).toBe(0)
  })

  test('spec tooltip updateContent filters and sorts', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    const updateContent = capturedSpec.tooltip.dimension.updateContent

    const items = [
      { key: 'OpenAI', value: 0.6 },
      { key: 'Tiny', value: 0.0001 }, // below 0.001 threshold, filtered out
      { key: 'Anthropic', value: 0.4 },
    ]
    const result = updateContent(items)
    // Tiny should be filtered out (< 0.001)
    expect(result.length).toBe(2)
    // Sorted by value desc
    expect(result[0].key).toBe('OpenAI')
    expect(result[0].value).toBe('60.0%')
    expect(result[1].key).toBe('Anthropic')
    expect(result[1].value).toBe('40.0%')
  })

  test('spec axes left formatMethod converts to percent', () => {
    render(
      <MarketShareSection
        history={makeHistory()}
        rows={makeVendorRows()}
        period='week'
      />
    )
    const leftAxis = capturedSpec.axes.find((a: any) => a.orient === 'left')
    expect(leftAxis.label.formatMethod(0.5)).toBe('50%')
    expect(leftAxis.label.formatMethod(1)).toBe('100%')
  })
})
