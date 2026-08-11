import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/features/performance-metrics/lib/format', () => ({
  getSuccessRateDotClass: (rate: number) => rate >= 99 ? 'bg-green' : 'bg-red',
}))

import { ModelPerfBadge, type ModelPerfBadgeData } from '@/features/pricing/components/model-perf-badge'

describe('ModelPerfBadge', () => {
  test('returns null when perf is undefined', () => {
    const { container } = render(<ModelPerfBadge perf={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders latency, throughput, and status sections', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 500,
      success_rate: 99.5,
      avg_tps: 45,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    // Checks that the component renders with data (translated to "Lat.", "TPS", etc.)
    expect(container.textContent).toContain('Lat.')
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
    expect(container.textContent).toContain('3s')
  })

  test('formats throughput with t suffix', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 99,
      avg_tps: 42,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    expect(container.textContent).toContain('42t')
  })

  test('formats throughput with Kt suffix for >= 1000', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 99,
      avg_tps: 2500,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    expect(container.textContent).toContain('3Kt')
  })

  test('shows em dash for zero latency', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 0,
      success_rate: 99,
      avg_tps: 0,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    expect(container.textContent).toContain('—')
  })

  test('uses recent_success_rates for status bars when available', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 95,
      avg_tps: 10,
      recent_success_rates: [99, 98, 97],
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    const bars = container.querySelectorAll('.rounded-full')
    expect(bars.length).toBe(3)
  })

  test('shows fractional value for throughput < 1', () => {
    const perf: ModelPerfBadgeData = {
      avg_latency_ms: 100,
      success_rate: 99,
      avg_tps: 0.5,
    }
    const { container } = render(<ModelPerfBadge perf={perf} />)
    expect(container.textContent).toContain('0.5t')
  })
})
