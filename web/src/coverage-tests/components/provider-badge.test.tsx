import { render, screen } from '@/test/test-utils'

import { ProviderBadge } from '@/components/provider-badge'

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({
    copiedText: null,
    copyToClipboard: vi.fn(),
  }),
}))

vi.mock('@/lib/colors', () => ({
  stringToColor: () => 'info',
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (key: string, size: number) =>
    key ? <span data-testid='lobe-icon'>{key}</span> : null,
}))

describe('ProviderBadge', () => {
  test('renders label text', () => {
    render(<ProviderBadge label='OpenAI' />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })

  test('renders icon when iconKey is provided', () => {
    render(<ProviderBadge label='OpenAI' iconKey='openai' />)
    expect(screen.getByTestId('lobe-icon')).toBeInTheDocument()
  })

  test('does not render icon when iconKey is null', () => {
    render(<ProviderBadge label='Custom' iconKey={null} />)
    expect(screen.queryByTestId('lobe-icon')).not.toBeInTheDocument()
  })

  test('does not render icon when iconKey is undefined', () => {
    render(<ProviderBadge label='Custom' />)
    expect(screen.queryByTestId('lobe-icon')).not.toBeInTheDocument()
  })

  test('uses autoColor when colorText is true (default)', () => {
    const { container } = render(<ProviderBadge label='Claude' />)
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('text-')
  })

  test('uses neutral variant when colorText is false', () => {
    const { container } = render(
      <ProviderBadge label='Claude' colorText={false} />
    )
    const badge = container.querySelector('[data-slot="status-badge"]')!
    expect(badge.className).toContain('text-muted-foreground')
  })

  test('applies custom className', () => {
    const { container } = render(
      <ProviderBadge label='Test' className='custom-provider' />
    )
    expect(container.querySelector('.custom-provider')).toBeInTheDocument()
  })

  test('renders data-slot attribute on wrapper', () => {
    const { container } = render(<ProviderBadge label='Test' />)
    expect(
      container.querySelector('[data-slot="provider-badge"]')
    ).toBeInTheDocument()
  })
})
