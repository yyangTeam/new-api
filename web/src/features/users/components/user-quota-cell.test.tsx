import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({ label }: { label: string }) => <span data-testid='status-badge'>{label}</span>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid='progress' data-value={value} />,
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, render: renderProp }: { children: React.ReactNode; render?: React.ReactNode }) => <div>{renderProp}{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid='tooltip-content'>{children}</div>,
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (v: number) => `$${v}`,
}))

import { UserQuotaCell } from './user-quota-cell'

describe('UserQuotaCell', () => {
  test('renders No Quota badge when total is 0', () => {
    render(<UserQuotaCell used={0} remaining={0} />)
    expect(screen.getByText('No Quota')).toBeInTheDocument()
  })

  test('renders formatted remaining when total > 0', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    expect(screen.getByText('$150')).toBeInTheDocument()
  })

  test('renders formatted total when total > 0', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    expect(screen.getByText('$200')).toBeInTheDocument()
  })

  test('renders progress bar with correct percentage', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    const progress = screen.getByTestId('progress')
    expect(progress.getAttribute('data-value')).toBe('75')
  })

  test('renders tooltip with used value', () => {
    render(<UserQuotaCell used={100} remaining={400} />)
    expect(screen.getByText(/Used:/)).toBeInTheDocument()
    expect(screen.getByText(/\$100/)).toBeInTheDocument()
  })

  test('renders tooltip with remaining value', () => {
    render(<UserQuotaCell used={100} remaining={400} />)
    expect(screen.getByText(/Remaining:/)).toBeInTheDocument()
  })

  test('renders tooltip with total value', () => {
    render(<UserQuotaCell used={100} remaining={400} />)
    expect(screen.getByText(/Total:/)).toBeInTheDocument()
  })

  test('renders tooltip with percentage', () => {
    render(<UserQuotaCell used={100} remaining={400} />)
    expect(screen.getByText(/Percentage:/)).toBeInTheDocument()
    expect(screen.getByText(/80\.0%/)).toBeInTheDocument()
  })

  test('progress is 0 when remaining is 0 and total > 0', () => {
    render(<UserQuotaCell used={100} remaining={0} />)
    const progress = screen.getByTestId('progress')
    expect(progress.getAttribute('data-value')).toBe('0')
  })

  test('progress is 100 when used is 0', () => {
    render(<UserQuotaCell used={0} remaining={100} />)
    const progress = screen.getByTestId('progress')
    expect(progress.getAttribute('data-value')).toBe('100')
  })
})
