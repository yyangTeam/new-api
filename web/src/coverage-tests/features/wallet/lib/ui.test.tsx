import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { getPaymentIcon } from '@/features/wallet/lib/ui'

vi.mock('lucide-react', () => ({
  CreditCard: (props: Record<string, unknown>) => (
    <span data-testid='credit-card' {...props} />
  ),
  Landmark: (props: Record<string, unknown>) => (
    <span data-testid='landmark' {...props} />
  ),
}))

vi.mock('@/components/react-icon-by-name', () => ({
  ReactIconByName: (props: {
    name: string
    className?: string
    title?: string
  }) => <span data-testid='react-icon-by-name' data-name={props.name} />,
}))

describe('getPaymentIcon', () => {
  it('returns CreditCard for undefined paymentType', () => {
    const icon = getPaymentIcon(undefined)
    const { container } = render(<div>{icon}</div>)
    expect(
      container.querySelector('[data-testid="credit-card"]')
    ).not.toBeNull()
  })

  it('returns the Alipay brand icon for alipay type', () => {
    const icon = getPaymentIcon('alipay')
    render(<div>{icon}</div>)
    expect(screen.getByRole('img', { name: 'Alipay' })).toBeInTheDocument()
  })

  it('returns the WeChat brand icon for wxpay type', () => {
    const icon = getPaymentIcon('wxpay')
    render(<div>{icon}</div>)
    expect(screen.getByRole('img', { name: 'WeChat' })).toBeInTheDocument()
  })

  it('returns the Stripe brand icon for stripe type', () => {
    const icon = getPaymentIcon('stripe')
    render(<div>{icon}</div>)
    expect(screen.getByRole('img', { name: 'Stripe' })).toBeInTheDocument()
  })

  it('returns Landmark for creem type', () => {
    const icon = getPaymentIcon('creem')
    const { container } = render(<div>{icon}</div>)
    expect(container.querySelector('[data-testid="landmark"]')).not.toBeNull()
  })

  it('returns CreditCard for waffo type', () => {
    const icon = getPaymentIcon('waffo')
    const { container } = render(<div>{icon}</div>)
    expect(
      container.querySelector('[data-testid="credit-card"]')
    ).not.toBeNull()
  })

  it('returns waffo pancake images for waffo_pancake type', () => {
    const icon = getPaymentIcon('waffo_pancake')
    const { container } = render(<div>{icon}</div>)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
    expect(imgs[0].getAttribute('src')).toBe('/waffo-logo-light.svg')
    expect(imgs[1].getAttribute('src')).toBe('/waffo-logo-dark.svg')
  })

  it('returns CreditCard for unknown payment type', () => {
    const icon = getPaymentIcon('bitcoin')
    const { container } = render(<div>{icon}</div>)
    expect(
      container.querySelector('[data-testid="credit-card"]')
    ).not.toBeNull()
  })

  it('renders https icon URL as img element', () => {
    const icon = getPaymentIcon(
      'alipay',
      'h-4 w-4',
      'https://example.com/icon.png'
    )
    const { container } = render(<div>{icon}</div>)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://example.com/icon.png')
  })

  it('rejects http: icon URL', () => {
    const icon = getPaymentIcon(
      'alipay',
      'h-4 w-4',
      'http://example.com/icon.png'
    )
    const { container } = render(<div>{icon}</div>)
    // Should not render an img for http
    const img = container.querySelector(
      'img[src="http://example.com/icon.png"]'
    )
    expect(img).toBeNull()
    // Should fall back to ReactIconByName since icon has a value
    expect(
      container.querySelector('[data-testid="react-icon-by-name"]')
    ).not.toBeNull()
  })

  it('rejects data: icon URL', () => {
    const icon = getPaymentIcon(
      'alipay',
      'h-4 w-4',
      'data:image/png;base64,abc'
    )
    const { container } = render(<div>{icon}</div>)
    expect(
      container.querySelector('[data-testid="react-icon-by-name"]')
    ).not.toBeNull()
  })

  it('rejects URL with userinfo', () => {
    const icon = getPaymentIcon(
      'alipay',
      'h-4 w-4',
      'https://user:pass@evil.com/icon.png'
    )
    const { container } = render(<div>{icon}</div>)
    // Should fall back to ReactIconByName
    expect(
      container.querySelector('[data-testid="react-icon-by-name"]')
    ).not.toBeNull()
  })

  it('renders ReactIconByName for non-URL icon string', () => {
    const icon = getPaymentIcon('alipay', 'h-4 w-4', 'FaCreditCard')
    const { container } = render(<div>{icon}</div>)
    const el = container.querySelector('[data-testid="react-icon-by-name"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('data-name')).toBe('FaCreditCard')
  })

  it('uses custom className', () => {
    const icon = getPaymentIcon('alipay', 'h-8 w-8')
    render(<div>{icon}</div>)
    expect(screen.getByRole('img', { name: 'Alipay' })).toHaveClass(
      'h-8',
      'w-8'
    )
  })

  it('passes altName to img when icon is https URL', () => {
    const icon = getPaymentIcon(
      'stripe',
      'h-4 w-4',
      'https://cdn.com/stripe.svg',
      'Stripe Pay'
    )
    const { container } = render(<div>{icon}</div>)
    const img = container.querySelector('img')
    expect(img?.getAttribute('alt')).toBe('Stripe Pay')
  })

  it('handles empty icon string (whitespace only)', () => {
    const icon = getPaymentIcon('alipay', 'h-4 w-4', '   ')
    render(<div>{icon}</div>)
    expect(screen.getByRole('img', { name: 'Alipay' })).toBeInTheDocument()
  })

  it('handles undefined icon', () => {
    const icon = getPaymentIcon('stripe', 'h-4 w-4', undefined)
    render(<div>{icon}</div>)
    expect(screen.getByRole('img', { name: 'Stripe' })).toBeInTheDocument()
  })
})
