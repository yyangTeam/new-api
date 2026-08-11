import { render, screen, userEvent } from '@/test/test-utils'

import { ThemeQuickSwitcher } from '@/components/theme-quick-switcher'

describe('ThemeQuickSwitcher', () => {
  test('renders theme label', () => {
    render(<ThemeQuickSwitcher />)
    expect(screen.getByText('Theme')).toBeInTheDocument()
  })

  test('renders all three theme options', () => {
    render(<ThemeQuickSwitcher />)
    expect(screen.getByLabelText('System')).toBeInTheDocument()
    expect(screen.getByLabelText('Light')).toBeInTheDocument()
    expect(screen.getByLabelText('Dark')).toBeInTheDocument()
  })

  test('renders radiogroup role', () => {
    render(<ThemeQuickSwitcher />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  test('system is checked by default', () => {
    render(<ThemeQuickSwitcher />)
    expect(screen.getByLabelText('System')).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  test('clicking light theme button switches theme', async () => {
    const user = userEvent.setup()
    render(<ThemeQuickSwitcher />)
    await user.click(screen.getByLabelText('Light'))
    expect(screen.getByLabelText('Light')).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  test('clicking dark theme button switches theme', async () => {
    const user = userEvent.setup()
    render(<ThemeQuickSwitcher />)
    await user.click(screen.getByLabelText('Dark'))
    expect(screen.getByLabelText('Dark')).toHaveAttribute(
      'aria-checked',
      'true'
    )
  })

  test('all buttons have role=radio', () => {
    render(<ThemeQuickSwitcher />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })
})
