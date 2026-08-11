import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { SubscriptionPlansCard } from '@/features/wallet/components/subscription-plans-card'
import type { TopupInfo } from '@/features/wallet/types'

const mockGetPublicPlans = vi.fn()
const mockGetSelfSubscriptionFull = vi.fn()
const mockUpdateBillingPreference = vi.fn()

vi.mock('@/features/subscriptions/api', () => ({
  getPublicPlans: () => mockGetPublicPlans(),
  getSelfSubscriptionFull: () => mockGetSelfSubscriptionFull(),
  updateBillingPreference: (pref: string) => mockUpdateBillingPreference(pref),
}))

vi.mock('@/features/subscriptions/components/dialogs/subscription-purchase-dialog', () => ({
  SubscriptionPurchaseDialog: ({ open }: any) =>
    open ? <div data-testid="purchase-dialog" /> : null,
}))

vi.mock('@/features/subscriptions/lib', () => ({
  formatDuration: () => '30 days',
  formatResetPeriod: () => 'Monthly',
}))

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({ label, variant, children }: any) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
      {children}
    </span>
  ),
  dotColorMap: { success: 'green', neutral: 'gray' },
  textColorMap: { success: 'text-green' },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress" data-value={value} />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div data-testid="select">{children}</div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value, disabled }: any) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/components/ui/titled-card', () => ({
  TitledCard: ({ children, title, description }: any) => (
    <div data-testid="titled-card">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ render: renderProp, children }: any) => (
    <div>
      {renderProp}
      {children}
    </div>
  ),
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (q: number) => `$${(q / 500000).toFixed(2)}`,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

