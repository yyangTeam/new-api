import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Wallet } from '@/features/wallet/index'
import type { UserWalletData } from '@/features/wallet/types'

// Mock all child components to isolate the Wallet orchestration logic
vi.mock('@/features/wallet/components/wallet-stats-card', () => ({
  WalletStatsCard: ({ user, loading }: any) => (
    <div data-testid="wallet-stats" data-loading={loading}>
      {user?.username || 'no-user'}
    </div>
  ),
}))

vi.mock('@/features/wallet/components/recharge-form-card', () => ({
  RechargeFormCard: ({
    topupAmount,
    paymentAmount,
    calculating,
    paymentLoading,
    redemptionCode,
    redeeming,
    loading,
    onSelectPreset,
    onTopupAmountChange,
    onPaymentMethodSelect,
    onRedemptionCodeChange,
    onRedeem,
    onOpenBilling,
    onCreemProductSelect,
    onWaffoMethodSelect,
  }: any) => (
    <div data-testid="recharge-form" data-loading={loading}>
      <span data-testid="topup-amount">{topupAmount}</span>
      <span data-testid="payment-amount">{paymentAmount}</span>
      <button
        data-testid="select-preset"
        onClick={() => onSelectPreset({ value: 50 })}
      >
        Preset
      </button>
      <button
        data-testid="change-amount"
        onClick={() => onTopupAmountChange(75)}
      >
        ChangeAmount
      </button>
      <button
        data-testid="select-payment"
        onClick={() =>
          onPaymentMethodSelect({ name: 'Stripe', type: 'stripe' })
        }
      >
        PayMethod
      </button>
      <button data-testid="do-redeem" onClick={onRedeem}>
        Redeem
      </button>
      <button data-testid="open-billing" onClick={onOpenBilling}>
        OpenBilling
      </button>
      {onCreemProductSelect && (
        <button
          data-testid="select-creem"
          onClick={() =>
            onCreemProductSelect({
              name: 'Pro',
              productId: 'prod_1',
              price: 29,
              quota: 500,
              currency: 'USD',
            })
          }
        >
          CreemProduct
        </button>
      )}
      {onWaffoMethodSelect && (
        <button
          data-testid="select-waffo"
          onClick={() =>
            onWaffoMethodSelect({ name: 'Waffo Card' }, 0)
          }
        >
          WaffoMethod
        </button>
      )}
    </div>
  ),
}))

vi.mock('@/features/wallet/components/subscription-plans-card', () => ({
  SubscriptionPlansCard: ({ onAvailabilityChange }: any) => {
    // Simulate calling onAvailabilityChange on mount
    if (onAvailabilityChange) {
      setTimeout(() => onAvailabilityChange(true), 0)
    }
    return <div data-testid="subscription-plans" />
  },
}))

vi.mock('@/features/wallet/components/affiliate-rewards-card', () => ({
  AffiliateRewardsCard: ({ user, onTransfer, loading }: any) => (
    <div data-testid="affiliate-card" data-loading={loading}>
      <button data-testid="transfer-btn" onClick={onTransfer}>
        Transfer
      </button>
    </div>
  ),
}))

vi.mock('@/features/wallet/components/dialogs/billing-history-dialog', () => ({
  BillingHistoryDialog: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="billing-dialog">
        <button onClick={() => onOpenChange(false)}>CloseBilling</button>
      </div>
    ) : null,
}))

vi.mock('@/features/wallet/components/dialogs/creem-confirm-dialog', () => ({
  CreemConfirmDialog: ({ open, onConfirm, product }: any) =>
    open ? (
      <div data-testid="creem-dialog">
        <span>{product?.name}</span>
        <button data-testid="confirm-creem" onClick={onConfirm}>
          ConfirmCreem
        </button>
      </div>
    ) : null,
}))

vi.mock('@/features/wallet/components/dialogs/payment-confirm-dialog', () => ({
  PaymentConfirmDialog: ({ open, onConfirm }: any) =>
    open ? (
      <div data-testid="payment-dialog">
        <button data-testid="confirm-payment" onClick={onConfirm}>
          ConfirmPayment
        </button>
      </div>
    ) : null,
}))

