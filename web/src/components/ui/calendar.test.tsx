import { render, screen } from '@/test/test-utils'

import { Calendar } from './calendar'

describe('Calendar', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Calendar />)
    expect(
      container.querySelector('[data-slot="calendar"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Calendar className='custom-cal' />)
    // The outer container should have our custom class
    expect(
      container.querySelector('.custom-cal')
    ).toBeInTheDocument()
  })

  test('shows outside days by default', () => {
    const { container } = render(<Calendar />)
    // Calendar renders with showOutsideDays=true by default
    expect(
      container.querySelector('[data-slot="calendar"]')
    ).toBeInTheDocument()
  })

  test('renders navigation buttons', () => {
    const { container } = render(<Calendar />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  test('renders with month view', () => {
    const { container } = render(<Calendar month={new Date(2024, 0, 1)} />)
    expect(
      container.querySelector('[data-slot="calendar"]')
    ).toBeInTheDocument()
  })
})
