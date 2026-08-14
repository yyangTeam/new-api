import { render, screen } from '@/test/test-utils'

import { Spinner } from '@/components/ui/spinner'

describe('Spinner', () => {
  test('renders with loading status role', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  test('has loading aria-label', () => {
    render(<Spinner />)
    expect(
      screen.getByRole('status', { name: 'Loading' })
    ).toBeInTheDocument()
  })

  test('applies animate-spin class', () => {
    render(<Spinner />)
    const el = screen.getByRole('status')
    // HugeiconsIcon renders an SVG; under jsdom an SVG element's className
    // is an SVGAnimatedString (not a string), so read the class attribute.
    expect(el.getAttribute('class')).toContain('animate-spin')
  })

  test('applies custom className', () => {
    render(<Spinner className='size-8' />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('class')).toContain('size-8')
  })
})
