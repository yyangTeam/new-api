import { render, screen } from '@testing-library/react'

vi.mock('@/components/animate-in-view', () => ({
  AnimateInView: ({ children, ...props }: any) => (
    <div data-testid='animate-in-view' {...props}>
      {children}
    </div>
  ),
}))

import { Features } from '@/features/home/components/sections/features'

describe('Features', () => {
  test('renders Core Features label', () => {
    render(<Features />)
    expect(screen.getByText('Core Features')).toBeInTheDocument()
  })

  test('renders section heading', () => {
    const { container } = render(<Features />)
    const h2 = container.querySelector('h2')
    expect(h2?.textContent).toContain('Built for developers,')
    expect(h2?.textContent).toContain('designed for scale')
  })

  test('renders main features', () => {
    render(<Features />)
    expect(screen.getByText('Lightning Fast')).toBeInTheDocument()
    expect(screen.getByText('Secure & Reliable')).toBeInTheDocument()
    expect(screen.getByText('Global Coverage')).toBeInTheDocument()
    expect(screen.getByText('Developer Friendly')).toBeInTheDocument()
  })

  test('renders additional features', () => {
    render(<Features />)
    expect(screen.getByText('High Performance')).toBeInTheDocument()
    expect(screen.getByText('Transparent Billing')).toBeInTheDocument()
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Open Source')).toBeInTheDocument()
  })

  test('renders feature descriptions', () => {
    render(<Features />)
    expect(
      screen.getByText(
        'Optimized network architecture ensures millisecond response times'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Enterprise-grade security with comprehensive permission management'
      )
    ).toBeInTheDocument()
  })

  test('renders model names in visual section', () => {
    render(<Features />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('DeepSeek')).toBeInTheDocument()
  })

  test('renders Multi-protocol Compatible text', () => {
    render(<Features />)
    expect(screen.getByText('Multi-protocol Compatible')).toBeInTheDocument()
  })
})
