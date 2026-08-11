import { render } from '@/test/test-utils'

import { AspectRatio } from '@/components/ui/aspect-ratio'

describe('AspectRatio', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<AspectRatio ratio={16 / 9} />)
    expect(
      container.querySelector('[data-slot="aspect-ratio"]')
    ).toBeInTheDocument()
  })

  test('sets --ratio CSS variable', () => {
    const { container } = render(<AspectRatio ratio={16 / 9} />)
    const element = container.querySelector('[data-slot="aspect-ratio"]')
    expect(element).toHaveStyle({ '--ratio': `${16 / 9}` })
  })

  test('applies custom className', () => {
    const { container } = render(
      <AspectRatio ratio={4 / 3} className='custom-class' />
    )
    const element = container.querySelector('[data-slot="aspect-ratio"]')
    expect(element).toHaveClass('custom-class')
  })

  test('renders children', () => {
    const { container } = render(
      <AspectRatio ratio={1}>
        <img src='test.jpg' alt='test' />
      </AspectRatio>
    )
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  test('sets ratio=1 for square', () => {
    const { container } = render(<AspectRatio ratio={1} />)
    const element = container.querySelector('[data-slot="aspect-ratio"]')
    expect(element).toHaveStyle({ '--ratio': '1' })
  })
})
