import { render, screen, userEvent } from '@/test/test-utils'

import { ErrorState } from '@/components/error-state'

describe('ErrorState', () => {
  test('renders default title when no title provided', () => {
    render(<ErrorState />)
    expect(
      screen.getByText('Oops! Something went wrong')
    ).toBeInTheDocument()
  })

  test('renders custom title', () => {
    render(<ErrorState title='Network Error' />)
    expect(screen.getByText('Network Error')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(<ErrorState description='Please try again later.' />)
    expect(screen.getByText('Please try again later.')).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    render(<ErrorState />)
    expect(
      screen.queryByText('Please try again later.')
    ).not.toBeInTheDocument()
  })

  test('renders retry button when onRetry is provided', () => {
    render(<ErrorState onRetry={() => {}} />)
    expect(
      screen.getByRole('button', { name: 'Retry' })
    ).toBeInTheDocument()
  })

  test('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState />)
    expect(
      screen.queryByRole('button', { name: 'Retry' })
    ).not.toBeInTheDocument()
  })

  test('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn()
    const user = userEvent.setup()
    render(<ErrorState onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  test('renders custom action', () => {
    render(
      <ErrorState action={<button type='button'>Go Home</button>} />
    )
    expect(
      screen.getByRole('button', { name: 'Go Home' })
    ).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<ErrorState className='error-custom' />)
    expect(container.querySelector('.error-custom')).toBeInTheDocument()
  })
})
