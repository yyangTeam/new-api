import { render, screen } from '@/test/test-utils'

import { LoadingState } from '@/components/loading-state'

describe('LoadingState', () => {
  test('renders default loading message', () => {
    render(<LoadingState />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('renders custom message', () => {
    render(<LoadingState message='Fetching data...' />)
    expect(screen.getByText('Fetching data...')).toBeInTheDocument()
  })

  test('renders inline variant without message', () => {
    const { container } = render(<LoadingState inline />)
    expect(container.querySelector('span')).toBeInTheDocument()
    expect(container.querySelector('div.flex.min-h-\\[200px\\]')).toBeNull()
  })

  test('renders inline variant with message', () => {
    render(<LoadingState inline message='Please wait' />)
    expect(screen.getByText('Please wait')).toBeInTheDocument()
  })

  test('applies sm size', () => {
    const { container } = render(<LoadingState size='sm' />)
    expect(container.querySelector('.size-4')).toBeInTheDocument()
  })

  test('applies md size by default', () => {
    const { container } = render(<LoadingState />)
    expect(container.querySelector('.size-6')).toBeInTheDocument()
  })

  test('applies lg size', () => {
    const { container } = render(<LoadingState size='lg' />)
    expect(container.querySelector('.size-8')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<LoadingState className='my-class' />)
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })

  test('inline variant does not render default message text', () => {
    render(<LoadingState inline />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  test('inline variant renders message when provided', () => {
    render(<LoadingState inline message='Wait...' />)
    expect(screen.getByText('Wait...')).toBeInTheDocument()
  })
})
