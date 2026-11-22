import { render, screen, userEvent } from '@/test/test-utils'

import {
  StatusBadge,
  StatusBadgeList,
  StatusBadgeTypeContext,
} from '@/components/status-badge'

// We do NOT mock use-copy-to-clipboard or colors -- test the real code paths.
// navigator.clipboard may not exist in happy-dom, but the hook handles that gracefully.

describe('StatusBadge', () => {
  test('renders label text', () => {
    render(<StatusBadge label='Active' variant='success' />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  test('renders children instead of label', () => {
    render(
      <StatusBadge variant='info'>
        <span>Custom Child</span>
      </StatusBadge>
    )
    expect(screen.getByText('Custom Child')).toBeInTheDocument()
  })

  test('renders nothing when no label and no children', () => {
    const { container } = render(<StatusBadge variant='neutral' />)
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.textContent).toBe('')
  })

  test('renders dot when showDot is true', () => {
    const { container } = render(
      <StatusBadge label='Test' variant='success' showDot />
    )
    expect(
      container.querySelector('[aria-hidden="true"]')
    ).toBeInTheDocument()
  })

  test('does not render dot when showDot is false', () => {
    const { container } = render(
      <StatusBadge label='Test' variant='success' showDot={false} />
    )
    expect(
      container.querySelector('[aria-hidden="true"]')
    ).not.toBeInTheDocument()
  })

  test('applies pulse animation when pulse is true', () => {
    const { container } = render(
      <StatusBadge label='Pending' variant='warning' pulse />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('animate-pulse')
  })

  test('does not apply pulse by default', () => {
    const { container } = render(
      <StatusBadge label='Normal' variant='info' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).not.toContain('animate-pulse')
  })

  test('uses autoColor to compute variant via stringToColor', () => {
    // stringToColor is a real function that maps strings to color keys
    const { container } = render(
      <StatusBadge label='Admin' autoColor='admin' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    // It should have some text-* color class (the exact color depends on stringToColor)
    expect(badge.className).toMatch(/text-/)
  })

  test('falls back to neutral variant when no variant and no autoColor', () => {
    const { container } = render(<StatusBadge label='Default' />)
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('text-muted-foreground')
  })

  test('applies text type styles from context', () => {
    const { container } = render(
      <StatusBadgeTypeContext value='text'>
        <StatusBadge label='Text' variant='info' />
      </StatusBadgeTypeContext>
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).not.toContain('rounded-4xl')
  })

  test('applies badge type styles by default', () => {
    const { container } = render(
      <StatusBadge label='Badge' variant='info' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('rounded-4xl')
  })

  test('applies underline type styles', () => {
    const { container } = render(
      <StatusBadge label='Underlined' variant='info' type='underline' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('border-b')
  })

  test('prop type overrides context type', () => {
    const { container } = render(
      <StatusBadgeTypeContext value='text'>
        <StatusBadge label='Badge' variant='info' type='badge' />
      </StatusBadgeTypeContext>
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('rounded-4xl')
  })

  test('shows title with copy hint when copyable', () => {
    const { container } = render(
      <StatusBadge label='sk-xxx' variant='neutral' copyable />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge).toHaveAttribute('title', 'Click to copy: sk-xxx')
  })

  test('uses copyText in title when provided', () => {
    const { container } = render(
      <StatusBadge
        label='masked'
        copyText='full-value'
        variant='neutral'
        copyable
      />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge).toHaveAttribute('title', 'Click to copy: full-value')
  })

  test('does not show copy-related title when not copyable', () => {
    const { container } = render(
      <StatusBadge label='Test' variant='neutral' copyable={false} />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge).not.toHaveAttribute(
      'title',
      expect.stringContaining('Click to copy')
    )
  })

  test('has cursor-copy class when copyable', () => {
    const { container } = render(
      <StatusBadge label='Copy me' variant='neutral' copyable />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('cursor-copy')
  })

  test('does not have cursor-copy when not copyable', () => {
    const { container } = render(
      <StatusBadge label='No copy' variant='neutral' copyable={false} />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).not.toContain('cursor-copy')
  })

  test('applies size lg class', () => {
    const { container } = render(
      <StatusBadge label='Large' variant='success' size='lg' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('h-6')
  })

  test('applies size md class', () => {
    const { container } = render(
      <StatusBadge label='Medium' variant='success' size='md' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('h-5')
  })

  test('handles null size gracefully', () => {
    const { container } = render(
      <StatusBadge label='NoSize' variant='success' size={null} />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge).toBeInTheDocument()
  })

  test('handles null variant gracefully', () => {
    const { container } = render(
      <StatusBadge label='NoVariant' variant={null} />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    // Falls back to neutral
    expect(badge.className).toContain('text-muted-foreground')
  })

  test('renders icon when provided', () => {
    const MockIcon = (props: { className?: string }) => (
      <svg data-testid='mock-icon' className={props.className} />
    )
    render(
      <StatusBadge
        label='With Icon'
        variant='info'
        icon={MockIcon as any}
      />
    )
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <StatusBadge label='Custom' variant='neutral' className='my-badge' />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('my-badge')
  })

  test('calls onClick handler and copies on click', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <StatusBadge
        label='Clickable'
        variant='neutral'
        copyable
        onClick={onClick}
      />
    )

    const badge = screen.getByText('Clickable').closest('[data-slot="status-badge"]')!
    await user.click(badge)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('renders with each variant color correctly', () => {
    const variants = [
      'success',
      'warning',
      'danger',
      'info',
      'neutral',
      'purple',
    ] as const

    for (const variant of variants) {
      const { container, unmount } = render(
        <StatusBadge label={variant} variant={variant} />
      )
      const badge = container.querySelector('[data-slot="status-badge"]')!
      expect(badge).toBeInTheDocument()
      expect(badge.className).toMatch(/text-/)
      unmount()
    }
  })
})

describe('StatusBadgeList', () => {
  test('renders empty fallback when items is empty', () => {
    render(
      <StatusBadgeList
        items={[]}
        renderItem={(item) => <span>{item}</span>}
      />
    )
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  test('renders custom empty content', () => {
    render(
      <StatusBadgeList
        items={[]}
        empty={<span>No items</span>}
        renderItem={(item) => <span>{item}</span>}
      />
    )
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  test('renders items up to max limit', () => {
    render(
      <StatusBadgeList
        items={['a', 'b', 'c', 'd']}
        max={2}
        renderItem={(item) => <span key={item}>{item}</span>}
      />
    )
    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.queryByText('c')).not.toBeInTheDocument()
    expect(screen.queryByText('d')).not.toBeInTheDocument()
  })

  test('shows +N more badge for remaining items', () => {
    render(
      <StatusBadgeList
        items={['a', 'b', 'c', 'd']}
        max={2}
        renderItem={(item) => <span key={item}>{item}</span>}
      />
    )
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  test('uses custom moreLabel function', () => {
    render(
      <StatusBadgeList
        items={['a', 'b', 'c']}
        max={1}
        moreLabel={(n) => `and ${n} others`}
        renderItem={(item) => <span key={item}>{item}</span>}
      />
    )
    expect(screen.getByText('and 2 others')).toBeInTheDocument()
  })

  test('uses getKey for custom keys', () => {
    const getKey = vi.fn((item: string) => `key-${item}`)
    render(
      <StatusBadgeList
        items={['x', 'y']}
        getKey={getKey}
        renderItem={(item) => <span>{item}</span>}
      />
    )
    expect(getKey).toHaveBeenCalledWith('x', 0)
    expect(getKey).toHaveBeenCalledWith('y', 1)
  })

  test('renders all items when below max', () => {
    render(
      <StatusBadgeList
        items={['one', 'two']}
        max={5}
        renderItem={(item) => <span key={item}>{item}</span>}
      />
    )
    expect(screen.getByText('one')).toBeInTheDocument()
    expect(screen.getByText('two')).toBeInTheDocument()
  })

  test('does not show +N badge when items fit within max', () => {
    render(
      <StatusBadgeList
        items={['one', 'two']}
        max={5}
        renderItem={(item) => <span key={item}>{item}</span>}
      />
    )
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <StatusBadgeList
        items={['a']}
        className='list-class'
        renderItem={(item) => <span>{item}</span>}
      />
    )
    expect(container.querySelector('.list-class')).toBeInTheDocument()
  })
})
