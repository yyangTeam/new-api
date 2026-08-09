import { render, screen } from '@/test/test-utils'

import { GroupBadge } from './group-badge'

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({
    copiedText: null,
    copyToClipboard: vi.fn(),
  }),
}))

vi.mock('@/lib/colors', () => ({
  stringToColor: () => 'info',
}))

describe('GroupBadge', () => {
  test('renders "User Group" label for empty group', () => {
    render(<GroupBadge />)
    expect(screen.getByText('User Group')).toBeInTheDocument()
  })

  test('renders "Auto" label for auto group', () => {
    render(<GroupBadge group='auto' />)
    expect(screen.getByText('Auto')).toBeInTheDocument()
  })

  test('renders group name for non-special group', () => {
    render(<GroupBadge group='premium' />)
    expect(screen.getByText('premium')).toBeInTheDocument()
  })

  test('renders custom label override', () => {
    render(<GroupBadge group='premium' label='VIP Group' />)
    expect(screen.getByText('VIP Group')).toBeInTheDocument()
  })

  test('does not render ratio when not provided', () => {
    const { container } = render(<GroupBadge group='admin' />)
    expect(container.querySelector('.font-mono')).not.toBeInTheDocument()
  })

  test('renders ratio badge when provided', () => {
    render(<GroupBadge group='admin' ratio={1.5} />)
    expect(screen.getByText('1.5x')).toBeInTheDocument()
  })

  test('applies warning color for ratio > 1', () => {
    const { container } = render(<GroupBadge group='admin' ratio={2} />)
    const ratioEl = screen.getByText('2x').parentElement!
    expect(ratioEl.className).toContain('text-warning')
  })

  test('applies info color for ratio < 1', () => {
    const { container } = render(<GroupBadge group='admin' ratio={0.5} />)
    const ratioEl = screen.getByText('0.5x').parentElement!
    expect(ratioEl.className).toContain('text-info')
  })

  test('applies muted color for ratio = 1', () => {
    const { container } = render(<GroupBadge group='admin' ratio={1} />)
    const ratioEl = screen.getByText('1x').parentElement!
    expect(ratioEl.className).toContain('text-muted-foreground')
  })

  test('trims whitespace from group name', () => {
    render(<GroupBadge group='  spaced  ' />)
    expect(screen.getByText('spaced')).toBeInTheDocument()
  })

  test('treats whitespace-only group as empty', () => {
    render(<GroupBadge group='   ' />)
    expect(screen.getByText('User Group')).toBeInTheDocument()
  })

  test('uses neutral variant for special groups', () => {
    const { container } = render(<GroupBadge group='auto' />)
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('text-muted-foreground')
  })
})
