import { render, screen } from '@testing-library/react'

import { ConnectionLine } from '@/features/home/components/connection-line'

describe('ConnectionLine', () => {
  test('renders with default left direction', () => {
    const { container } = render(<ConnectionLine />)
    const inner = container.querySelector('.bg-gradient-to-r')
    expect(inner).toBeInTheDocument()
    expect(inner?.className).toContain('from-amber-500/60')
    expect(inner?.className).toContain('to-amber-500/20')
  })

  test('renders with left direction', () => {
    const { container } = render(<ConnectionLine direction='left' />)
    const inner = container.querySelector('.bg-gradient-to-r')
    expect(inner?.className).toContain('from-amber-500/60')
    expect(inner?.className).toContain('to-amber-500/20')
  })

  test('renders with right direction', () => {
    const { container } = render(<ConnectionLine direction='right' />)
    const inner = container.querySelector('.bg-gradient-to-r')
    expect(inner?.className).toContain('from-amber-500/20')
    expect(inner?.className).toContain('to-amber-500/60')
  })

  test('has hidden lg:block class', () => {
    const { container } = render(<ConnectionLine />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('hidden')
    expect(outer.className).toContain('lg:block')
  })
})
