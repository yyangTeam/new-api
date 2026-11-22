import { render, screen } from '@/test/test-utils'

import { ThemeSwitch } from '@/components/theme-switch'

describe('ThemeSwitch', () => {
  test('renders toggle theme button', () => {
    render(<ThemeSwitch />)
    expect(
      screen.getByRole('button', { name: 'Toggle theme' })
    ).toBeInTheDocument()
  })

  test('has sr-only toggle theme text', () => {
    render(<ThemeSwitch />)
    const srText = screen.getByText('Toggle theme')
    expect(srText.className).toContain('sr-only')
  })
})
