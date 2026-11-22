import { render, screen } from '@/test/test-utils'

import { ComingSoon } from '@/components/coming-soon'

describe('ComingSoon', () => {
  test('renders heading', () => {
    render(<ComingSoon />)
    expect(
      screen.getByRole('heading', { name: 'Coming Soon!' })
    ).toBeInTheDocument()
  })

  test('renders descriptive text', () => {
    render(<ComingSoon />)
    expect(
      screen.getByText(/This page has not been created yet/)
    ).toBeInTheDocument()
    expect(screen.getByText(/Stay tuned though/)).toBeInTheDocument()
  })
})
