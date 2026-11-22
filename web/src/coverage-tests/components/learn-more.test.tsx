import { render, screen } from '@/test/test-utils'

import { LearnMore } from '@/components/learn-more'

describe('LearnMore', () => {
  test('renders button with screen reader text', () => {
    render(<LearnMore>Help content here</LearnMore>)
    expect(screen.getByText('Learn more')).toBeInTheDocument()
  })

  test('renders the trigger button', () => {
    render(<LearnMore>Tip content</LearnMore>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('sr-only text is accessible', () => {
    render(<LearnMore>Info</LearnMore>)
    const srText = screen.getByText('Learn more')
    expect(srText.className).toContain('sr-only')
  })
})
