import { render } from '@/test/test-utils'

import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  test('renders a div with data-slot attribute', () => {
    const { container } = render(<Skeleton />)
    expect(
      container.querySelector('[data-slot="skeleton"]')
    ).toBeInTheDocument()
  })

  test('applies animate-pulse class', () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('[data-slot="skeleton"]')!
    expect(el.className).toContain('animate-pulse')
  })

  test('applies bg-muted class', () => {
    const { container } = render(<Skeleton />)
    const el = container.querySelector('[data-slot="skeleton"]')!
    expect(el.className).toContain('bg-muted')
  })

  test('applies custom className', () => {
    const { container } = render(<Skeleton className='h-4 w-20' />)
    const el = container.querySelector('[data-slot="skeleton"]')!
    expect(el.className).toContain('h-4')
    expect(el.className).toContain('w-20')
  })

  test('passes through additional props', () => {
    const { container } = render(<Skeleton data-testid='skel' />)
    expect(container.querySelector('[data-testid="skel"]')).toBeInTheDocument()
  })
})
