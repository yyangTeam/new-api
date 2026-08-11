import { render, screen } from '@/test/test-utils'

import { AnimateInView } from '@/components/animate-in-view'

// Mock IntersectionObserver as a class
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()

class MockIntersectionObserver {
  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {}
}

beforeEach(() => {
  vi.clearAllMocks()
  globalThis.IntersectionObserver = MockIntersectionObserver as any
})

describe('AnimateInView', () => {
  test('renders children', () => {
    render(
      <AnimateInView>
        <p>Animated content</p>
      </AnimateInView>
    )
    expect(screen.getByText('Animated content')).toBeInTheDocument()
  })

  test('renders as div by default', () => {
    const { container } = render(
      <AnimateInView>
        <span>Child</span>
      </AnimateInView>
    )
    expect(container.querySelector('div')).toBeInTheDocument()
  })

  test('renders as specified tag', () => {
    const { container } = render(
      <AnimateInView as='section'>
        <span>Content</span>
      </AnimateInView>
    )
    expect(container.querySelector('section')).toBeInTheDocument()
  })

  test('renders as li tag', () => {
    const { container } = render(
      <AnimateInView as='li'>
        <span>Item</span>
      </AnimateInView>
    )
    expect(container.querySelector('li')).toBeInTheDocument()
  })

  test('renders as span tag', () => {
    const { container } = render(
      <AnimateInView as='span'>
        content
      </AnimateInView>
    )
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  test('applies opacity-0 class initially', () => {
    const { container } = render(
      <AnimateInView>
        <span>Hidden</span>
      </AnimateInView>
    )
    const el = container.firstElementChild!
    expect(el.className).toContain('opacity-0')
  })

  test('applies custom className', () => {
    const { container } = render(
      <AnimateInView className='my-animate'>
        <span>Content</span>
      </AnimateInView>
    )
    expect(container.querySelector('.my-animate')).toBeInTheDocument()
  })

  test('sets animation-delay when delay is provided', () => {
    const { container } = render(
      <AnimateInView delay={200}>
        <span>Delayed</span>
      </AnimateInView>
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.animationDelay).toBe('200ms')
  })

  test('does not set animation-delay when delay is 0', () => {
    const { container } = render(
      <AnimateInView delay={0}>
        <span>No delay</span>
      </AnimateInView>
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.style.animationDelay).toBe('')
  })

  test('observes the element with IntersectionObserver', () => {
    render(
      <AnimateInView>
        <span>Observed</span>
      </AnimateInView>
    )
    expect(mockObserve).toHaveBeenCalled()
  })

  test('respects prefers-reduced-motion', () => {
    vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { container } = render(
      <AnimateInView>
        <span>Reduced</span>
      </AnimateInView>
    )
    expect(mockObserve).not.toHaveBeenCalled()
    const el = container.firstElementChild!
    expect(el.className).not.toContain('opacity-0')
  })
})
