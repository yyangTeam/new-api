import { render, screen } from '@/test/test-utils'

import { TableEmpty } from '@/components/data-table/core/table-empty'

describe('TableEmpty', () => {
  test('renders default title', () => {
    render(
      <table><tbody><TableEmpty colSpan={5} /></tbody></table>
    )
    expect(screen.getByText('No Data')).toBeInTheDocument()
  })

  test('renders default description', () => {
    render(
      <table><tbody><TableEmpty colSpan={5} /></tbody></table>
    )
    expect(
      screen.getByText('No records found. Try adjusting your filters.')
    ).toBeInTheDocument()
  })

  test('renders custom title', () => {
    render(
      <table><tbody><TableEmpty colSpan={3} title='Empty Table' /></tbody></table>
    )
    expect(screen.getByText('Empty Table')).toBeInTheDocument()
  })

  test('renders custom description', () => {
    render(
      <table><tbody><TableEmpty colSpan={3} description='Try a different query' /></tbody></table>
    )
    expect(screen.getByText('Try a different query')).toBeInTheDocument()
  })

  test('renders custom icon', () => {
    render(
      <table><tbody><TableEmpty colSpan={3} icon={<span data-testid='custom-icon'>IC</span>} /></tbody></table>
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  test('renders children content', () => {
    render(
      <table><tbody>
        <TableEmpty colSpan={3}>
          <button type='button'>Refresh</button>
        </TableEmpty>
      </tbody></table>
    )
    expect(
      screen.getByRole('button', { name: 'Refresh' })
    ).toBeInTheDocument()
  })

  test('spans correct number of columns', () => {
    const { container } = render(
      <table><tbody><TableEmpty colSpan={7} /></tbody></table>
    )
    const cell = container.querySelector('td')!
    expect(cell).toHaveAttribute('colspan', '7')
  })
})