vi.mock('@/features/wallet/components/dialogs/transfer-dialog', () => ({
  TransferDialog: ({ open, onConfirm, onOpenChange }: any) =>
    open ? (
      <div data-testid="transfer-dialog">
        <button
          data-testid="confirm-transfer"
          onClick={() => onConfirm(100)}
        >
          ConfirmTransfer
        </button>
      </div>
    ) : null,
}))

vi.mock('@/components/layout', () => ({
  SectionPageLayout: Object.assign(
    ({ children }: any) => <div data-testid="layout">{children}</div>,
    {
      Title: ({ children }: any) => <h1>{children}</h1>,
      Content: ({ children }: any) => <div>{children}</div>,
    }
  ),
}))

// Mock hooks
const mockUseTopupInfo = vi.fn()
const mockUsePayment = vi.fn()
const mockUseAffiliate = vi.fn()
const mockUseRedemption = vi.fn()
const mockUseCreemPayment = vi.fn()
const mockUseWaffoPayment = vi.fn()
const mockUseWaffoPancakePayment = vi.fn()

vi.mock('@/features/wallet/hooks', () => ({
  useTopupInfo: () => mockUseTopupInfo(),
  usePayment: () => mockUsePayment(),
  useAffiliate: () => mockUseAffiliate(),
  useRedemption: () => mockUseRedemption(),
  useCreemPayment: () => mockUseCreemPayment(),
  useWaffoPayment: () => mockUseWaffoPayment(),
  useWaffoPancakePayment: () => mockUseWaffoPancakePayment(),
}))

vi.mock('@/features/wallet/lib', () => ({
  getDefaultPaymentType: () => 'alipay',
  getMinTopupAmount: () => 1,
  dispatchSelectedPayment: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/features/wallet/constants', () => ({
  DEFAULT_DISCOUNT_RATE: 1.0,
  PAYMENT_TYPES: {
    ALIPAY: 'alipay',
    WECHAT: 'wxpay',
    STRIPE: 'stripe',
    CREEM: 'creem',
    WAFFO: 'waffo',
    WAFFO_PANCAKE: 'waffo_pancake',
  },
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { price: 1 },
  }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    currency: {
      quotaDisplayType: 'USD',
      usdExchangeRate: 1,
    },
  }),
}))

const mockGetSelf = vi.fn()
vi.mock('@/lib/api', () => ({
  getSelf: () => mockGetSelf(),
}))

const sampleUser: UserWalletData = {
  id: 1,
  username: 'testuser',
  quota: 5000,
  used_quota: 2000,
  request_count: 150,
  aff_quota: 500,
  aff_history_quota: 1000,
  aff_count: 5,
  group: 'default',
}