vi.mock('lucide-react', () => ({
  Crown: () => <span />,
  RefreshCw: ({ className }: any) => (
    <span data-testid="refresh-icon" className={className} />
  ),
  Sparkles: () => <span />,
  Check: () => <span />,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const baseTopupInfo: TopupInfo = {
  enable_online_topup: true,
  enable_stripe_topup: false,
  pay_methods: [{ name: 'Alipay', type: 'alipay' }],
  min_topup: 1,
  stripe_min_topup: 5,
  amount_options: [10, 50],
  discount: {},
  enable_redemption: true,
}

const samplePlan = {
  plan: {
    id: 1,
    title: 'Basic Plan',
    subtitle: 'For individuals',
    price_amount: 9.99,
    total_amount: 500000,
    max_purchase_per_user: 3,
    duration: 30,
    duration_unit: 'day',
    reset_period: 'monthly',
    reset_period_count: 1,
    upgrade_group: '',
  },
}

const sampleActiveSub = {
  subscription: {
    id: 101,
    plan_id: 1,
    status: 'active',
    amount_total: 500000,
    amount_used: 100000,
    end_time: Math.floor(Date.now() / 1000) + 86400 * 30,
    next_reset_time: Math.floor(Date.now() / 1000) + 86400 * 7,
  },
}

const sampleExpiredSub = {
  subscription: {
    id: 102,
    plan_id: 1,
    status: 'active',
    amount_total: 500000,
    amount_used: 500000,
    end_time: Math.floor(Date.now() / 1000) - 86400,
    next_reset_time: 0,
  },
}

describe('SubscriptionPlansCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicPlans.mockResolvedValue({ success: true, data: [] })
    mockGetSelfSubscriptionFull.mockResolvedValue({
      success: true,
      data: {
        billing_preference: 'subscription_first',
        subscriptions: [],
        all_subscriptions: [],
      },
    })
  })

  it('renders loading skeletons initially', () => {
    // Don't resolve the promises yet
    mockGetPublicPlans.mockReturnValue(new Promise(() => {}))
    mockGetSelfSubscriptionFull.mockReturnValue(new Promise(() => {}))

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders null when no plans and no subscriptions', async () => {
    const { container } = render(
      <SubscriptionPlansCard topupInfo={baseTopupInfo} />
    )
    await waitFor(() => {
      expect(container.querySelector('[data-testid="skeleton"]')).toBeNull()
    })
    // Should render nothing when no plans and no subscriptions
    expect(container.querySelector('[data-testid="titled-card"]')).toBeNull()
  })

  it('renders plans when loaded', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Basic Plan')).toBeInTheDocument()
    })
    expect(screen.getByText('For individuals')).toBeInTheDocument()
    expect(screen.getByText('$9.99')).toBeInTheDocument()
  })

  it('renders plan benefits', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText(/Validity Period/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Total Quota/)).toBeInTheDocument()
  })

  it('renders Subscribe Now button', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Subscribe Now')).toBeInTheDocument()
    })
  })

  it('shows Limit Reached when purchase limit is hit', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })
    mockGetSelfSubscriptionFull.mockResolvedValue({
      success: true,
      data: {
        billing_preference: 'subscription_first',
        subscriptions: [],
        all_subscriptions: [
          { subscription: { plan_id: 1 } },
          { subscription: { plan_id: 1 } },
          { subscription: { plan_id: 1 } },
        ],
      },
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Limit Reached')).toBeInTheDocument()
    })
  })

  it('opens purchase dialog when Subscribe Now is clicked', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Subscribe Now')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Subscribe Now'))
    expect(screen.getByTestId('purchase-dialog')).toBeInTheDocument()
  })

  it('shows active subscriptions', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })
    mockGetSelfSubscriptionFull.mockResolvedValue({
      success: true,
      data: {
        billing_preference: 'subscription_first',
        subscriptions: [sampleActiveSub],
        all_subscriptions: [sampleActiveSub],
      },
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText(/Subscription #101/)).toBeInTheDocument()
    })
  })

  it('shows "No Active" when no active subscriptions', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('No Active')).toBeInTheDocument()
    })
  })

  it('shows "No plans available" text when plans array is empty but has subscriptions', async () => {
    mockGetSelfSubscriptionFull.mockResolvedValue({
      success: true,
      data: {
        billing_preference: 'wallet_first',
        subscriptions: [],
        all_subscriptions: [sampleExpiredSub],
      },
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('No plans available')).toBeInTheDocument()
    })
  })

  it('shows expired count when there are expired subs', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })
    mockGetSelfSubscriptionFull.mockResolvedValue({
      success: true,
      data: {
        billing_preference: 'subscription_first',
        subscriptions: [sampleActiveSub],
        all_subscriptions: [sampleActiveSub, sampleExpiredSub],
      },
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText(/1 expired/)).toBeInTheDocument()
    })
  })

  it('calls onAvailabilityChange', async () => {
    const onAvailabilityChange = vi.fn()
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(
      <SubscriptionPlansCard
        topupInfo={baseTopupInfo}
        onAvailabilityChange={onAvailabilityChange}
      />
    )

    await waitFor(() => {
      expect(onAvailabilityChange).toHaveBeenCalledWith(true)
    })
  })

  it('calls onAvailabilityChange(false) when no plans and no subs', async () => {
    const onAvailabilityChange = vi.fn()

    render(
      <SubscriptionPlansCard
        topupInfo={baseTopupInfo}
        onAvailabilityChange={onAvailabilityChange}
      />
    )

    await waitFor(() => {
      expect(onAvailabilityChange).toHaveBeenCalledWith(false)
    })
  })

  it('renders progress bar for active subscriptions with quota', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })
    mockGetSelfSubscriptionFull.mockResolvedValue({
      success: true,
      data: {
        billing_preference: 'subscription_first',
        subscriptions: [sampleActiveSub],
        all_subscriptions: [sampleActiveSub],
      },
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByTestId('progress')).toBeInTheDocument()
    })
  })

  it('handles getPublicPlans failure gracefully', async () => {
    mockGetPublicPlans.mockRejectedValue(new Error('Network error'))

    const { container } = render(
      <SubscriptionPlansCard topupInfo={baseTopupInfo} />
    )

    await waitFor(() => {
      expect(container.querySelector('[data-testid="skeleton"]')).toBeNull()
    })
  })

  it('handles getSelfSubscriptionFull failure gracefully', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })
    mockGetSelfSubscriptionFull.mockRejectedValue(new Error('Network error'))

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Basic Plan')).toBeInTheDocument()
    })
  })

  it('renders Recommended badge for first plan when multiple plans', async () => {
    const plan2 = {
      plan: { ...samplePlan.plan, id: 2, title: 'Pro Plan' },
    }
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan, plan2],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeInTheDocument()
    })
  })

  it('does not render Recommended badge when only one plan', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText('Basic Plan')).toBeInTheDocument()
    })
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument()
  })

  it('shows purchase limit info in benefits', async () => {
    mockGetPublicPlans.mockResolvedValue({
      success: true,
      data: [samplePlan],
    })

    render(<SubscriptionPlansCard topupInfo={baseTopupInfo} />)

    await waitFor(() => {
      expect(screen.getByText(/Purchase Limit/)).toBeInTheDocument()
    })
  })
})
