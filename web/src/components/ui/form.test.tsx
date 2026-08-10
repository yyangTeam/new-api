import { render } from '@/test/test-utils'

import { FormItem } from './form'

describe('FormItem', () => {
  test('renders with data-slot', () => {
    const { container } = render(<FormItem>Content</FormItem>)
    expect(
      container.querySelector('[data-slot="form-item"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <FormItem className='custom-fi'>Content</FormItem>
    )
    expect(
      container.querySelector('[data-slot="form-item"]')
    ).toHaveClass('custom-fi')
  })
})
