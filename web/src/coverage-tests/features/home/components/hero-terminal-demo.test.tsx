import { render, screen, fireEvent, act } from '@testing-library/react'

import { HeroTerminalDemo } from '@/features/home/components/hero-terminal-demo'

describe('HeroTerminalDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('renders first demo tab (Chat) as active by default', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByText('Responses')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
    expect(screen.getByText('Gemini')).toBeInTheDocument()
  })

  test('renders endpoint for first demo', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getByText('/v1/chat/completions')).toBeInTheDocument()
  })

  test('renders POST method badge', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getAllByText('POST').length).toBeGreaterThanOrEqual(1)
  })

  test('renders footer metrics', () => {
    const { container } = render(<HeroTerminalDemo />)
    // Footer metrics contains latency and token count values
    expect(container.textContent).toContain('142')
    expect(container.textContent).toContain('27')
  })

  test('renders 200 ok status', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getByText('200 ok')).toBeInTheDocument()
  })

  test('switches demo when tab is clicked', () => {
    render(<HeroTerminalDemo />)
    fireEvent.click(screen.getByText('Gemini'))
    // After transition timeout
    act(() => { vi.advanceTimersByTime(250) })
    expect(
      screen.getByText('/v1beta/models/{model}:generateContent')
    ).toBeInTheDocument()
  })

  test('clicking same tab does nothing', () => {
    render(<HeroTerminalDemo />)
    fireEvent.click(screen.getByText('Chat'))
    // Endpoint should remain the same
    expect(screen.getByText('/v1/chat/completions')).toBeInTheDocument()
  })

  test('auto-cycles through demos', () => {
    // The global test setup prefers reduced motion, which makes
    // HeroTerminalDemo skip the cycling interval entirely (the effect
    // early-returns when prefers-reduced-motion matches). Override matchMedia
    // so the auto-cycle effect runs; restoreMocks:true reverts this afterward.
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    render(<HeroTerminalDemo />)
    // First demo is Chat -> second is Responses
    act(() => { vi.advanceTimersByTime(4500 + 250) })
    expect(screen.getByText('/v1/responses')).toBeInTheDocument()
  })

  test('renders Request and Response section labels', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getByText('Request')).toBeInTheDocument()
    expect(screen.getByText('Response')).toBeInTheDocument()
  })

  test('renders curl command', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getByText('curl')).toBeInTheDocument()
  })

  test('renders stream/sse label', () => {
    render(<HeroTerminalDemo />)
    expect(screen.getByText('stream · sse')).toBeInTheDocument()
  })

  test('applies className prop', () => {
    const { container } = render(<HeroTerminalDemo className='my-class' />)
    expect(container.firstChild).toHaveClass('my-class')
  })
})
