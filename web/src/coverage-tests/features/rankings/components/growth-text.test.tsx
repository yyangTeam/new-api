import { render, screen } from '@/test/test-utils'

import { GrowthText } from '@/features/rankings/components/growth-text'

describe('GrowthText', () => {
  test('renders 0% for zero value', () => {
    render(<GrowthText value={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  test('renders 0% for NaN', () => {
    render(<GrowthText value={NaN} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  test('renders 0% for Infinity', () => {
    render(<GrowthText value={Infinity} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  test('renders up arrow for positive values', () => {
    const { container } = render(<GrowthText value={15.3} />)
    expect(container.textContent).toContain('↑')
    expect(container.textContent).toContain('15.3%')
  })

  test('renders down arrow for negative values', () => {
    const { container } = render(<GrowthText value={-8.7} />)
    expect(container.textContent).toContain('↓')
    expect(container.textContent).toContain('8.7%')
  })

  test('uses 0 decimals for values >= 100', () => {
    const { container } = render(<GrowthText value={303} />)
    expect(container.textContent).toContain('303%')
  })

  test('uses 1 decimal for values < 100', () => {
    const { container } = render(<GrowthText value={42.789} />)
    expect(container.textContent).toContain('42.8%')
  })

  test('applies emerald color for positive values', () => {
    const { container } = render(<GrowthText value={5} />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('emerald')
  })

  test('applies rose color for negative values', () => {
    const { container } = render(<GrowthText value={-5} />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('rose')
  })

  test('applies muted color for zero value', () => {
    const { container } = render(<GrowthText value={0} />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('muted')
  })

  test('applies custom className', () => {
    const { container } = render(<GrowthText value={10} className='my-custom' />)
    const span = container.querySelector('span')
    expect(span?.className).toContain('my-custom')
  })
})
