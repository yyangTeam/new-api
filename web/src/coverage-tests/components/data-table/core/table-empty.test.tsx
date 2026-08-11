import { render, screen } from '@/test/test-utils'

import { TableEmpty } from '@/components/data-table/core/table-empty'

describe('TableEmpty', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <table>
      <tbody>{children}</tbody>
    </table>
  )

  test('renders default title', () => {
    render(<TableEmpty colSpan={5} />, { wrapper })
    expect(screen.getByText('No Data')).toBeInTheDocument()
  })

  test('renders default description', () => {
    render(<TableEmpty colSpan={5} />, { wrapper })
    expect(
      screen.getByText('No records found. Try adjusting your filters.')
    ).toBeInTheDocument()
  })

  test('renders custom title', () => {
    render(<TableEmpty colSpan={3} title='Empty Table' />, { wrapper })
    expect(screen.getByText('Empty Table')).toBeInTheDocument()
  })

  test('renders custom description', () => {
    render(
      <TableEmpty colSpan={3} description='Try a different query' />,
      { wrapper }
    )
    expect(screen.getByText('Try a different query')).toBeInTheDocument()
  })

  test('renders custom icon', () => {
    render(
      <TableEmpty colSpan={3} icon={<span data-testid='custom-icon'>IC</span>} />,
      { wrapper }
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  test('renders children content', () => {
    render(
      <TableEmpty colSpan={3}>
        <button type='button'>Refresh</button>
      </TableEmpty>,
      { wrapper }
    )
    expect(
      screen.getByRole('button', { name: 'Refresh' })
    ).toBeInTheDocument()
  })

  test('spans correct number of columns', () => {
    const { container } = render(<TableEmpty colSpan={7} />, { wrapper })
    const cell = container.querySelector('td')!
    expect(cell).toHaveAttribute('colspan', '7')
  })
})
