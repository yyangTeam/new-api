import { render } from '@/test/test-utils'

import { Toggle } from '@/components/ui/toggle'

describe('Toggle', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Toggle>Bold</Toggle>)
    expect(container.querySelector('[data-slot="toggle"]')).toBeInTheDocument()
  })

  test('renders with default variant', () => {
    const { container } = render(<Toggle>B</Toggle>)
    expect(container.querySelector('[data-slot="toggle"]')).toBeInTheDocument()
  })

  test('renders with outline variant', () => {
    const { container } = render(<Toggle variant='outline'>B</Toggle>)
    const toggle = container.querySelector('[data-slot="toggle"]')
    expect(toggle?.className).toContain('border')
  })

  test('renders with sm size', () => {
    const { container } = render(<Toggle size='sm'>B</Toggle>)
    const toggle = container.querySelector('[data-slot="toggle"]')
    expect(toggle?.className).toContain('h-7')
  })

  test('renders with lg size', () => {
    const { container } = render(<Toggle size='lg'>B</Toggle>)
    const toggle = container.querySelector('[data-slot="toggle"]')
    expect(toggle?.className).toContain('h-9')
  })

  test('applies custom className', () => {
    const { container } = render(<Toggle className='custom-toggle'>B</Toggle>)
    expect(container.querySelector('[data-slot="toggle"]')).toHaveClass(
      'custom-toggle'
    )
  })

  test('renders children', () => {
    const { container } = render(<Toggle>Bold text</Toggle>)
    expect(container.textContent).toContain('Bold text')
  })
})
