import { render, screen } from '@/test/test-utils'

import { TruncatedText } from '@/components/truncated-text'

vi.mock('@/components/data-table/core/truncated-cell', () => ({
  TruncatedCell: (props: { children: React.ReactNode; className?: string; side?: string }) => (
    <span data-testid='truncated-cell' className={props.className} data-side={props.side}>
      {props.children}
    </span>
  ),
}))

describe('TruncatedText', () => {
  test('renders text content', () => {
    render(<TruncatedText text='Hello World' />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  test('applies default maxWidth class', () => {
    render(<TruncatedText text='Text' />)
    const el = screen.getByTestId('truncated-cell')
    expect(el.className).toContain('max-w-[200px]')
  })

  test('applies custom maxWidth class', () => {
    render(<TruncatedText text='Text' maxWidth='max-w-[300px]' />)
    const el = screen.getByTestId('truncated-cell')
    expect(el.className).toContain('max-w-[300px]')
  })

  test('uses default side of top', () => {
    render(<TruncatedText text='Text' />)
    const el = screen.getByTestId('truncated-cell')
    expect(el).toHaveAttribute('data-side', 'top')
  })

  test('passes custom side prop', () => {
    render(<TruncatedText text='Text' side='bottom' />)
    const el = screen.getByTestId('truncated-cell')
    expect(el).toHaveAttribute('data-side', 'bottom')
  })

  test('applies custom className', () => {
    render(<TruncatedText text='Text' className='extra' />)
    const el = screen.getByTestId('truncated-cell')
    expect(el.className).toContain('extra')
  })
})
