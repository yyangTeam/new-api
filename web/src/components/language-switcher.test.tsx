import { render, screen } from '@/test/test-utils'

import { LanguageSwitcher } from './language-switcher'

vi.mock('@/lib/api', () => ({
  api: { put: vi.fn().mockResolvedValue({}) },
}))

describe('LanguageSwitcher', () => {
  test('renders language toggle button', () => {
    render(<LanguageSwitcher />)
    expect(
      screen.getByRole('button', { name: 'Change language' })
    ).toBeInTheDocument()
  })

  test('has sr-only change language text', () => {
    render(<LanguageSwitcher />)
    const srText = screen.getByText('Change language')
    expect(srText.className).toContain('sr-only')
  })
})
