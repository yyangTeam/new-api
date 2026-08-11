import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { BillingHistoryDialog } from '@/features/wallet/components/dialogs/billing-history-dialog'
import type { TopupRecord } from '@/features/wallet/types'

const mockUseBillingHistory = vi.fn()
vi.mock('@/features/wallet/hooks/use-billing-history', () => ({
  useBillingHistory: () => mockUseBillingHistory(),
}))

vi.mock('@/components/dialog', () => ({
  Dialog: ({ children, open, title, description }: any) =>
    open ? (
      <div data-testid="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
    ) : null,
}))

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({ label, variant }: any) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="confirm-action">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, disabled }: any) => (
    <button disabled={disabled} data-testid="cancel-action">
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => null,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({
    copyToClipboard: vi.fn(),
    copiedText: null,
  }),
}))

vi.mock('@/lib/currency', () => ({
  formatCurrencyFromUSD: (amount: number) => `$${amount.toFixed(2)}`,
}))

vi.mock('@/lib/format', () => ({
  formatNumber: (n: number) => n.toString(),
}))

vi.mock('@/features/wallet/lib/billing', () => ({
  getStatusConfig: (status: string) => {
    const map: Record<string, any> = {
      success: { variant: 'success', label: 'Success' },
      pending: { variant: 'warning', label: 'Pending' },
      expired: { variant: 'danger', label: 'Expired' },
    }
    return map[status] || map.pending
  },
  getPaymentMethodName: (method: string) => {
    const names: Record<string, string> = {
      stripe: 'Stripe',
      alipay: 'Alipay',
    }
    return names[method] || method
  },
  formatTimestamp: (ts: number) => new Date(ts * 1000).toISOString(),
}))

vi.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  ChevronLeft: () => <span data-testid="chevron-left" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}))

const sampleRecords: TopupRecord[] = [
  {
    id: 1,
    user_id: 10,
    amount: 100,
    money: 95,
    trade_no: 'TRD001',
    payment_method: 'stripe',
    create_time: 1700000000,
    status: 'success',
  },
  {
    id: 2,
    user_id: 20,
    amount: 200,
    money: 180,
    trade_no: 'TRD002',
    payment_method: 'alipay',
    create_time: 1700100000,
    status: 'pending',
  },
]

function defaultHookReturn(overrides: Record<string, any> = {}) {
  return {
    records: [],
    total: 0,
    page: 1,
    pageSize: 10,
    keyword: '',
    loading: false,
    completing: false,
    isAdmin: false,
    handlePageChange: vi.fn(),
    handlePageSizeChange: vi.fn(),
    handleSearch: vi.fn(),
    handleCompleteOrder: vi.fn(),
    ...overrides,
  }
}

describe('BillingHistoryDialog', () => {
  beforeEach(() => {
    mockUseBillingHistory.mockReturnValue(defaultHookReturn())
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <BillingHistoryDialog open={false} onOpenChange={vi.fn()} />
    )
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull()
  })

  it('renders dialog with title when open', () => {
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Billing History')).toBeInTheDocument()
  })

  it('shows loading skeletons when loading', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ loading: true })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty state message when no records', () => {
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('No billing records found')).toBeInTheDocument()
    expect(
      screen.getByText('Your transaction history will appear here')
    ).toBeInTheDocument()
  })

  it('shows search hint when keyword is set but no records', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ keyword: 'abc' })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(
      screen.getByText('Try adjusting your search')
    ).toBeInTheDocument()
  })

  it('renders records with trade numbers', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ records: sampleRecords, total: 2 })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('TRD001')).toBeInTheDocument()
    expect(screen.getByText('TRD002')).toBeInTheDocument()
  })

  it('renders status badges for records', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ records: sampleRecords, total: 2 })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    const badges = screen.getAllByTestId('status-badge')
    expect(badges.length).toBe(2)
    expect(badges[0]).toHaveTextContent('Success')
    expect(badges[1]).toHaveTextContent('Pending')
  })

  it('renders payment method names', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ records: sampleRecords, total: 2 })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Stripe')).toBeInTheDocument()
    expect(screen.getByText('Alipay')).toBeInTheDocument()
  })

  it('renders amounts for records', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ records: sampleRecords, total: 2 })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('$200.00')).toBeInTheDocument()
  })

  it('renders money (payment) values for records', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ records: sampleRecords, total: 2 })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('180')).toBeInTheDocument()
  })

  it('shows admin-only User ID badge when isAdmin is true', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 2,
        isAdmin: true,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    // Each record with user_id should get a User ID status badge
    const badges = screen.getAllByTestId('status-badge')
    const userIdBadges = badges.filter((b) =>
      b.textContent?.includes('User ID')
    )
    expect(userIdBadges.length).toBe(2)
  })

  it('shows Complete Order button for admin on pending records', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 2,
        isAdmin: true,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    // Only TRD002 is pending
    const completeButtons = screen.getAllByText('Complete Order')
    expect(completeButtons.length).toBe(1)
  })

  it('does not show Complete Order button for non-admin', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 2,
        isAdmin: false,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Complete Order')).not.toBeInTheDocument()
  })

  it('opens confirm dialog when Complete Order is clicked', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 2,
        isAdmin: true,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Complete Order'))
    expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Are you sure you want to manually complete this order? The user will be credited with the corresponding quota.'
      )
    ).toBeInTheDocument()
  })

  it('calls handleCompleteOrder when confirm is clicked in alert dialog', async () => {
    const handleCompleteOrder = vi.fn().mockResolvedValue(true)
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 2,
        isAdmin: true,
        handleCompleteOrder,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Complete Order'))
    fireEvent.click(screen.getByTestId('confirm-action'))
    expect(handleCompleteOrder).toHaveBeenCalledWith('TRD002')
  })

  it('renders pagination when records exist', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 25,
        page: 1,
        pageSize: 10,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText(/1-10/)).toBeInTheDocument()
    expect(screen.getByText(/25/)).toBeInTheDocument()
  })

  it('does not render pagination when loading', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ loading: true })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Showing')).not.toBeInTheDocument()
  })

  it('does not render pagination when no records', () => {
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.queryByText('Showing')).not.toBeInTheDocument()
  })

  it('disables previous button on first page', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 25,
        page: 1,
        pageSize: 10,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    const prevButton = screen.getByTestId('chevron-left').closest('button')
    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last page', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 20,
        page: 2,
        pageSize: 10,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    const nextButton = screen.getByTestId('chevron-right').closest('button')
    expect(nextButton).toBeDisabled()
  })

  it('calls handlePageChange when next/prev buttons are clicked', () => {
    const handlePageChange = vi.fn()
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 30,
        page: 2,
        pageSize: 10,
        handlePageChange,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByTestId('chevron-left').closest('button')!)
    expect(handlePageChange).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByTestId('chevron-right').closest('button')!)
    expect(handlePageChange).toHaveBeenCalledWith(3)
  })

  it('calls handleSearch when search input changes', () => {
    const handleSearch = vi.fn()
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({ handleSearch })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    const input = screen.getByTestId('search-input')
    fireEvent.change(input, { target: { value: 'TRD' } })
    expect(handleSearch).toHaveBeenCalledWith('TRD')
  })

  it('disables confirm buttons when completing', () => {
    mockUseBillingHistory.mockReturnValue(
      defaultHookReturn({
        records: sampleRecords,
        total: 2,
        isAdmin: true,
        completing: true,
      })
    )
    render(<BillingHistoryDialog open={true} onOpenChange={vi.fn()} />)
    // Complete Order button should be disabled
    expect(screen.getByText('Complete Order')).toBeDisabled()
  })
})
