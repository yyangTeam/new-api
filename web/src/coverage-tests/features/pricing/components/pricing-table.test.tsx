import { render, screen } from '@/test/test-utils'

// Mock the data-table components to control rendering
vi.mock('@/components/data-table', () => {
  return {
    DataTableView: (props: any) => {
      const rows = props.table.getRowModel().rows
      if (props.isLoading) return <div data-testid='loading-skeleton'>Loading...</div>
      if (rows.length === 0) {
        return (
          <div>
            <div>{props.emptyTitle}</div>
            <div>{props.emptyDescription}</div>
          </div>
        )
      }
      return (
        <div data-testid='data-table-view'>
          {rows.map((row: any) => (
            <div key={row.id}>{row.original.model_name}</div>
          ))}
        </div>
      )
    },
    DataTablePagination: () => <div data-testid='pagination'>Pagination</div>,
    DataTableRow: (props: any) => <div>{props.children}</div>,
    useDataTable: (opts: any) => {
      const rows = opts.data.map((item: any, idx: number) => ({
        id: String(idx),
        original: item,
        getVisibleCells: () => [],
      }))
      return {
        table: {
          getRowModel: () => ({ rows }),
          getPageCount: () => Math.ceil(opts.data.length / (opts.pagination?.pageSize ?? 20)),
          getState: () => ({ pagination: opts.pagination ?? { pageIndex: 0, pageSize: 20 } }),
          previousPage: vi.fn(),
          nextPage: vi.fn(),
          getCanPreviousPage: () => false,
          getCanNextPage: () => opts.data.length > (opts.pagination?.pageSize ?? 20),
          setPageIndex: vi.fn(),
          getHeaderGroups: () => [],
          getAllColumns: () => [],
        },
      }
    },
  }
})

vi.mock('@/features/pricing/components/pricing-columns', () => ({
  usePricingColumns: () => [],
}))

import { PricingTable } from '@/features/pricing/components/pricing-table'
import type { PricingModel } from '@/features/pricing/types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'gpt-4o',
    description: 'Test model',
    quota_type: 0,
    model_ratio: 5,
    completion_ratio: 15,
    enable_groups: ['default'],
    ...overrides,
  }
}

describe('PricingTable', () => {
  test('renders empty state when models is empty and not loading', () => {
    render(<PricingTable models={[]} />)
    expect(screen.getByText('No Models Found')).toBeInTheDocument()
    expect(
      screen.getByText('No models match your current filters.')
    ).toBeInTheDocument()
  })

  test('renders model names in table', () => {
    const models = [
      createModel({ id: 1, model_name: 'gpt-4o' }),
      createModel({ id: 2, model_name: 'claude-3' }),
    ]
    render(<PricingTable models={models} />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('claude-3')).toBeInTheDocument()
  })

  test('renders with custom props', () => {
    const models = [createModel({ id: 1, model_name: 'gpt-4o' })]
    render(
      <PricingTable
        models={models}
        priceRate={2}
        usdExchangeRate={7.2}
        tokenUnit='K'
        showRechargePrice={true}
        selectedGroup='premium'
      />
    )
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  test('renders loading skeleton when isLoading', () => {
    render(<PricingTable models={[]} isLoading={true} />)
    // Loading state should not show "No Models Found"
    expect(screen.queryByText('No Models Found')).not.toBeInTheDocument()
    // Should have loading skeleton content
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  test('does not show pagination when loading', () => {
    render(<PricingTable models={[]} isLoading={true} />)
    // No pagination should be visible during loading
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument()
  })
})
