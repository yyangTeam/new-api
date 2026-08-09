import { render, screen } from '@/test/test-utils'

import { Badge } from './badge'

describe('Badge', () => {
  test('renders with default variant', () => {
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  test('renders with secondary variant', () => {
    render(<Badge variant='secondary'>Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge.className).toContain('bg-secondary')
  })

  test('renders with destructive variant', () => {
    render(<Badge variant='destructive'>Destructive</Badge>)
    const badge = screen.getByText('Destructive')
    expect(badge.className).toContain('destructive')
  })

  test('renders with warning variant', () => {
    render(<Badge variant='warning'>Warning</Badge>)
    const badge = screen.getByText('Warning')
    expect(badge.className).toContain('warning')
  })

  test('renders with outline variant', () => {
    render(<Badge variant='outline'>Outline</Badge>)
    const badge = screen.getByText('Outline')
    expect(badge.className).toContain('border-border')
  })

  test('renders with ghost variant', () => {
    render(<Badge variant='ghost'>Ghost</Badge>)
    const badge = screen.getByText('Ghost')
    expect(badge.className).toContain('hover:bg-muted')
  })

  test('renders with link variant', () => {
    render(<Badge variant='link'>Link</Badge>)
    const badge = screen.getByText('Link')
    expect(badge.className).toContain('underline-offset-4')
  })

  test('applies custom className', () => {
    render(<Badge className='custom-badge'>Styled</Badge>)
    const badge = screen.getByText('Styled')
    expect(badge.className).toContain('custom-badge')
  })

  test('renders as span by default', () => {
    const { container } = render(<Badge>Span</Badge>)
    expect(container.querySelector('span')).toBeInTheDocument()
  })
})
