import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { PaymentConfirmDialog } from './payment-confirm-dialog'
import type { PaymentMethod } from '../../types'

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: any) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: any) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="confirm-btn">
      {children}
    </button>
  ),
  AlertDialogCancel: ({ children, disabled }: any) => (
    <button disabled={disabled} data-testid="cancel-btn">
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/lib/currency', () => ({
  formatLocalCurrencyAmount: (amount: number) => `$${amount.toFixed(2)}`,
}))

vi.mock('../../lib', () => ({
  formatCurrency: (amount: number) =>
    typeof amount === 'number' && Number.isFinite(amount)
      ? `$${amount.toFixed(2)}`
      : '-',
  getPaymentIcon: (type: string | undefined, className?: string) => (
    <span data-testid="payment-icon" data-type={type} />
  ),
}))

vi.mock('../../constants', () => ({
  DEFAULT_DISCOUNT_RATE: 1.0,
}))

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => (
    <span data-testid="loader" className={className} />
  ),
}))

const stripeMethod: PaymentMethod = {
  name: 'Stripe',
  type: 'stripe',
}

const alipayMethod: PaymentMethod = {
  name: 'Alipay',
  type: 'alipay',
}

describe('PaymentConfirmDialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <PaymentConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
      />
    )
    expect(container.querySelector('[data-testid="alert-dialog"]')).toBeNull()
  })

  it('renders dialog with title and description when open', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
      />
    )
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'Confirm Payment'
    )
    expect(screen.getByTestId('dialog-description')).toHaveTextContent(
      'Review your payment details'
    )
  })

  it('displays topup amount formatted with exchange rate', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={50}
        paymentAmount={50}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
        usdExchangeRate={2}
      />
    )
    // 50 * 2 = 100
    expect(screen.getByText('$100.00')).toBeInTheDocument()
  })

  it('displays payment amount when not calculating', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={75}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
      />
    )
    expect(screen.getByText('$75.00')).toBeInTheDocument()
  })

  it('shows skeleton when calculating', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={75}
        paymentMethod={stripeMethod}
        calculating={true}
        processing={false}
      />
    )
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('shows discount information when discount rate is applied', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={80}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
        discountRate={0.8}
      />
    )
    // originalAmount = 80 / 0.8 = 100, discountAmount = 100 - 80 = 20
    expect(screen.getByText('$20.00')).toBeInTheDocument() // savings
    expect(screen.getByText('You save')).toBeInTheDocument()
    // The strikethrough original amount ($100.00) should be present in addition to topup
    const allHundred = screen.getAllByText('$100.00')
    expect(allHundred.length).toBe(2) // topup amount + original price
  })

  it('does not show discount when rate is 1 (no discount)', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
        discountRate={1.0}
      />
    )
    expect(screen.queryByText('You save')).not.toBeInTheDocument()
  })

  it('does not show discount when paymentAmount is 0', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={0}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
        discountRate={0.8}
      />
    )
    expect(screen.queryByText('You save')).not.toBeInTheDocument()
  })

  it('hides discount section while calculating even if hasDiscount', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={80}
        paymentMethod={stripeMethod}
        calculating={true}
        processing={false}
        discountRate={0.8}
      />
    )
    expect(screen.queryByText('You save')).not.toBeInTheDocument()
  })

  it('renders payment method name and icon', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={alipayMethod}
        calculating={false}
        processing={false}
      />
    )
    expect(screen.getByText('Alipay')).toBeInTheDocument()
    expect(screen.getByTestId('payment-icon')).toHaveAttribute(
      'data-type',
      'alipay'
    )
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
      />
    )
    fireEvent.click(screen.getByTestId('confirm-btn'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('disables buttons when processing', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={true}
      />
    )
    expect(screen.getByTestId('confirm-btn')).toBeDisabled()
    expect(screen.getByTestId('cancel-btn')).toBeDisabled()
  })

  it('shows loader when processing', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={true}
      />
    )
    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('defaults usdExchangeRate to 1 when not provided', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={50}
        paymentAmount={50}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
      />
    )
    // 50 * 1 = 50, both topup and payment are $50.00
    const matches = screen.getAllByText('$50.00')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('renders labels for Topup Amount, You Pay, Payment Method', () => {
    render(
      <PaymentConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        topupAmount={100}
        paymentAmount={100}
        paymentMethod={stripeMethod}
        calculating={false}
        processing={false}
      />
    )
    expect(screen.getByText('Topup Amount')).toBeInTheDocument()
    expect(screen.getByText('You Pay')).toBeInTheDocument()
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
  })
})
