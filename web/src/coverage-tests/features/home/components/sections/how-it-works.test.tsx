import { render, screen } from '@testing-library/react'

vi.mock('@/components/animate-in-view', () => ({
  AnimateInView: ({ children, ...props }: any) => (
    <div data-testid='animate-in-view' {...props}>
      {children}
    </div>
  ),
}))

import { HowItWorks } from '@/features/home/components/sections/how-it-works'

describe('HowItWorks', () => {
  test('renders section heading', () => {
    render(<HowItWorks />)
    expect(screen.getByText('How It Works')).toBeInTheDocument()
    expect(screen.getByText('Three steps to get started')).toBeInTheDocument()
  })

  test('renders Configure step', () => {
    render(<HowItWorks />)
    expect(screen.getByText('Configure')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Add your API keys, set up channels and configure access permissions'
      )
    ).toBeInTheDocument()
  })

  test('renders Connect step', () => {
    render(<HowItWorks />)
    expect(screen.getByText('Connect')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Connect through OpenAI, Claude, Gemini, and other compatible API routes'
      )
    ).toBeInTheDocument()
  })

  test('renders Monitor step', () => {
    render(<HowItWorks />)
    expect(screen.getByText('Monitor')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Track usage, costs and performance with real-time analytics'
      )
    ).toBeInTheDocument()
  })

  test('renders step numbers 1, 2, 3', () => {
    render(<HowItWorks />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
