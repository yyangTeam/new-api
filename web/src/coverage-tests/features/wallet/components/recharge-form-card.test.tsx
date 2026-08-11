import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { RechargeFormCard } from '@/features/wallet/components/recharge-form-card'
import type {
  TopupInfo,
  PresetAmount,
  PaymentMethod,
  CreemProduct,
  WaffoPayMethod,
} from '@/features/wallet/types'

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => (
    <div data-testid="alert" {...props}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/icon-badge', () => ({
  IconBadge: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, id, placeholder, ...props }: any) => (
    <input
      data-testid={id || 'input'}
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

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/components/ui/titled-card', () => ({
  TitledCard: ({ children, title, description, action }: any) => (
    <div data-testid="titled-card">
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ render: renderProp, children }: any) =>
    renderProp || children,
}))

vi.mock('@/lib/format', () => ({
  formatNumber: (n: number) => n.toLocaleString(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

vi.mock('@/features/wallet/lib', () => ({
  formatCurrency: (amount: number) =>
    Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '-',
  getDiscountLabel: (d: number) => (d < 1 ? `${Math.round((1 - d) * 100)}% OFF` : ''),
  getPaymentIcon: (type?: string) => (
    <span data-testid="pay-icon" data-type={type} />
  ),
  getMinTopupAmount: (info: any) => info?.min_topup || 1,
  calculatePresetPricing: (
    value: number,
    ratio: number,
    discount: number,
    exchangeRate: number
  ) => ({
    displayValue: value * (exchangeRate || 1),
    originalPrice: value * ratio,
    actualPrice: value * ratio * discount,
    savedAmount: value * ratio * (1 - discount),
    hasDiscount: discount < 1.0,
  }),
}))

vi.mock('@/features/wallet/components/creem-products-section', () => ({
  CreemProductsSection: ({ products, onProductSelect }: any) => (
    <div data-testid="creem-products">
      {products?.map((p: any) => (
        <button key={p.productId} onClick={() => onProductSelect(p)}>
          {p.name}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('lucide-react', () => ({
  Gift: () => <span />,
  ExternalLink: () => <span />,
  Loader2: () => <span data-testid="loader" />,
  Receipt: () => <span />,
  WalletCards: () => <span />,
}))

const baseTopupInfo: TopupInfo = {
  enable_online_topup: true,
  enable_stripe_topup: false,
  pay_methods: [
    { name: 'Alipay', type: 'alipay' },
    { name: 'Stripe', type: 'stripe' },
  ],
  min_topup: 1,
  stripe_min_topup: 5,
  amount_options: [10, 50, 100],
  discount: { 100: 0.9 },
  enable_redemption: true,
}

const presetAmounts: PresetAmount[] = [
  { value: 10 },
  { value: 50 },
  { value: 100, discount: 0.9 },
]

describe('RechargeFormCard', () => {
  const defaultProps = {
    topupInfo: baseTopupInfo,
    presetAmounts,
    selectedPreset: null as number | null,
    onSelectPreset: vi.fn(),
    topupAmount: 10,
    onTopupAmountChange: vi.fn(),
    paymentAmount: 10,
    calculating: false,
    onPaymentMethodSelect: vi.fn(),
    paymentLoading: null as string | null,
    redemptionCode: '',
    onRedemptionCodeChange: vi.fn(),
    onRedeem: vi.fn(),
    redeeming: false,
  }

  it('renders loading skeletons when loading=true', () => {
    render(<RechargeFormCard {...defaultProps} loading={true} />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders Add Funds title when loaded', () => {
    render(<RechargeFormCard {...defaultProps} />)
    expect(screen.getByText('Add Funds')).toBeInTheDocument()
  })

  it('renders preset amount buttons', () => {
    render(<RechargeFormCard {...defaultProps} />)
    // Each preset shows its display value
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('highlights selected preset', () => {
    render(<RechargeFormCard {...defaultProps} selectedPreset={50} />)
    // The selected preset should have the special class
    const buttons = screen.getAllByRole('button')
    const fiftyBtn = buttons.find((b) => b.textContent?.includes('50'))
    expect(fiftyBtn?.className).toContain('border-foreground')
  })

  it('calls onSelectPreset when a preset button is clicked', () => {
    const onSelectPreset = vi.fn()
    render(
      <RechargeFormCard
        {...defaultProps}
        onSelectPreset={onSelectPreset}
      />
    )
    const buttons = screen.getAllByRole('button')
    const tenBtn = buttons.find((b) => b.textContent?.includes('10'))
    if (tenBtn) fireEvent.click(tenBtn)
    expect(onSelectPreset).toHaveBeenCalled()
  })

  it('shows discount label for discounted presets', () => {
    render(<RechargeFormCard {...defaultProps} />)
    expect(screen.getByText('10% OFF')).toBeInTheDocument()
  })

  it('renders custom amount input', () => {
    render(<RechargeFormCard {...defaultProps} />)
    expect(screen.getByText('Custom Amount')).toBeInTheDocument()
    expect(screen.getByTestId('topup-amount')).toBeInTheDocument()
  })

  it('calls onTopupAmountChange when custom input changes', () => {
    const onTopupAmountChange = vi.fn()
    render(
      <RechargeFormCard
        {...defaultProps}
        onTopupAmountChange={onTopupAmountChange}
      />
    )
    fireEvent.change(screen.getByTestId('topup-amount'), {
      target: { value: '25' },
    })
    expect(onTopupAmountChange).toHaveBeenCalledWith(25)
  })

  it('shows skeleton when calculating payment amount', () => {
    render(<RechargeFormCard {...defaultProps} calculating={true} />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows payment amount when not calculating', () => {
    render(<RechargeFormCard {...defaultProps} paymentAmount={10} />)
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })

  it('renders payment method buttons', () => {
    render(<RechargeFormCard {...defaultProps} />)
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
    // Payment method names
    expect(
      screen.getAllByRole('button').find((b) => b.textContent?.includes('Alipay'))
    ).toBeTruthy()
  })

  it('calls onPaymentMethodSelect when payment method is clicked', () => {
    const onPaymentMethodSelect = vi.fn()
    render(
      <RechargeFormCard
        {...defaultProps}
        onPaymentMethodSelect={onPaymentMethodSelect}
      />
    )
    const alipayBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Alipay'))
    if (alipayBtn) fireEvent.click(alipayBtn)
    expect(onPaymentMethodSelect).toHaveBeenCalledWith(
      baseTopupInfo.pay_methods[0]
    )
  })

  it('disables payment buttons when paymentLoading is set', () => {
    render(
      <RechargeFormCard {...defaultProps} paymentLoading="alipay" />
    )
    const stripeBtn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Stripe'))
    expect(stripeBtn).toBeDisabled()
  })

  it('shows loader on the loading payment method', () => {
    render(
      <RechargeFormCard {...defaultProps} paymentLoading="alipay" />
    )
    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('shows redemption code section when enabled', () => {
    render(<RechargeFormCard {...defaultProps} />)
    expect(screen.getByText('Have a Code?')).toBeInTheDocument()
    expect(screen.getByTestId('redemption-code')).toBeInTheDocument()
    expect(screen.getByText('Redeem')).toBeInTheDocument()
  })

  it('calls onRedemptionCodeChange when code input changes', () => {
    const onRedemptionCodeChange = vi.fn()
    render(
      <RechargeFormCard
        {...defaultProps}
        onRedemptionCodeChange={onRedemptionCodeChange}
      />
    )
    fireEvent.change(screen.getByTestId('redemption-code'), {
      target: { value: 'ABC123' },
    })
    expect(onRedemptionCodeChange).toHaveBeenCalledWith('ABC123')
  })

  it('calls onRedeem when Redeem button is clicked', () => {
    const onRedeem = vi.fn()
    render(<RechargeFormCard {...defaultProps} onRedeem={onRedeem} />)
    fireEvent.click(screen.getByText('Redeem'))
    expect(onRedeem).toHaveBeenCalled()
  })

  it('disables redeem button when redeeming', () => {
    render(<RechargeFormCard {...defaultProps} redeeming={true} />)
    expect(screen.getByText('Redeem')).toBeDisabled()
  })

  it('shows topup link when provided', () => {
    render(
      <RechargeFormCard {...defaultProps} topupLink="https://buy.example.com" />
    )
    expect(screen.getByText('Need a redemption code?')).toBeInTheDocument()
    expect(screen.getByText('Get one here')).toBeInTheDocument()
    const link = screen.getByText('Get one here').closest('a')
    expect(link).toHaveAttribute('href', 'https://buy.example.com')
  })

  it('shows alert when topup is disabled', () => {
    const noTopupInfo: TopupInfo = {
      ...baseTopupInfo,
      enable_online_topup: false,
      enable_stripe_topup: false,
    }
    render(
      <RechargeFormCard
        {...defaultProps}
        topupInfo={noTopupInfo}
        enableCreemTopup={false}
        enableWaffoTopup={false}
        enableWaffoPancakeTopup={false}
      />
    )
    expect(
      screen.getByText(
        'Online topup is not enabled. Please use redemption code or contact administrator.'
      )
    ).toBeInTheDocument()
  })

  it('shows alert when no payment methods available', () => {
    const noMethods: TopupInfo = {
      ...baseTopupInfo,
      pay_methods: [],
    }
    render(
      <RechargeFormCard
        {...defaultProps}
        topupInfo={noMethods}
      />
    )
    expect(
      screen.getByText(
        'No payment methods available. Please contact administrator.'
      )
    ).toBeInTheDocument()
  })

  it('shows redemption disabled alert when enable_redemption is false', () => {
    const noRedemption: TopupInfo = {
      ...baseTopupInfo,
      enable_redemption: false,
    }
    render(
      <RechargeFormCard {...defaultProps} topupInfo={noRedemption} />
    )
    expect(
      screen.getByText(
        'Redemption codes are disabled until the administrator confirms compliance terms.'
      )
    ).toBeInTheDocument()
  })

  it('renders Order History button when onOpenBilling is provided', () => {
    const onOpenBilling = vi.fn()
    render(
      <RechargeFormCard {...defaultProps} onOpenBilling={onOpenBilling} />
    )
    fireEvent.click(screen.getByText('Order History'))
    expect(onOpenBilling).toHaveBeenCalled()
  })

  it('renders Creem products section when enabled', () => {
    const creemProducts: CreemProduct[] = [
      {
        name: 'Basic',
        productId: 'prod_1',
        price: 9.99,
        quota: 100,
        currency: 'USD',
      },
    ]
    render(
      <RechargeFormCard
        {...defaultProps}
        enableCreemTopup={true}
        creemProducts={creemProducts}
        onCreemProductSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Creem Payment')).toBeInTheDocument()
    expect(screen.getByTestId('creem-products')).toBeInTheDocument()
  })

  it('calls onCreemProductSelect when creem product is clicked', () => {
    const onCreemProductSelect = vi.fn()
    const creemProducts: CreemProduct[] = [
      {
        name: 'Basic',
        productId: 'prod_1',
        price: 9.99,
        quota: 100,
        currency: 'USD',
      },
    ]
    render(
      <RechargeFormCard
        {...defaultProps}
        enableCreemTopup={true}
        creemProducts={creemProducts}
        onCreemProductSelect={onCreemProductSelect}
      />
    )
    fireEvent.click(screen.getByText('Basic'))
    expect(onCreemProductSelect).toHaveBeenCalledWith(creemProducts[0])
  })

  it('renders Waffo payment methods when enabled', () => {
    const waffoMethods: WaffoPayMethod[] = [
      { name: 'Waffo Card', payMethodType: 'card' },
    ]
    render(
      <RechargeFormCard
        {...defaultProps}
        enableWaffoTopup={true}
        waffoPayMethods={waffoMethods}
        onWaffoMethodSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Waffo Payment')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button').find((b) => b.textContent?.includes('Waffo Card'))
    ).toBeTruthy()
  })

  it('calls onWaffoMethodSelect when waffo method is clicked', () => {
    const onWaffoMethodSelect = vi.fn()
    const waffoMethods: WaffoPayMethod[] = [
      { name: 'Waffo Card', payMethodType: 'card' },
    ]
    render(
      <RechargeFormCard
        {...defaultProps}
        enableWaffoTopup={true}
        waffoPayMethods={waffoMethods}
        onWaffoMethodSelect={onWaffoMethodSelect}
      />
    )
    const btn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Waffo Card'))
    if (btn) fireEvent.click(btn)
    expect(onWaffoMethodSelect).toHaveBeenCalledWith(waffoMethods[0], 0)
  })

  it('disables payment method button when topup below method min_topup', () => {
    const topupInfo: TopupInfo = {
      ...baseTopupInfo,
      pay_methods: [
        { name: 'HighMin', type: 'highmin', min_topup: 50 },
      ],
    }
    render(
      <RechargeFormCard
        {...defaultProps}
        topupInfo={topupInfo}
        topupAmount={10}
      />
    )
    const btn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('HighMin'))
    expect(btn).toBeDisabled()
  })

  it('shows Minimum label on disabled payment method', () => {
    const topupInfo: TopupInfo = {
      ...baseTopupInfo,
      pay_methods: [
        { name: 'HighMin', type: 'highmin', min_topup: 50 },
      ],
    }
    render(
      <RechargeFormCard
        {...defaultProps}
        topupInfo={topupInfo}
        topupAmount={10}
      />
    )
    expect(screen.getByText('Minimum: 50')).toBeInTheDocument()
  })

  it('disables waffo method when topup below waffoMinTopup', () => {
    const waffoMethods: WaffoPayMethod[] = [
      { name: 'Waffo Card', payMethodType: 'card' },
    ]
    render(
      <RechargeFormCard
        {...defaultProps}
        enableWaffoTopup={true}
        waffoPayMethods={waffoMethods}
        waffoMinTopup={100}
        topupAmount={10}
        onWaffoMethodSelect={vi.fn()}
      />
    )
    const btn = screen
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('Waffo Card'))
    expect(btn).toBeDisabled()
  })
})
