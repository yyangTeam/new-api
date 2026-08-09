import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { CreemProductsSection } from './creem-products-section'
import type { CreemProduct } from '../types'

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, ...props }: any) => (
    <div data-testid="card" onClick={onClick} {...props}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}))

vi.mock('@/lib/format', () => ({
  formatNumber: (n: number) => n.toLocaleString(),
}))

vi.mock('../lib/format', () => ({
  formatCreemPrice: (price: number, currency: string) =>
    `${currency === 'EUR' ? '€' : '$'}${price.toFixed(2)}`,
}))

describe('CreemProductsSection', () => {
  const products: CreemProduct[] = [
    { name: 'Basic', productId: 'prod_1', price: 9.99, quota: 100, currency: 'USD' },
    { name: 'Pro', productId: 'prod_2', price: 29.99, quota: 500, currency: 'EUR' },
  ]

  it('renders loading skeletons when loading=true', () => {
    render(<CreemProductsSection products={[]} onProductSelect={vi.fn()} loading={true} />)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBe(3)
  })

  it('renders null when products is empty', () => {
    const { container } = render(
      <CreemProductsSection products={[]} onProductSelect={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders null when products is not an array', () => {
    const { container } = render(
      <CreemProductsSection products={null as any} onProductSelect={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders product cards with correct data', () => {
    render(<CreemProductsSection products={products} onProductSelect={vi.fn()} />)
    expect(screen.getByText('Basic')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('$9.99')).toBeInTheDocument()
    expect(screen.getByText('€29.99')).toBeInTheDocument()
  })

  it('calls onProductSelect when a product card is clicked', () => {
    const onSelect = vi.fn()
    render(<CreemProductsSection products={products} onProductSelect={onSelect} />)

    const cards = screen.getAllByTestId('card')
    fireEvent.click(cards[0])
    expect(onSelect).toHaveBeenCalledWith(products[0])

    fireEvent.click(cards[1])
    expect(onSelect).toHaveBeenCalledWith(products[1])
  })

  it('displays quota formatted', () => {
    render(<CreemProductsSection products={products} onProductSelect={vi.fn()} />)
    expect(screen.getByText(/100/)).toBeInTheDocument()
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })
})
