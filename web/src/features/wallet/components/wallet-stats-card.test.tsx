import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { WalletStatsCard } from './wallet-stats-card'

vi.mock('@/components/ui/icon-badge', () => ({
  IconBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (quota: number) => `$${quota.toFixed(2)}`,
}))

vi.mock('lucide-react', () => ({
  Activity: () => <span data-testid="activity-icon" />,
  BarChart3: () => <span data-testid="barchart-icon" />,
  WalletCards: () => <span data-testid="wallet-icon" />,
}))

describe('WalletStatsCard', () => {
  it('renders loading skeletons when loading=true', () => {
    render(<WalletStatsCard user={null} loading={true} />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders stats when user data is provided', () => {
    const user = {
      id: 1,
      username: 'test',
      quota: 5000,
      used_quota: 2000,
      request_count: 150,
      aff_quota: 0,
      aff_history_quota: 0,
      aff_count: 0,
      group: 'default',
    }

    render(<WalletStatsCard user={user} />)
    expect(screen.getByText('$5000.00')).toBeInTheDocument()
    expect(screen.getByText('$2000.00')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('renders zero values when user is null', () => {
    render(<WalletStatsCard user={null} />)
    const zeroElements = screen.getAllByText('$0.00')
    expect(zeroElements.length).toBe(2) // Balance and Usage
    expect(screen.getByText('0')).toBeInTheDocument() // Request count
  })

  it('renders stat labels', () => {
    render(<WalletStatsCard user={null} />)
    expect(screen.getByText('Current Balance')).toBeInTheDocument()
    expect(screen.getByText('Total Usage')).toBeInTheDocument()
    expect(screen.getByText('API Requests')).toBeInTheDocument()
  })

  it('renders descriptions', () => {
    render(<WalletStatsCard user={null} />)
    expect(screen.getByText('Remaining quota')).toBeInTheDocument()
    expect(screen.getByText('Total consumed quota')).toBeInTheDocument()
    expect(screen.getByText('Total requests made')).toBeInTheDocument()
  })
})
