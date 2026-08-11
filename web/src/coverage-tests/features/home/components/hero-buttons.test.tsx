import { render, screen } from '@testing-library/react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, render: renderProp, ...props }: any) => {
    if (renderProp) {
      // Clone renderProp element with children
      return <div data-testid='button'>{renderProp}{children}</div>
    }
    return <button {...props}>{children}</button>
  },
}))

import { HeroButtons } from '@/features/home/components/hero-buttons'

describe('HeroButtons', () => {
  test('renders Dashboard button when authenticated', () => {
    render(<HeroButtons isAuthenticated={true} />)
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
  })

  test('does not render Sign In/Get Started when authenticated', () => {
    render(<HeroButtons isAuthenticated={true} />)
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  test('renders Get Started and Sign In when not authenticated', () => {
    render(<HeroButtons isAuthenticated={false} />)
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  test('does not render Dashboard button when not authenticated', () => {
    render(<HeroButtons isAuthenticated={false} />)
    expect(screen.queryByText('Go to Dashboard')).not.toBeInTheDocument()
  })
})
