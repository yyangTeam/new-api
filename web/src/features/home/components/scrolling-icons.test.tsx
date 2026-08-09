import { render, screen } from '@testing-library/react'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (name: string, size: number) => (
    <span data-testid='lobe-icon' data-name={name} data-size={size} />
  ),
}))

import { ScrollingIcons } from './scrolling-icons'

describe('ScrollingIcons', () => {
  const icons = ['OpenAI', 'Claude', 'Gemini'] as const

  test('renders icon cards for each icon (duplicated for seamless loop)', () => {
    render(<ScrollingIcons icons={icons} />)
    // 3 original + 3 duplicates = 6
    const allIcons = screen.getAllByTestId('lobe-icon')
    expect(allIcons.length).toBe(6)
  })

  test('uses animate-scroll-up class for up direction', () => {
    const { container } = render(<ScrollingIcons icons={icons} direction='up' />)
    expect(container.querySelector('.animate-scroll-up')).toBeInTheDocument()
  })

  test('uses animate-scroll-down class for down direction', () => {
    const { container } = render(
      <ScrollingIcons icons={icons} direction='down' />
    )
    expect(container.querySelector('.animate-scroll-down')).toBeInTheDocument()
  })

  test('defaults to up direction', () => {
    const { container } = render(<ScrollingIcons icons={icons} />)
    expect(container.querySelector('.animate-scroll-up')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ScrollingIcons icons={icons} className='my-scroll' />
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('my-scroll')
  })

  test('has scroll-container class', () => {
    const { container } = render(<ScrollingIcons icons={icons} />)
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('scroll-container')
  })
})
