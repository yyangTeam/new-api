import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/animate-in-view', () => ({
  AnimateInView: ({ children, ...props }: any) => (
    <div data-testid='animate-in-view' {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, render: renderProp, ...props }: any) => {
    if (renderProp) {
      return <div data-testid='button'>{renderProp}{children}</div>
    }
    return <button {...props}>{children}</button>
  },
}))

import { CTA } from '@/features/home/components/sections/cta'

describe('CTA', () => {
  test('renders null when authenticated', () => {
    const { container } = render(<CTA isAuthenticated={true} />)
    expect(container.innerHTML).toBe('')
  })

  test('renders CTA section when not authenticated', () => {
    render(<CTA isAuthenticated={false} />)
    expect(screen.getByText('Ready to simplify')).toBeInTheDocument()
    expect(screen.getByText('your AI integration?')).toBeInTheDocument()
  })

  test('renders Get Started button', () => {
    render(<CTA isAuthenticated={false} />)
    expect(screen.getByText('Get Started')).toBeInTheDocument()
  })

  test('renders View Pricing button', () => {
    render(<CTA isAuthenticated={false} />)
    expect(screen.getByText('View Pricing')).toBeInTheDocument()
  })

  test('renders description text', () => {
    render(<CTA isAuthenticated={false} />)
    expect(
      screen.getByText(
        'Deploy your own gateway and start routing requests through your configured upstream services.'
      )
    ).toBeInTheDocument()
  })

  test('renders when isAuthenticated is undefined (defaults to showing)', () => {
    render(<CTA />)
    expect(screen.getByText('Ready to simplify')).toBeInTheDocument()
  })
})
