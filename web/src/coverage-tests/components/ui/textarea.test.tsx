import { render, screen } from '@/test/test-utils'

import { Textarea } from '@/components/ui/textarea'

describe('Textarea', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Textarea />)
    expect(
      container.querySelector('[data-slot="textarea"]')
    ).toBeInTheDocument()
  })

  test('renders textarea element', () => {
    render(<Textarea placeholder='Enter text' />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Textarea className='custom-ta' />)
    expect(container.querySelector('[data-slot="textarea"]')).toHaveClass(
      'custom-ta'
    )
  })

  test('can be disabled', () => {
    render(<Textarea disabled placeholder='Disabled' />)
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
  })

  test('accepts value', () => {
    render(<Textarea value='Hello' readOnly />)
    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument()
  })

  test('renders with rows attribute', () => {
    render(<Textarea rows={5} placeholder='Rows' />)
    expect(screen.getByPlaceholderText('Rows')).toHaveAttribute('rows', '5')
  })
})
