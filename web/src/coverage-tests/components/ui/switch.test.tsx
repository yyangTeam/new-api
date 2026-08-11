import { render } from '@/test/test-utils'

import { Switch } from '@/components/ui/switch'

describe('Switch', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Switch />)
    expect(
      container.querySelector('[data-slot="switch"]')
    ).toBeInTheDocument()
  })

  test('renders with default size', () => {
    const { container } = render(<Switch />)
    expect(
      container.querySelector('[data-size="default"]')
    ).toBeInTheDocument()
  })

  test('renders with sm size', () => {
    const { container } = render(<Switch size='sm' />)
    expect(
      container.querySelector('[data-size="sm"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Switch className='custom-switch' />)
    expect(
      container.querySelector('[data-slot="switch"]')
    ).toHaveClass('custom-switch')
  })

  test('renders thumb', () => {
    const { container } = render(<Switch />)
    expect(
      container.querySelector('[data-slot="switch-thumb"]')
    ).toBeInTheDocument()
  })

  test('can be disabled', () => {
    const { container } = render(<Switch disabled />)
    expect(
      container.querySelector('[data-slot="switch"]')
    ).toBeInTheDocument()
  })

  test('renders checked state', () => {
    const { container } = render(<Switch defaultChecked />)
    expect(
      container.querySelector('[data-slot="switch"]')
    ).toBeInTheDocument()
  })
})
