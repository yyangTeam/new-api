import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { TimingMetricsCell, StreamTpsCell } from '@/features/usage-logs/components/timing-metrics-cell'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('lucide-react', () => ({
  CircleAlert: () => <span data-testid='alert-icon' />,
}))

vi.mock('@/components/status-badge', () => ({
  dotColorMap: { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-neutral' },
  textColorMap: { success: 'text-success', warning: 'text-warning', danger: 'text-danger', neutral: 'text-neutral' },
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid='tooltip-content'>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <span data-testid='tooltip-trigger'>{children}</span>,
}))

vi.mock('@/lib/format', () => ({
  formatUseTime: (s: number) => `${s}s`,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/features/usage-logs/lib/format', () => ({
  getFirstResponseTimeColor: (s: number) => (s < 1 ? 'success' : 'warning'),
  getResponseTimeColor: (s: number) => (s < 5 ? 'success' : 'danger'),
}))

describe('TimingMetricsCell', () => {
  it('renders duration', () => {
    render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        isStream={false}
      />
    )
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('3s')).toBeInTheDocument()
  })

  it('does not show first token for non-stream', () => {
    render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        isStream={false}
      />
    )
    expect(screen.queryByText('First token')).not.toBeInTheDocument()
  })

  it('shows first token for stream', () => {
    render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        frtMs={500}
        isStream={true}
      />
    )
    expect(screen.getByText('First token')).toBeInTheDocument()
    expect(screen.getByText('0.5s')).toBeInTheDocument()
  })

  it('shows N/A when frtMs is not provided for stream', () => {
    render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        isStream={true}
      />
    )
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('shows N/A when frtMs is 0 for stream', () => {
    render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        frtMs={0}
        isStream={true}
      />
    )
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('renders with dot indicator', () => {
    const { container } = render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        isStream={true}
        frtMs={800}
        indicator='dot'
      />
    )
    // dot indicator should render small dot spans
    const dots = container.querySelectorAll('[aria-hidden]')
    expect(dots.length).toBeGreaterThanOrEqual(2)
  })

  it('renders with bar indicator by default', () => {
    const { container } = render(
      <TimingMetricsCell
        useTimeSec={3}
        completionTokens={100}
        isStream={true}
        frtMs={500}
      />
    )
    // bar should have gap-2 class
    expect(container.firstChild).toHaveClass('gap-2')
  })
})

describe('StreamTpsCell', () => {
  it('shows "Stream" label for stream', () => {
    render(<StreamTpsCell isStream={true} />)
    expect(screen.getByText('Stream')).toBeInTheDocument()
  })

  it('shows "Non-stream" label for non-stream', () => {
    render(<StreamTpsCell isStream={false} />)
    expect(screen.getByText('Non-stream')).toBeInTheDocument()
  })

  it('shows tokens per second', () => {
    render(<StreamTpsCell isStream={true} tokensPerSecond={45.7} />)
    expect(screen.getByText('46 t/s')).toBeInTheDocument()
  })

  it('shows dash when tokensPerSecond is null', () => {
    render(<StreamTpsCell isStream={true} tokensPerSecond={null} />)
    // em-dash
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows dash when tokensPerSecond is undefined', () => {
    render(<StreamTpsCell isStream={true} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows stream error indicator when status is not ok', () => {
    render(
      <StreamTpsCell
        isStream={true}
        streamStatus={{ status: 'error', end_reason: 'timeout', error_count: 2 }}
      />
    )
    expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument()
  })

  it('does not show error indicator when stream status is ok', () => {
    render(
      <StreamTpsCell
        isStream={true}
        streamStatus={{ status: 'ok' }}
      />
    )
    expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument()
  })

  it('does not show error indicator for non-stream', () => {
    render(
      <StreamTpsCell
        isStream={false}
        streamStatus={{ status: 'error' }}
      />
    )
    expect(screen.queryByTestId('alert-icon')).not.toBeInTheDocument()
  })
})
