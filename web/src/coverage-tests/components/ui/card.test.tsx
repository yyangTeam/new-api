import { render, screen } from '@/test/test-utils'

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

describe('Card', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<Card>Content</Card>)
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<Card>Card body</Card>)
    expect(screen.getByText('Card body')).toBeInTheDocument()
  })

  test('applies default size', () => {
    const { container } = render(<Card>C</Card>)
    const card = container.querySelector('[data-slot="card"]')!
    expect(card).toHaveAttribute('data-size', 'default')
  })

  test('applies sm size', () => {
    const { container } = render(<Card size='sm'>C</Card>)
    const card = container.querySelector('[data-slot="card"]')!
    expect(card).toHaveAttribute('data-size', 'sm')
  })

  test('applies custom className', () => {
    const { container } = render(<Card className='w-full'>C</Card>)
    expect(container.querySelector('.w-full')).toBeInTheDocument()
  })
})

describe('CardHeader', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<CardHeader>H</CardHeader>)
    expect(
      container.querySelector('[data-slot="card-header"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<CardHeader>Header</CardHeader>)
    expect(screen.getByText('Header')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<CardTitle>Title</CardTitle>)
    expect(
      container.querySelector('[data-slot="card-title"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<CardTitle>My Card</CardTitle>)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })
})

describe('CardDescription', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<CardDescription>Desc</CardDescription>)
    expect(
      container.querySelector('[data-slot="card-description"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<CardDescription>Description text</CardDescription>)
    expect(screen.getByText('Description text')).toBeInTheDocument()
  })
})

describe('CardAction', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<CardAction>Act</CardAction>)
    expect(
      container.querySelector('[data-slot="card-action"]')
    ).toBeInTheDocument()
  })
})

describe('CardContent', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<CardContent>Body</CardContent>)
    expect(
      container.querySelector('[data-slot="card-content"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<CardContent>Content here</CardContent>)
    expect(screen.getByText('Content here')).toBeInTheDocument()
  })
})

describe('CardFooter', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>)
    expect(
      container.querySelector('[data-slot="card-footer"]')
    ).toBeInTheDocument()
  })

  test('renders children', () => {
    render(<CardFooter>Footer content</CardFooter>)
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })
})
