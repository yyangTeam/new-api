import { render, screen } from '@/test/test-utils'

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from './item'

describe('ItemGroup', () => {
  test('renders with role=list and data-slot', () => {
    render(<ItemGroup>Items</ItemGroup>)
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <ItemGroup className='custom-ig'>Items</ItemGroup>
    )
    expect(
      container.querySelector('[data-slot="item-group"]')
    ).toHaveClass('custom-ig')
  })
})

describe('ItemSeparator', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemSeparator />)
    expect(
      container.querySelector('[data-slot="item-separator"]')
    ).toBeInTheDocument()
  })
})

describe('Item', () => {
  test('renders with default variant and size', () => {
    const { container } = render(<Item>Content</Item>)
    expect(container.querySelector('[data-slot="item"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<Item>Item text</Item>)
    expect(screen.getByText('Item text')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Item className='item-custom'>C</Item>)
    expect(container.querySelector('[data-slot="item"]')).toHaveClass(
      'item-custom'
    )
  })
})

describe('ItemMedia', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemMedia>Icon</ItemMedia>)
    expect(
      container.querySelector('[data-slot="item-media"]')
    ).toBeInTheDocument()
  })

  test('renders with default variant', () => {
    const { container } = render(<ItemMedia>Icon</ItemMedia>)
    expect(
      container.querySelector('[data-variant="default"]')
    ).toBeInTheDocument()
  })

  test('renders with icon variant', () => {
    const { container } = render(
      <ItemMedia variant='icon'>Icon</ItemMedia>
    )
    expect(
      container.querySelector('[data-variant="icon"]')
    ).toBeInTheDocument()
  })

  test('renders with image variant', () => {
    const { container } = render(
      <ItemMedia variant='image'>Img</ItemMedia>
    )
    expect(
      container.querySelector('[data-variant="image"]')
    ).toBeInTheDocument()
  })
})

describe('ItemContent', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemContent>Content</ItemContent>)
    expect(
      container.querySelector('[data-slot="item-content"]')
    ).toBeInTheDocument()
  })
})

describe('ItemTitle', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemTitle>Title</ItemTitle>)
    expect(
      container.querySelector('[data-slot="item-title"]')
    ).toBeInTheDocument()
  })

  test('renders title text', () => {
    render(<ItemTitle>My Title</ItemTitle>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })
})

describe('ItemDescription', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemDescription>Desc</ItemDescription>)
    expect(
      container.querySelector('[data-slot="item-description"]')
    ).toBeInTheDocument()
  })
})

describe('ItemActions', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemActions>Actions</ItemActions>)
    expect(
      container.querySelector('[data-slot="item-actions"]')
    ).toBeInTheDocument()
  })
})

describe('ItemHeader', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemHeader>Header</ItemHeader>)
    expect(
      container.querySelector('[data-slot="item-header"]')
    ).toBeInTheDocument()
  })
})

describe('ItemFooter', () => {
  test('renders with data-slot', () => {
    const { container } = render(<ItemFooter>Footer</ItemFooter>)
    expect(
      container.querySelector('[data-slot="item-footer"]')
    ).toBeInTheDocument()
  })
})
