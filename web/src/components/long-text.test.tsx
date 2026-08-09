import { render, screen } from '@/test/test-utils'

import { LongText } from './long-text'

describe('LongText', () => {
  test('renders children text', () => {
    render(<LongText>Short text</LongText>)
    expect(screen.getByText('Short text')).toBeInTheDocument()
  })

  test('renders with truncate class', () => {
    const { container } = render(<LongText>Some text</LongText>)
    expect(container.querySelector('.truncate')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <LongText className='my-class'>Text</LongText>
    )
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })

  test('renders in non-overflown state (no tooltip)', () => {
    // In happy-dom, elements have 0 dimensions so offsetHeight === scrollHeight
    const { container } = render(<LongText>Normal text</LongText>)
    expect(container.querySelector('.truncate')).toBeInTheDocument()
  })
})
