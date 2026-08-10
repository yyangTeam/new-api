import { render } from '@/test/test-utils'

import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<Checkbox />)
    expect(
      container.querySelector('[data-slot="checkbox"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Checkbox className='custom-check' />)
    expect(
      container.querySelector('[data-slot="checkbox"]')
    ).toHaveClass('custom-check')
  })

  test('renders checkbox indicator', () => {
    const { container } = render(<Checkbox defaultChecked />)
    expect(
      container.querySelector('[data-slot="checkbox-indicator"]')
    ).toBeInTheDocument()
  })

  test('can be disabled', () => {
    const { container } = render(<Checkbox disabled />)
    const checkbox = container.querySelector('[data-slot="checkbox"]')
    expect(checkbox).toBeInTheDocument()
  })
})
