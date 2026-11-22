import { render } from '@/test/test-utils'

import { Separator } from '@/components/ui/separator'

describe('Separator', () => {
  test('renders with data-slot attribute', () => {
    const { container } = render(<Separator />)
    expect(
      container.querySelector('[data-slot="separator"]')
    ).toBeInTheDocument()
  })

  test('renders with horizontal orientation by default', () => {
    const { container } = render(<Separator />)
    const el = container.querySelector('[data-slot="separator"]')!
    expect(el).toHaveAttribute('role', 'separator')
  })

  test('applies custom className', () => {
    const { container } = render(<Separator className='my-sep' />)
    const el = container.querySelector('[data-slot="separator"]')!
    expect(el.className).toContain('my-sep')
  })

  test('renders with vertical orientation', () => {
    const { container } = render(<Separator orientation='vertical' />)
    const el = container.querySelector('[data-slot="separator"]')!
    expect(el).toHaveAttribute('aria-orientation', 'vertical')
  })
})
