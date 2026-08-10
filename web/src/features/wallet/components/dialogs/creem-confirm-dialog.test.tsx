import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { CreemConfirmDialog } from './creem-confirm-dialog'
import type { CreemProduct } from '../../types'

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

vi.mock('@/lib/format', () => ({
  formatNumber: (n: number) => n.toLocaleString(),
}))

vi.mock('../../lib/format', () => ({
  formatCreemPrice: (price: number, currency: string) =>
    `${currency === 'EUR' ? '€' : '$'}${price.toFixed(2)}`,
}))

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: any) => (
    <span data-testid="loader" className={className} />
  ),
}))

const product: CreemProduct = {
  name: 'Pro Plan',
  productId: 'prod_123',
  price: 29.99,
  quota: 500,
  currency: 'USD',
}

const euroProduct: CreemProduct = {
  name: 'Euro Plan',
  productId: 'prod_456',
  price: 19.99,
  quota: 200,
  currency: 'EUR',
}

describe('CreemConfirmDialog', () => {
  it('renders null when product is null', () => {
    const { container } = render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={null}
        processing={false}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      <CreemConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={false}
      />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders product details when open with product', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={false}
      />
    )
    expect(screen.getByText('Pro Plan')).toBeInTheDocument()
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('renders EUR product with euro symbol', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={euroProduct}
        processing={false}
      />
    )
    expect(screen.getByText('Euro Plan')).toBeInTheDocument()
    expect(screen.getByText('€19.99')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        product={product}
        processing={false}
      />
    )
    fireEvent.click(screen.getByText('Confirm Payment'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onOpenChange(false) when cancel button is clicked', () => {
    const onOpenChange = vi.fn()
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={vi.fn()}
        product={product}
        processing={false}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('disables buttons when processing', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={true}
      />
    )
    expect(screen.getByText('Cancel')).toBeDisabled()
    expect(screen.getByText('Confirm Payment').closest('button')).toBeDisabled()
  })

  it('shows loader spinner when processing', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={true}
      />
    )
    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('does not show loader spinner when not processing', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={false}
      />
    )
    expect(screen.queryByTestId('loader')).not.toBeInTheDocument()
  })

  it('renders dialog title and description', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={false}
      />
    )
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'Confirm Creem Purchase'
    )
    expect(screen.getByTestId('dialog-description')).toHaveTextContent(
      'Review your purchase details before proceeding.'
    )
  })

  it('displays Product, Price, and Quota labels', () => {
    render(
      <CreemConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        product={product}
        processing={false}
      />
    )
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Quota')).toBeInTheDocument()
  })
})