describe('Wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSelf.mockResolvedValue({ success: true, data: sampleUser })
    mockUseTopupInfo.mockReturnValue({
      topupInfo: {
        enable_online_topup: true,
        enable_stripe_topup: false,
        pay_methods: [{ name: 'Alipay', type: 'alipay' }],
        min_topup: 1,
        stripe_min_topup: 5,
        amount_options: [10, 50],
        discount: {},
        enable_creem_topup: true,
        creem_products: [
          { name: 'Pro', productId: 'prod_1', price: 29, quota: 500, currency: 'USD' },
        ],
        enable_waffo_topup: true,
        waffo_pay_methods: [{ name: 'Waffo Card' }],
        waffo_min_topup: 1,
        enable_waffo_pancake_topup: false,
        enable_redemption: true,
        payment_compliance_confirmed: true,
      },
      presetAmounts: [{ value: 10 }, { value: 50 }],
      loading: false,
    })
    mockUsePayment.mockReturnValue({
      amount: 10,
      calculating: false,
      processing: false,
      calculatePaymentAmount: vi.fn(),
      processPayment: vi.fn().mockResolvedValue(true),
    })
    mockUseAffiliate.mockReturnValue({
      affiliateLink: 'https://example.com/sign-up?aff=ABC',
      loading: false,
      transferQuota: vi.fn().mockResolvedValue(true),
      transferring: false,
    })
    mockUseRedemption.mockReturnValue({
      redeeming: false,
      redeemCode: vi.fn().mockResolvedValue(true),
    })
    mockUseCreemPayment.mockReturnValue({
      processing: false,
      processCreemPayment: vi.fn().mockResolvedValue(true),
    })
    mockUseWaffoPayment.mockReturnValue({
      processing: false,
      processWaffoPayment: vi.fn().mockResolvedValue(true),
    })
    mockUseWaffoPancakePayment.mockReturnValue({
      processing: false,
      processWaffoPancakePayment: vi.fn().mockResolvedValue(true),
    })
  })

  it('renders the page title', () => {
    render(<Wallet />)
    expect(screen.getByText('Wallet')).toBeInTheDocument()
  })

  it('renders all main sections', async () => {
    render(<Wallet />)
    expect(screen.getByTestId('wallet-stats')).toBeInTheDocument()
    expect(screen.getByTestId('recharge-form')).toBeInTheDocument()
    expect(screen.getByTestId('subscription-plans')).toBeInTheDocument()
    expect(screen.getByTestId('affiliate-card')).toBeInTheDocument()
  })

  it('passes loading state to wallet stats while fetching user', () => {
    mockGetSelf.mockReturnValue(new Promise(() => {})) // never resolves
    render(<Wallet />)
    expect(screen.getByTestId('wallet-stats')).toHaveAttribute(
      'data-loading',
      'true'
    )
  })

  it('passes user data to wallet stats once loaded', async () => {
    render(<Wallet />)
    await waitFor(() => {
      expect(screen.getByTestId('wallet-stats')).toHaveTextContent('testuser')
    })
  })

  it('opens billing dialog when OpenBilling is clicked', () => {
    render(<Wallet />)
    fireEvent.click(screen.getByTestId('open-billing'))
    expect(screen.getByTestId('billing-dialog')).toBeInTheDocument()
  })

  it('opens transfer dialog when Transfer is clicked', () => {
    render(<Wallet />)
    fireEvent.click(screen.getByTestId('transfer-btn'))
    expect(screen.getByTestId('transfer-dialog')).toBeInTheDocument()
  })

  it('opens payment confirm dialog when payment method is selected', async () => {
    render(<Wallet />)
    // Wait for topup initialization
    await waitFor(() => {
      expect(screen.getByTestId('recharge-form')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('select-payment'))
    await waitFor(() => {
      expect(screen.getByTestId('payment-dialog')).toBeInTheDocument()
    })
  })

  it('opens creem dialog when creem product is selected', () => {
    render(<Wallet />)
    fireEvent.click(screen.getByTestId('select-creem'))
    expect(screen.getByTestId('creem-dialog')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('opens billing dialog when initialShowHistory is true', () => {
    render(<Wallet initialShowHistory={true} />)
    expect(screen.getByTestId('billing-dialog')).toBeInTheDocument()
  })

  it('handles getSelf failure gracefully', async () => {
    mockGetSelf.mockRejectedValue(new Error('Network error'))
    render(<Wallet />)
    await waitFor(() => {
      // Should still render without crashing
      expect(screen.getByTestId('wallet-stats')).toBeInTheDocument()
    })
  })

  it('passes topup loading to recharge form', () => {
    mockUseTopupInfo.mockReturnValue({
      topupInfo: null,
      presetAmounts: [],
      loading: true,
    })
    render(<Wallet />)
    expect(screen.getByTestId('recharge-form')).toHaveAttribute(
      'data-loading',
      'true'
    )
  })

  it('passes affiliate loading to affiliate card', () => {
    mockUseAffiliate.mockReturnValue({
      affiliateLink: '',
      loading: true,
      transferQuota: vi.fn(),
      transferring: false,
    })
    render(<Wallet />)
    expect(screen.getByTestId('affiliate-card')).toHaveAttribute(
      'data-loading',
      'true'
    )
  })
})
