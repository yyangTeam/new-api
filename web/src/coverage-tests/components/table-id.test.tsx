import { render, screen } from '@/test/test-utils'

import { TableId } from '@/components/table-id'

describe('TableId', () => {
  test('renders numeric value', () => {
    render(<TableId value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders string value', () => {
    render(<TableId value='abc-123' />)
    expect(screen.getByText('abc-123')).toBeInTheDocument()
  })

  test('applies font-mono class', () => {
    render(<TableId value={1} />)
    const el = screen.getByText('1')
    expect(el.className).toContain('font-mono')
  })

  test('applies custom className', () => {
    render(<TableId value={1} className='custom' />)
    const el = screen.getByText('1')
    expect(el.className).toContain('custom')
  })
})
