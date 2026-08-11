import { render } from '@/test/test-utils'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

describe('ToggleGroup', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ToggleGroup>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
        <ToggleGroupItem value='b'>B</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-slot="toggle-group"]')
    ).toBeInTheDocument()
  })

  test('renders with default horizontal orientation', () => {
    const { container } = render(
      <ToggleGroup>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-orientation="horizontal"]')
    ).toBeInTheDocument()
  })

  test('renders with vertical orientation', () => {
    const { container } = render(
      <ToggleGroup orientation='vertical'>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-orientation="vertical"]')
    ).toBeInTheDocument()
  })

  test('renders with variant', () => {
    const { container } = render(
      <ToggleGroup variant='outline'>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-variant="outline"]')
    ).toBeInTheDocument()
  })

  test('renders with size', () => {
    const { container } = render(
      <ToggleGroup size='sm'>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-size="sm"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ToggleGroup className='custom-tg'>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-slot="toggle-group"]')
    ).toHaveClass('custom-tg')
  })
})

describe('ToggleGroupItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <ToggleGroup>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(
      container.querySelector('[data-slot="toggle-group-item"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    const { container } = render(
      <ToggleGroup>
        <ToggleGroupItem value='a'>Item A</ToggleGroupItem>
      </ToggleGroup>
    )
    expect(container.textContent).toContain('Item A')
  })

  test('renders multiple items', () => {
    const { container } = render(
      <ToggleGroup>
        <ToggleGroupItem value='a'>A</ToggleGroupItem>
        <ToggleGroupItem value='b'>B</ToggleGroupItem>
        <ToggleGroupItem value='c'>C</ToggleGroupItem>
      </ToggleGroup>
    )
    const items = container.querySelectorAll('[data-slot="toggle-group-item"]')
    expect(items).toHaveLength(3)
  })
})
