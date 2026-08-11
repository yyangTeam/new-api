import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render: renderProp }: { children: React.ReactNode; render?: React.ReactNode }) => <div>{renderProp || children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/features/performance-metrics/lib/format', () => ({
  formatUptimePct: (v: number) => `${v.toFixed(2)}%`,
  getSuccessRateDotClass: (rate: number) => rate >= 99 ? 'bg-green' : 'bg-red',
  getSuccessRateTextClass: (rate: number) => rate >= 99 ? 'text-green' : 'text-red',
}))

vi.mock('@/features/pricing/lib/mock-stats', () => ({
  aggregateUptime: (series: Array<{ uptime_pct: number; outage_minutes: number }>) => {
    const avg = series.length > 0 ? series.reduce((s, p) => s + p.uptime_pct, 0) / series.length : 0
    const outage = series.reduce((s, p) => s + p.outage_minutes, 0)
    return { uptime_pct: avg, incidents: series.filter(p => p.outage_minutes > 0).length, outage_minutes: outage }
  },
}))

import { UptimeSparkline, UptimeStatusRow } from '@/features/pricing/components/model-details-uptime-sparkline'

describe('UptimeSparkline', () => {
  test('renders empty label when series is empty', () => {
    const { container } = render(<UptimeSparkline series={[]} />)
    expect(container.textContent).toContain('—')
  })

  test('renders custom empty label when provided', () => {
    const { container } = render(<UptimeSparkline series={[]} emptyLabel='No data' />)
    expect(container.textContent).toContain('No data')
  })

  test('renders bars for each day in series', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 99.99, outage_minutes: 0 },
      { date: '2024-01-02', uptime_pct: 98.5, outage_minutes: 5 },
      { date: '2024-01-03', uptime_pct: 100, outage_minutes: 0 },
    ]
    const { container } = render(<UptimeSparkline series={series} />)
    const bars = container.querySelectorAll('[role="img"] > div')
    expect(bars.length).toBe(3)
  })

  test('shows overall percentage when showOverall is true (default)', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 99.5, outage_minutes: 0 },
    ]
    const { container } = render(<UptimeSparkline series={series} />)
    expect(container.textContent).toContain('99.5%')
  })

  test('hides overall percentage when showOverall is false', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 99.5, outage_minutes: 0 },
    ]
    const { container } = render(<UptimeSparkline series={series} showOverall={false} />)
    expect(container.textContent).not.toContain('99.5%')
  })

  test('renders with sm size class', () => {
    const series = [{ date: '2024-01-01', uptime_pct: 100, outage_minutes: 0 }]
    const { container } = render(<UptimeSparkline series={series} size='sm' />)
    expect(container.innerHTML).toContain('h-3.5')
  })
})

describe('UptimeStatusRow', () => {
  test('renders operational status text for high uptime', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 99.99, outage_minutes: 0 },
    ]
    const { container } = render(<UptimeStatusRow series={series} />)
    expect(container.textContent).toContain('All systems operational')
  })

  test('renders minor blips text for 99.0-99.9 uptime', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 99.5, outage_minutes: 2 },
    ]
    const { container } = render(<UptimeStatusRow series={series} />)
    expect(container.textContent).toContain('Minor blips')
  })

  test('renders degraded text for 95-99 uptime', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 96.0, outage_minutes: 30 },
    ]
    const { container } = render(<UptimeStatusRow series={series} />)
    expect(container.textContent).toContain('Degraded')
  })

  test('renders significant outages text for < 95 uptime', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 90.0, outage_minutes: 60 },
    ]
    const { container } = render(<UptimeStatusRow series={series} />)
    expect(container.textContent).toContain('outages')
  })

  test('shows outage minutes', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 98.0, outage_minutes: 15 },
    ]
    const { container } = render(<UptimeStatusRow series={series} />)
    expect(container.textContent).toContain('15')
  })

  test('shows incident count', () => {
    const series = [
      { date: '2024-01-01', uptime_pct: 98.0, outage_minutes: 10 },
      { date: '2024-01-02', uptime_pct: 97.0, outage_minutes: 20 },
    ]
    const { container } = render(<UptimeStatusRow series={series} />)
    expect(container.textContent).toContain('2')
    expect(container.textContent).toContain('incidents')
  })
})
