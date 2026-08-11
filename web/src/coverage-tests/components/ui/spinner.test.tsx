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
    expect(el.className).toContain('animate-spin')
  })

  test('applies custom className', () => {
    render(<Spinner className='size-8' />)
    const el = screen.getByRole('status')
    expect(el.className).toContain('size-8')
  })
})
