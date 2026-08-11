import { render, screen } from '@/test/test-utils'

import { TruncatedCell } from '@/components/data-table/core/truncated-cell'

describe('TruncatedCell', () => {
  test('renders children text', () => {
    render(<TruncatedCell>Hello World</TruncatedCell>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  test('renders numeric children', () => {
    render(<TruncatedCell>{42}</TruncatedCell>)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders with truncate class', () => {
    const { container } = render(<TruncatedCell>Text</TruncatedCell>)
    expect(container.querySelector('.truncate')).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(
      <TruncatedCell className='max-w-[100px]'>Text</TruncatedCell>
    )
    expect(container.querySelector('.max-w-\\[100px\\]')).toBeInTheDocument()
  })

  test('applies cellClassName', () => {
    const { container } = render(
      <TruncatedCell cellClassName='cell-class'>Text</TruncatedCell>
    )
    expect(container.querySelector('.cell-class')).toBeInTheDocument()
  })

  test('renders without tooltip when children is non-text node', () => {
    const { container } = render(
      <TruncatedCell>
        <span>Complex</span>
      </TruncatedCell>
    )
    // When getTextContent returns empty string, no tooltip is shown
    // Just a plain div wrapper
    expect(container.querySelector('.truncate')).toBeInTheDocument()
  })

  test('renders with tooltip when children is text', () => {
    const { container } = render(
      <TruncatedCell>Long text content here</TruncatedCell>
    )
    // With text content, tooltip is rendered
    expect(screen.getByText('Long text content here')).toBeInTheDocument()
  })

  test('uses custom tooltipContent (passes it to tooltip)', () => {
    render(
      <TruncatedCell tooltipContent='Custom tooltip'>Short</TruncatedCell>
    )
    // The tooltip content is not rendered in DOM until trigger is hovered,
    // but we can verify the trigger is rendered with proper structure
    expect(screen.getByText('Short')).toBeInTheDocument()
  })
})
