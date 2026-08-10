import { render, screen } from '@/test/test-utils'

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './breadcrumb'

describe('Breadcrumb', () => {
  test('renders nav with aria-label', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'breadcrumb'
    )
  })

  test('renders with data-slot', () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(
      container.querySelector('[data-slot="breadcrumb"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Breadcrumb className='custom-bc'>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>X</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(
      container.querySelector('[data-slot="breadcrumb"]')
    ).toHaveClass('custom-bc')
  })
})

describe('BreadcrumbList', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Home</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(
      container.querySelector('[data-slot="breadcrumb-list"]')
    ).toBeInTheDocument()
  })
})

describe('BreadcrumbItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Item</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(
      container.querySelector('[data-slot="breadcrumb-item"]')
    ).toBeInTheDocument()
  })
})

describe('BreadcrumbPage', () => {
  test('renders with aria-current=page', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Current</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    const page = screen.getByText('Current')
    expect(page).toHaveAttribute('aria-current', 'page')
    expect(page).toHaveAttribute('aria-disabled', 'true')
    expect(page).toHaveAttribute('role', 'link')
  })
})

describe('BreadcrumbSeparator', () => {
  test('renders with aria-hidden', () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>A</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>B</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    const sep = container.querySelector('[data-slot="breadcrumb-separator"]')
    expect(sep).toHaveAttribute('aria-hidden', 'true')
    expect(sep).toHaveAttribute('role', 'presentation')
  })

  test('renders custom children as separator', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(screen.getByText('/')).toBeInTheDocument()
  })
})

describe('BreadcrumbEllipsis', () => {
  test('renders with aria-hidden and sr-only text', () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    const ellipsis = container.querySelector(
      '[data-slot="breadcrumb-ellipsis"]'
    )
    expect(ellipsis).toHaveAttribute('aria-hidden', 'true')
    expect(ellipsis).toHaveAttribute('role', 'presentation')
    expect(screen.getByText('More')).toBeInTheDocument()
  })
})
