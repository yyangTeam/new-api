import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { TransferDialog } from '@/features/wallet/components/dialogs/transfer-dialog'

vi.mock('@/components/dialog', () => ({
  Dialog: ({ children, open, title, description, footer }: any) =>
    open ? (
      <div data-testid="dialog">
        <div data-testid="dialog-title">{title}</div>
        <div data-testid="dialog-description">{description}</div>
        <div data-testid="dialog-body">{children}</div>
        <div data-testid="dialog-footer">{footer}</div>
      </div>
    ) : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, id, ...props }: any) => (
    <input
      data-testid={id || 'input'}
      value={value}
      onChange={onChange}
      {...props}
    />
  ),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (quota: number) => `$${(quota / 500000).toFixed(2)}`,
  parseQuotaFromDollars: (dollars: number) => dollars * 500000,
  quotaUnitsToDollars: (quota: number) => quota / 500000,
}))

const mockUseSystemConfigStore = vi.fn()
vi.mock('@/stores/system-config-store', () => ({
  useSystemConfigStore: (selector: any) => mockUseSystemConfigStore(selector),
  DEFAULT_CURRENCY_CONFIG: {
    quotaPerUnit: 500000,
    displayInCurrency: true,
    quotaDisplayType: 'USD',
    usdExchangeRate: 1,
    customCurrencySymbol: '$',
    customCurrencyExchangeRate: 1,
  },
}))

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => (
    <span data-testid="loader" className={className} />
  ),
}))

describe('TransferDialog', () => {
  beforeEach(() => {
    mockUseSystemConfigStore.mockImplementation((selector: any) =>
      selector({
        config: {
          currency: {
            quotaPerUnit: 500000,
          },
        },
      })
    )
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <TransferDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    expect(container.querySelector('[data-testid="dialog"]')).toBeNull()
  })

  it('renders dialog with title and description when open', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'Transfer Rewards'
    )
    expect(screen.getByTestId('dialog-description')).toHaveTextContent(
      'Move affiliate rewards to your main balance'
    )
  })

  it('displays available rewards quota', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    expect(screen.getByText('$10.00')).toBeInTheDocument()
  })

  it('shows transfer amount input', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    const input = screen.getByTestId('transfer-amount')
    expect(input).toBeInTheDocument()
  })

  it('shows minimum amount label', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    expect(screen.getByText(/Minimum:/)).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when cancel is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <TransferDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables buttons when transferring', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={true}
      />
    )
    expect(screen.getByText('Cancel')).toBeDisabled()
    // Transfer button should be disabled during transfer
    expect(screen.getByText('Transfer').closest('button')).toBeDisabled()
  })

  it('shows loader when transferring', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={true}
      />
    )
    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('updates amount when input changes', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    const input = screen.getByTestId('transfer-amount')
    fireEvent.change(input, { target: { value: '5' } })
    expect(input).toHaveValue(5)
  })

  it('renders Available Rewards and Transfer Amount labels', () => {
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        availableQuota={5000000}
        transferring={false}
      />
    )
    expect(screen.getByText('Available Rewards')).toBeInTheDocument()
    expect(screen.getByText('Transfer Amount')).toBeInTheDocument()
  })

  it('calls onConfirm with the calculated quota when transfer is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(true)
    render(
      <TransferDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        availableQuota={5000000}
        transferring={false}
      />
    )
    fireEvent.click(screen.getByText('Transfer'))
    expect(onConfirm).toHaveBeenCalled()
  })
})
