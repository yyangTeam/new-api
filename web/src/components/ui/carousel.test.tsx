import { render, screen } from '@/test/test-utils'

import { Carousel, CarouselContent, CarouselItem, useCarousel } from './carousel'

describe('Carousel', () => {
  test('renders with role=region and aria-roledescription', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
  })

  test('renders with data-slot', () => {
    const { container } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(
      container.querySelector('[data-slot="carousel"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Carousel className='custom-carousel'>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(
      container.querySelector('[data-slot="carousel"]')
    ).toHaveClass('custom-carousel')
  })
})

describe('CarouselContent', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(
      container.querySelector('[data-slot="carousel-content"]')
    ).toBeInTheDocument()
  })
})

describe('CarouselItem', () => {
  test('renders with role=group and aria-roledescription=slide', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    const slide = screen.getByRole('group')
    expect(slide).toHaveAttribute('aria-roledescription', 'slide')
  })

  test('renders with data-slot', () => {
    const { container } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(
      container.querySelector('[data-slot="carousel-item"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>My slide content</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(screen.getByText('My slide content')).toBeInTheDocument()
  })
})

describe('useCarousel', () => {
  test('throws when used outside Carousel', () => {
    function TestComponent() {
      useCarousel()
      return null
    }

    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestComponent />)).toThrow(
      'useCarousel must be used within a <Carousel />'
    )
    consoleSpy.mockRestore()
  })
})
