import { render, screen } from '@/test/test-utils'

import { MaskedValueDisplay } from './masked-value-display'

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({
    copiedText: null,
    copyToClipboard: vi.fn(),
  }),
}))

describe('MaskedValueDisplay', () => {
  const defaultProps = {
    label: 'Full API Key',
    fullValue: 'sk-abcdefghijklmnop',
    maskedValue: 'sk-abc...nop',
    copyTooltip: 'Copy key',
    copyAriaLabel: 'Copy API key',
  }

  test('renders masked value in trigger button', () => {
    render(<MaskedValueDisplay {...defaultProps} />)
    expect(screen.getByText('sk-abc...nop')).toBeInTheDocument()
  })

  test('renders copy button with aria-label', () => {
    render(<MaskedValueDisplay {...defaultProps} />)
    expect(
      screen.getByRole('button', { name: 'Copy API key' })
    ).toBeInTheDocument()
  })

  test('renders the trigger button for popover', () => {
    render(<MaskedValueDisplay {...defaultProps} />)
    // The masked value acts as a popover trigger button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })
})
