import { render, screen } from '@/test/test-utils'

import { BadgeCell } from '@/components/data-table/core/badge-cell'

describe('BadgeCell', () => {
  test('renders children', () => {
    render(<BadgeCell>Badge content</BadgeCell>)
    expect(screen.getByText('Badge content')).toBeInTheDocument()
  })

  test('renders with data-slot attribute', () => {
    const { container } = render(<BadgeCell>X</BadgeCell>)
    expect(
      container.querySelector('[data-slot="badge-cell"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <BadgeCell className='my-cell'>Y</BadgeCell>
    )
    expect(container.querySelector('.my-cell')).toBeInTheDocument()
  })

  test('passes through additional props', () => {
    const { container } = render(
      <BadgeCell data-testid='badge-cell'>Z</BadgeCell>
    )
    expect(container.querySelector('[data-testid="badge-cell"]')).toBeInTheDocument()
  })
})
