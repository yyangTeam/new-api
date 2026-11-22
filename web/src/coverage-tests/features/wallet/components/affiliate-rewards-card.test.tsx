import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { AffiliateRewardsCard } from '@/features/wallet/components/affiliate-rewards-card'
import type { UserWalletData } from '@/features/wallet/types'

vi.mock('@/components/copy-button', () => ({
  CopyButton: ({ value }: { value: string }) => (
    <button data-testid="copy-button" data-value={value}>Copy</button>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/icon-badge', () => ({
  IconBadge: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, readOnly }: { value?: string; readOnly?: boolean }) => (
    <input data-testid="affiliate-input" value={value} readOnly={readOnly} onChange={() => {}} />
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (quota: number) => `$${quota}`,
}))

vi.mock('lucide-react', () => ({
  Share2: () => <span data-testid="share-icon" />,
}))

describe('AffiliateRewardsCard', () => {
  const defaultUser: UserWalletData = {
    id: 1,
    username: 'test',
    quota: 5000,
    used_quota: 2000,
    request_count: 150,
    aff_quota: 500,
    aff_history_quota: 1000,
    aff_count: 5,
    group: 'default',
  }

  it('renders loading state', () => {
    render(
      <AffiliateRewardsCard
        user={null}
        affiliateLink=""
        onTransfer={vi.fn()}
        loading={true}
      />
    )
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders affiliate link in input', () => {
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com/sign-up?aff=ABC"
        onTransfer={vi.fn()}
      />
    )
    const input = screen.getByTestId('affiliate-input')
    expect(input).toHaveValue('http://example.com/sign-up?aff=ABC')
  })

  it('renders transfer button when user has rewards', () => {
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
      />
    )
    expect(screen.getByText('Transfer to Balance')).toBeInTheDocument()
  })

  it('does not render transfer button when user has no rewards', () => {
    const noRewardsUser = { ...defaultUser, aff_quota: 0 }
    render(
      <AffiliateRewardsCard
        user={noRewardsUser}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
      />
    )
    expect(screen.queryByText('Transfer to Balance')).not.toBeInTheDocument()
  })

  it('calls onTransfer when transfer button is clicked', () => {
    const onTransfer = vi.fn()
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com"
        onTransfer={onTransfer}
      />
    )
    fireEvent.click(screen.getByText('Transfer to Balance'))
    expect(onTransfer).toHaveBeenCalled()
  })

  it('disables transfer button when complianceConfirmed is false', () => {
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
        complianceConfirmed={false}
      />
    )
    const btn = screen.getByText('Transfer to Balance')
    expect(btn).toBeDisabled()
  })

  it('shows compliance warning when complianceConfirmed is false', () => {
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
        complianceConfirmed={false}
      />
    )
    expect(
      screen.getByText(/Referral reward transfer is disabled/)
    ).toBeInTheDocument()
  })

  it('does not show compliance warning when complianceConfirmed is true', () => {
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
        complianceConfirmed={true}
      />
    )
    expect(
      screen.queryByText(/Referral reward transfer is disabled/)
    ).not.toBeInTheDocument()
  })

  it('renders stats (Pending, Total Earned, Invites)', () => {
    render(
      <AffiliateRewardsCard
        user={defaultUser}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
      />
    )
    expect(screen.getByText('$500')).toBeInTheDocument()
    expect(screen.getByText('$1000')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders null user as zeros', () => {
    render(
      <AffiliateRewardsCard
        user={null}
        affiliateLink="http://example.com"
        onTransfer={vi.fn()}
      />
    )
    const zeroElements = screen.getAllByText('$0')
    expect(zeroElements.length).toBe(2) // Pending and Total Earned
    expect(screen.getByText('0')).toBeInTheDocument() // Invites
  })
})
