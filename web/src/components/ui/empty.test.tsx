import { render, screen } from '@/test/test-utils'

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty'

describe('Empty', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<Empty>Content</Empty>)
    expect(container.querySelector('[data-slot="empty"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<Empty>Empty state content</Empty>)
    expect(screen.getByText('Empty state content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Empty className='min-h-40'>X</Empty>)
    expect(container.querySelector('.min-h-40')).toBeInTheDocument()
  })
})

describe('EmptyHeader', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<EmptyHeader>H</EmptyHeader>)
    expect(
      container.querySelector('[data-slot="empty-header"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<EmptyHeader>Header Content</EmptyHeader>)
    expect(screen.getByText('Header Content')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <EmptyHeader className='gap-4'>H</EmptyHeader>
    )
    expect(container.querySelector('.gap-4')).toBeInTheDocument()
  })
})

describe('EmptyMedia', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<EmptyMedia>Icon</EmptyMedia>)
    expect(
      container.querySelector('[data-slot="empty-icon"]')
    ).toBeInTheDocument()
  })

  test('renders with default variant', () => {
    const { container } = render(<EmptyMedia>I</EmptyMedia>)
    const el = container.querySelector('[data-slot="empty-icon"]')!
    expect(el).toHaveAttribute('data-variant', 'default')
  })

  test('renders with icon variant', () => {
    const { container } = render(<EmptyMedia variant='icon'>I</EmptyMedia>)
    const el = container.querySelector('[data-slot="empty-icon"]')!
    expect(el).toHaveAttribute('data-variant', 'icon')
    expect(el.className).toContain('rounded-lg')
  })

  test('applies custom className', () => {
    const { container } = render(
      <EmptyMedia className='custom'>I</EmptyMedia>
    )
    expect(container.querySelector('.custom')).toBeInTheDocument()
  })
})

describe('EmptyTitle', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<EmptyTitle>Title</EmptyTitle>)
    expect(
      container.querySelector('[data-slot="empty-title"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<EmptyTitle>No Data Found</EmptyTitle>)
    expect(screen.getByText('No Data Found')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <EmptyTitle className='text-lg'>T</EmptyTitle>
    )
    expect(container.querySelector('.text-lg')).toBeInTheDocument()
  })
})

describe('EmptyDescription', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(
      <EmptyDescription>Desc</EmptyDescription>
    )
    expect(
      container.querySelector('[data-slot="empty-description"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<EmptyDescription>Try again later</EmptyDescription>)
    expect(screen.getByText('Try again later')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <EmptyDescription className='text-xs'>D</EmptyDescription>
    )
    expect(container.querySelector('.text-xs')).toBeInTheDocument()
  })
})

describe('EmptyContent', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<EmptyContent>C</EmptyContent>)
    expect(
      container.querySelector('[data-slot="empty-content"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(
      <EmptyContent>
        <button type='button'>Action</button>
      </EmptyContent>
    )
    expect(
      screen.getByRole('button', { name: 'Action' })
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <EmptyContent className='gap-4'>C</EmptyContent>
    )
    expect(container.querySelector('.gap-4')).toBeInTheDocument()
  })
})
