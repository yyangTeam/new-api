import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({ label }: { label: string }) => <span data-testid='status-badge'>{label}</span>,
}))

vi.mock('@/components/quota-details-popover', () => ({
  QuotaDetailsPopover: ({ children, triggerLabel }: { children: React.ReactNode; title: string; triggerLabel: string; details: unknown[] }) => (
    <div data-testid='quota-popover' data-trigger-label={triggerLabel}>
      {children}
    </div>
  ),
}))

vi.mock('@/lib/currency', () => ({
  formatQuotaWithCurrency: (v: number, opts?: { showSymbol?: boolean }) =>
    opts?.showSymbol === false ? String(v) : `$${v}`,
  getCurrencyDisplay: () => ({
    meta: { kind: 'currency', symbol: '$' },
  }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}))

vi.mock('@/stores/system-config-store', () => ({
  useSystemConfigStore: (selector: (state: unknown) => unknown) =>
    selector({ config: { currency: {} } }),
}))

import { UserQuotaCell } from '@/features/users/components/user-quota-cell'

describe('UserQuotaCell', () => {
  test('renders No Quota badge when both used and remaining are 0', () => {
    render(<UserQuotaCell used={0} remaining={0} />)
    expect(screen.getByText('No Quota')).toBeInTheDocument()
  })

  test('renders formatted remaining when has quota', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  test('renders used amount when has quota', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  test('renders Used amount label', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    expect(screen.getByText('Used amount')).toBeInTheDocument()
  })

  test('popover trigger label contains available balance info', () => {
    render(<UserQuotaCell used={50} remaining={150} />)
    const popover = screen.getByTestId('quota-popover')
    expect(popover.getAttribute('data-trigger-label')).toContain('150')
    expect(popover.getAttribute('data-trigger-label')).toContain('50')
  })

  test('renders No Quota badge (not quota display) when total is 0', () => {
    render(<UserQuotaCell used={0} remaining={0} />)
    expect(screen.getByTestId('status-badge')).toBeInTheDocument()
  })

  test('renders remaining even when 0 if used is positive', () => {
    render(<UserQuotaCell used={100} remaining={0} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  test('renders remaining when used is 0 but remaining is positive', () => {
    render(<UserQuotaCell used={0} remaining={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
