import { render, screen } from '@/test/test-utils'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './pagination'

describe('Pagination', () => {
  test('renders nav with role=navigation', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  test('renders with aria-label=pagination', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByRole('navigation')).toHaveAttribute(
      'aria-label',
      'pagination'
    )
  })

  test('renders with data-slot', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <Pagination className='custom-pg'>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination"]')
    ).toHaveClass('custom-pg')
  })
})

describe('PaginationContent', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination-content"]')
    ).toBeInTheDocument()
  })
})

describe('PaginationItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination-item"]')
    ).toBeInTheDocument()
  })
})

describe('PaginationLink', () => {
  test('renders with data-slot', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination-link"]')
    ).toBeInTheDocument()
  })

  test('renders active state with aria-current=page', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#' isActive>
              1
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[aria-current="page"]')
    ).toBeInTheDocument()
  })

  test('renders inactive state without aria-current', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink href='#'>1</PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination-link"]')
    ).not.toHaveAttribute('aria-current')
  })
})

describe('PaginationPrevious', () => {
  test('renders with aria-label', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href='#' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      screen.getByLabelText('Go to previous page')
    ).toBeInTheDocument()
  })

  test('renders default text', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href='#' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByText('Previous')).toBeInTheDocument()
  })

  test('renders custom text', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href='#' text='Back' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByText('Back')).toBeInTheDocument()
  })
})

describe('PaginationNext', () => {
  test('renders with aria-label', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href='#' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      screen.getByLabelText('Go to next page')
    ).toBeInTheDocument()
  })

  test('renders default text', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationNext href='#' />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(screen.getByText('Next')).toBeInTheDocument()
  })
})

describe('PaginationEllipsis', () => {
  test('renders with aria-hidden', () => {
    const { container } = render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
    expect(
      container.querySelector('[data-slot="pagination-ellipsis"]')
    ).toBeInTheDocument()
    expect(screen.getByText('More pages')).toBeInTheDocument()
  })
})
