import { render, screen } from '@/test/test-utils'

import { SkipToMain } from '@/components/skip-to-main'

describe('SkipToMain', () => {
  test('renders a link with correct text', () => {
    render(<SkipToMain />)
    expect(
      screen.getByRole('link', { name: 'Skip to Main' })
    ).toBeInTheDocument()
  })

  test('links to #content', () => {
    render(<SkipToMain />)
    const link = screen.getByRole('link', { name: 'Skip to Main' })
    expect(link).toHaveAttribute('href', '#content')
  })
})
