import { render, screen } from '@/test/test-utils'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  test('renders default title via i18n when no title provided', () => {
    render(<EmptyState />)
    expect(screen.getByText('No Data')).toBeInTheDocument()
  })

  test('renders custom title when provided', () => {
    render(<EmptyState title='Custom Title' />)
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(<EmptyState description='Some description' />)
    expect(screen.getByText('Some description')).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    const { container } = render(<EmptyState />)
    expect(container.querySelector('[class*="description"]')).toBeNull()
  })

  test('renders action slot when provided', () => {
    render(<EmptyState action={<button type='button'>Click me</button>} />)
    expect(
      screen.getByRole('button', { name: 'Click me' })
    ).toBeInTheDocument()
  })
})
