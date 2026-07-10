import { render, screen, userEvent } from '@/test/test-utils'

import { CopyButton } from './copy-button'

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

describe('CopyButton', () => {
  test('renders with default copy aria-label', () => {
    render(<CopyButton value='test' />)
    expect(
      screen.getByRole('button', { name: 'Copy to clipboard' })
    ).toBeInTheDocument()
  })

  test('copies value and shows copied state on click', async () => {
    const user = userEvent.setup()
    render(<CopyButton value='hello' />)

    const button = screen.getByRole('button', { name: 'Copy to clipboard' })
    await user.click(button)

    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  test('renders children alongside icon', () => {
    render(<CopyButton value='test'>Copy text</CopyButton>)
    expect(screen.getByText('Copy text')).toBeInTheDocument()
  })

  test('uses custom aria-label when provided', () => {
    render(<CopyButton value='test' aria-label='Copy API key' />)
    expect(
      screen.getByRole('button', { name: 'Copy API key' })
    ).toBeInTheDocument()
  })
})
