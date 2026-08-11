import { render, screen } from '@/test/test-utils'

vi.mock('@visactor/react-vchart', () => ({
  VChart: () => <div data-testid='vchart'>Chart</div>,
}))

vi.mock('@/context/theme-customization-provider', () => ({
  useThemeCustomization: () => ({
    customization: { preset: 'default', radius: '0.5rem' },
  }),
}))

vi.mock('@/lib/theme-radius', () => ({
  useThemeRadiusPx: () => 4,
}))

vi.mock('@/lib/use-chart-theme', () => ({
  useChartTheme: () => ({ resolvedTheme: 'light', themeReady: true }),
}))

vi.mock('@/lib/vchart', () => ({
  VCHART_OPTION: {},
}))

vi.mock('@/features/performance-metrics/lib/format', () => ({
  getSuccessRateColor: (v: number) => (v >= 99 ? '#10b981' : '#ef4444'),
}))

import {
  LatencyTrendChart,
  UptimeTrendChart,
  ThroughputBarChart,
} from '@/features/pricing/components/model-details-charts'

describe('LatencyTrendChart', () => {
  test('shows empty state when series is empty', () => {
    render(<LatencyTrendChart series={[]} />)
    expect(screen.getByText('No latency data available')).toBeInTheDocument()
  })

  test('renders chart when series has data', () => {
    render(
      <LatencyTrendChart
        series={[
          {
            timestamp: new Date().toISOString(),
            group: 'default',
            ttft_ms: 200,
          },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('renders with className', () => {
    const { container } = render(
      <LatencyTrendChart series={[]} className='custom-class' />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('UptimeTrendChart', () => {
  test('shows empty state when series is empty', () => {
    render(<UptimeTrendChart series={[]} />)
    expect(screen.getByText('No uptime data available')).toBeInTheDocument()
  })

  test('renders chart when series has data', () => {
    render(
      <UptimeTrendChart
        series={[
          {
            date: new Date().toISOString(),
            uptime_pct: 99.9,
            incidents: 0,
            outage_minutes: 0,
          },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('handles single data point by duplicating it', () => {
    render(
      <UptimeTrendChart
        series={[
          {
            date: '2024-01-01',
            uptime_pct: 100,
            incidents: 0,
            outage_minutes: 0,
          },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('handles series with date-only format', () => {
    render(
      <UptimeTrendChart
        series={[
          {
            date: '2024-01-01',
            uptime_pct: 99,
            incidents: 1,
            outage_minutes: 5,
          },
          {
            date: '2024-01-02',
            uptime_pct: 100,
            incidents: 0,
            outage_minutes: 0,
          },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('handles low uptime values', () => {
    render(
      <UptimeTrendChart
        series={[
          {
            date: '2024-01-01T12:00:00Z',
            uptime_pct: 50,
            incidents: 5,
            outage_minutes: 30,
          },
          {
            date: '2024-01-01T13:00:00Z',
            uptime_pct: 80,
            incidents: 2,
            outage_minutes: 10,
          },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('renders with className', () => {
    const { container } = render(
      <UptimeTrendChart series={[]} className='custom-class' />
    )
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('ThroughputBarChart', () => {
  test('returns null when rows are empty', () => {
    const { container } = render(<ThroughputBarChart rows={[]} />)
    expect(container.firstChild).toBeNull()
  })

  test('returns null when all throughput values are zero', () => {
    const { container } = render(
      <ThroughputBarChart
        rows={[{ group: 'default', throughput_tps: 0 }]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders chart when rows have positive throughput', () => {
    render(
      <ThroughputBarChart
        rows={[
          { group: 'default', throughput_tps: 25 },
          { group: 'premium', throughput_tps: 30 },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })

  test('filters out zero throughput rows', () => {
    render(
      <ThroughputBarChart
        rows={[
          { group: 'default', throughput_tps: 25 },
          { group: 'disabled', throughput_tps: 0 },
        ]}
      />
    )
    expect(screen.getByTestId('vchart')).toBeInTheDocument()
  })
})
