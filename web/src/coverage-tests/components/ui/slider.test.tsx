import { render } from '@/test/test-utils'

import { Slider } from '@/components/ui/slider'

describe('Slider', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Slider defaultValue={[50]} />)
    expect(
      container.querySelector('[data-slot="slider"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Slider defaultValue={[50]} className='custom-slider' />
    )
    expect(
      container.querySelector('[data-slot="slider"]')
    ).toHaveClass('custom-slider')
  })

  test('renders track', () => {
    const { container } = render(<Slider defaultValue={[50]} />)
    expect(
      container.querySelector('[data-slot="slider-track"]')
    ).toBeInTheDocument()
  })

  test('renders range indicator', () => {
    const { container } = render(<Slider defaultValue={[50]} />)
    expect(
      container.querySelector('[data-slot="slider-range"]')
    ).toBeInTheDocument()
  })

  test('renders thumb for single value', () => {
    const { container } = render(<Slider defaultValue={[50]} />)
    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]')
    expect(thumbs).toHaveLength(1)
  })

  test('renders two thumbs for range', () => {
    const { container } = render(<Slider defaultValue={[20, 80]} />)
    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]')
    expect(thumbs).toHaveLength(2)
  })

  test('uses min and max defaults to create two thumbs when no value provided', () => {
    const { container } = render(<Slider />)
    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]')
    expect(thumbs).toHaveLength(2)
  })

  test('renders with custom min and max', () => {
    const { container } = render(
      <Slider min={0} max={200} defaultValue={[100]} />
    )
    expect(
      container.querySelector('[data-slot="slider"]')
    ).toBeInTheDocument()
  })
})
