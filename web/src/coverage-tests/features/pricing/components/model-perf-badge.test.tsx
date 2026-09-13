import { render } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/features/performance-metrics/lib/format', () => ({
  getSuccessRateDotClass: (rate: number) => rate >= 99 ? 'bg-green' : 'bg-red',
  formatLatency: vi.fn((ms: number) => {
    if (!Number.isFinite(ms) || ms <= 0) return '—'
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
    return `${Math.round(ms)}ms`
  }),
  formatThroughput: vi.fn((tps: number) => {
    if (!Number.isFinite(tps) || tps <= 0) return '—'
    if (tps >= 1000) return `${(tps / 1000).toFixed(1)}K t/s`
    return `${tps.toFixed(tps < 10 ? 2 : 1)} t/s`
  }),
}))

import { ModelPerfBadge, type ModelPerfBadgeData } from '@/features/pricing/components/model-perf-badge'

describe('ModelPerfBadge', () => {
  test('renders wrapper even when perf is undefined', () => {
    const { container } = render(<ModelPerfBadge perf={undefined} />)
    // The component always renders the wrapper div with children
    expect(container.firstChild).not.toBeNull()
  })

  test('renders latency, throughput, and status sections', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 500,
      success_rate: 99.5,
      avg_tps: 45,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // Uses translated keys; in test env i18n returns the key itself
    expect(container.textContent).toContain('Latency short')
  })

  test('formats latency in ms for values < 1000', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 350,
      success_rate: 99,
      avg_tps: 20,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    expect(container.textContent).toContain('350ms')
  })

  test('formats latency in seconds for values >= 1000', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 2500,
      success_rate: 99,
      avg_tps: 20,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    expect(container.textContent).toContain('2.50s')
  })

  test('formats throughput with t/s suffix', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 99,
      avg_tps: 42,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // formatThroughput returns "42.0 t/s", component strips the space: "42.0t/s"
    expect(container.textContent).toContain('42.0t/s')
  })

  test('formats throughput with Kt/s suffix for >= 1000', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 99,
      avg_tps: 2500,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // formatThroughput returns "2.5K t/s", component strips the space: "2.5Kt/s"
    expect(container.textContent).toContain('2.5Kt/s')
  })

  test('shows em dash for zero latency', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 0,
      success_rate: 99,
      avg_tps: 0,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // Zero latency shows "—s" (em dash + s)
    expect(container.textContent).toContain('—s')
  })

  test('renders 24 status bar slots', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 95,
      avg_tps: 10,
      recent_success_series: [
        { ts: 1, success_rate: 99 },
        { ts: 2, success_rate: 98 },
        { ts: 3, success_rate: 97 },
      ],
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // Always renders 24 status bar slots using rounded-xs class
    const bars = container.querySelectorAll('.rounded-xs')
    expect(bars.length).toBe(24)
  })

  test('shows fractional value for throughput < 1', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 99,
      avg_tps: 0.5,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // formatThroughput returns "0.50 t/s", component strips the space: "0.50t/s"
    expect(container.textContent).toContain('0.50t/s')
  })
})
