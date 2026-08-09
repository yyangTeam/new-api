import { render, screen } from '@/test/test-utils'

import { IconBadge } from './icon-badge'

describe('IconBadge', () => {
  test('renders children', () => {
    render(<IconBadge><span>Icon</span></IconBadge>)
    expect(screen.getByText('Icon')).toBeInTheDocument()
  })

  test('is aria-hidden by default', () => {
    const { container } = render(<IconBadge>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  test('respects decorative=false for non-decorative icons', () => {
    const { container } = render(<IconBadge decorative={false}>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el).toHaveAttribute('aria-hidden', 'false')
  })

  test('applies neutral tone by default', () => {
    const { container } = render(<IconBadge>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('bg-muted')
  })

  test('applies primary tone', () => {
    const { container } = render(<IconBadge tone='primary'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('text-primary')
  })

  test('applies success tone', () => {
    const { container } = render(<IconBadge tone='success'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('text-success')
  })

  test('applies warning tone', () => {
    const { container } = render(<IconBadge tone='warning'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('text-warning')
  })

  test('applies destructive tone', () => {
    const { container } = render(<IconBadge tone='destructive'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('text-destructive')
  })

  test('applies info tone', () => {
    const { container } = render(<IconBadge tone='info'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('text-info')
  })

  test('applies sm size', () => {
    const { container } = render(<IconBadge size='sm'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('size-7')
  })

  test('applies md size by default', () => {
    const { container } = render(<IconBadge>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('size-8')
  })

  test('applies lg size', () => {
    const { container } = render(<IconBadge size='lg'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('size-10')
  })

  test('applies xs size', () => {
    const { container } = render(<IconBadge size='xs'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('size-5')
  })

  test('applies custom className', () => {
    const { container } = render(<IconBadge className='my-icon'>I</IconBadge>)
    const el = container.firstElementChild!
    expect(el.className).toContain('my-icon')
  })
})
