import { render, screen } from '@/test/test-utils'

import { TitledCard } from '@/components/ui/titled-card'

describe('TitledCard', () => {
  test('renders title', () => {
    render(<TitledCard title='Card Title'>Body</TitledCard>)
    expect(screen.getByText('Card Title')).toBeInTheDocument()
  })

  test('renders children in card content', () => {
    render(<TitledCard title='T'>Card body content</TitledCard>)
    expect(screen.getByText('Card body content')).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(
      <TitledCard title='T' description='A description'>
        Body
      </TitledCard>
    )
    expect(screen.getByText('A description')).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    render(<TitledCard title='T'>Body</TitledCard>)
    expect(screen.queryByText('A description')).not.toBeInTheDocument()
  })

  test('renders icon when provided', () => {
    render(
      <TitledCard title='T' icon={<span data-testid='card-icon'>IC</span>}>
        Body
      </TitledCard>
    )
    expect(screen.getByTestId('card-icon')).toBeInTheDocument()
  })

  test('does not render icon area when no icon', () => {
    const { container } = render(<TitledCard title='T'>Body</TitledCard>)
    expect(container.querySelector('[aria-hidden]')).not.toBeInTheDocument()
  })

  test('renders action when provided', () => {
    render(
      <TitledCard
        title='T'
        action={<button type='button'>Edit</button>}
      >
        Body
      </TitledCard>
    )
    expect(
      screen.getByRole('button', { name: 'Edit' })
    ).toBeInTheDocument()
  })

  test('does not render action when not provided', () => {
    render(<TitledCard title='T'>Body</TitledCard>)
    expect(
      screen.queryByRole('button', { name: 'Edit' })
    ).not.toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <TitledCard title='T' className='my-card'>
        Body
      </TitledCard>
    )
    expect(container.querySelector('.my-card')).toBeInTheDocument()
  })
})
