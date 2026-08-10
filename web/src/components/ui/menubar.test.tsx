import { render } from '@/test/test-utils'

import { Menubar } from './menubar'

describe('Menubar', () => {
  test('renders with data-slot', () => {
    const { container } = render(<Menubar />)
    expect(
      container.querySelector('[data-slot="menubar"]')
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<Menubar className='custom-mb' />)
    expect(
      container.querySelector('[data-slot="menubar"]')
    ).toHaveClass('custom-mb')
  })
})
