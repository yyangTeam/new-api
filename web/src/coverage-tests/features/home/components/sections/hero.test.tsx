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
      return <div data-testid='button'>{renderProp}{children}</div>
    }
    return <button {...props}>{children}</button>
  },
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(),
}))

vi.mock('@lobehub/icons', () => ({
  CherryStudio: { Color: (props: any) => <span data-testid='cherry-icon' /> },
}))

vi.mock('@/features/home/components/hero-terminal-demo', () => ({
  HeroTerminalDemo: (props: any) => <div data-testid='hero-terminal' />,
}))

import { useStatus } from '@/hooks/use-status'
import { Hero } from '@/features/home/components/sections/hero'

describe('Hero', () => {
  beforeEach(() => {
    vi.mocked(useStatus).mockReturnValue({
      status: { docs_link: 'https://docs.example.com' },
    } as any)
  })

  test('renders main heading', () => {
    render(<Hero />)
    expect(screen.getByText('Unified API Gateway for')).toBeInTheDocument()
    expect(screen.getByText('Vast Range of AI Models')).toBeInTheDocument()
  })

  test('renders description text', () => {
    render(<Hero />)
    expect(
      screen.getByText(
        'Access a vast selection of models via a standard, unified API protocol. Power AI applications, manage digital assets, and connect the Future.'
      )
    ).toBeInTheDocument()
  })

  test('renders Get Started and View Pricing when not authenticated', () => {
    render(<Hero isAuthenticated={false} />)
    expect(screen.getByText('Get Started')).toBeInTheDocument()
    expect(screen.getByText('View Pricing')).toBeInTheDocument()
  })

  test('renders Go to Dashboard when authenticated', () => {
    render(<Hero isAuthenticated={true} />)
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Get Started')).not.toBeInTheDocument()
  })

  test('renders Docs button', () => {
    render(<Hero />)
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  test('renders badge text', () => {
    render(<Hero />)
    expect(
      screen.getByText('AI Application Infrastructure Foundation')
    ).toBeInTheDocument()
  })

  test('renders Supported Applications section', () => {
    render(<Hero />)
    expect(screen.getByText('Supported Applications')).toBeInTheDocument()
  })

  test('renders Cherry Studio link', () => {
    render(<Hero />)
    expect(screen.getByText('Cherry Studio')).toBeInTheDocument()
  })

  test('renders CC Switch link', () => {
    render(<Hero />)
    expect(screen.getByText('CC Switch')).toBeInTheDocument()
  })

  test('renders More Apps text', () => {
    render(<Hero />)
    expect(screen.getByText('More Apps')).toBeInTheDocument()
  })

  test('renders hero terminal demo', () => {
    render(<Hero />)
    expect(screen.getByTestId('hero-terminal')).toBeInTheDocument()
  })

  test('renders internal docs link when docs_link is not external', () => {
    vi.mocked(useStatus).mockReturnValue({
      status: { docs_link: '/docs' },
    } as any)
    render(<Hero isAuthenticated={false} />)
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  test('uses default docs URL when status has no docs_link', () => {
    vi.mocked(useStatus).mockReturnValue({
      status: {},
    } as any)
    render(<Hero isAuthenticated={false} />)
    expect(screen.getByText('Docs')).toBeInTheDocument()
  })

  test('renders CC Switch img with onError handler', () => {
    render(<Hero />)
    const ccImg = screen.getByAltText('CC Switch')
    expect(ccImg).toBeInTheDocument()
    // Trigger the onError handler
    const event = { currentTarget: { style: { display: '' } }, } as any
    const nextSibling = document.createElement('span')
    nextSibling.style.display = 'none'
    Object.defineProperty(event.currentTarget, 'nextSibling', { value: nextSibling })
    ccImg.dispatchEvent(new Event('error'))
  })
})
