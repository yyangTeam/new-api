import { render, screen } from '@/test/test-utils'

import { Kbd, KbdGroup } from '@/components/ui/kbd'

describe('Kbd', () => {
  test('renders text content', () => {
    render(<Kbd>Ctrl</Kbd>)
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
  })

  test('renders with data-slot attribute', () => {
    const { container } = render(<Kbd>K</Kbd>)
    expect(
      container.querySelector('[data-slot="kbd"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<Kbd className='my-kbd'>Enter</Kbd>)
    const el = screen.getByText('Enter')
    expect(el.className).toContain('my-kbd')
  })

  test('renders as kbd element', () => {
    const { container } = render(<Kbd>Space</Kbd>)
    expect(container.querySelector('kbd')).toBeInTheDocument()
  })
})

describe('KbdGroup', () => {
  test('renders children', () => {
    render(
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    )
    expect(screen.getByText('Ctrl')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
  })

  test('renders with data-slot attribute', () => {
    const { container } = render(
      <KbdGroup>
        <Kbd>X</Kbd>
      </KbdGroup>
    )
    expect(
      container.querySelector('[data-slot="kbd-group"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <KbdGroup className='my-group'>
        <Kbd>A</Kbd>
      </KbdGroup>
    )
    expect(container.querySelector('.my-group')).toBeInTheDocument()
  })
})
