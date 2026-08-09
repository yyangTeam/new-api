import { render, screen } from '@testing-library/react'

import { Stats } from './stats'

describe('Stats', () => {
  test('renders stat labels', () => {
    render(<Stats />)
    expect(screen.getByText('upstream services integrated')).toBeInTheDocument()
    expect(screen.getByText('model billing support')).toBeInTheDocument()
    expect(screen.getByText('compatible API routes')).toBeInTheDocument()
    expect(screen.getByText('scheduling controls')).toBeInTheDocument()
  })

  test('renders Counter components with suffixes', () => {
    const { container } = render(<Stats />)
    const counters = container.querySelectorAll('.tabular-nums')
    expect(counters.length).toBe(4)
  })

  test('renders four stat sections', () => {
    const { container } = render(<Stats />)
    const statDivs = container.querySelectorAll('.flex.flex-col.items-center')
    expect(statDivs.length).toBe(4)
  })

  test('Counter shows initial value with suffix', () => {
    const { container } = render(<Stats />)
    // Each Counter shows prefix + "0" + suffix initially
    const counters = container.querySelectorAll('.tabular-nums')
    expect(counters[0].textContent).toContain('0')
    expect(counters[0].textContent).toContain('+')
  })

  test('Counter shows final value when prefers-reduced-motion is enabled', () => {
    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { container } = render(<Stats />)
    const counters = container.querySelectorAll('.tabular-nums')
    // With reduced motion, Counter sets the final value immediately
    expect(counters[0].textContent).toContain('50')
    expect(counters[0].textContent).toContain('+')

    window.matchMedia = originalMatchMedia
  })
})
