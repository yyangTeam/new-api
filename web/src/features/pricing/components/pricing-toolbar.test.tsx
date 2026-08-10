import { render, screen } from '@/test/test-utils'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('../lib/filters', () => ({
  parseTags: (tags?: string) => (tags ? tags.split(',') : []),
}))

import { PricingToolbar, type PricingToolbarProps } from './pricing-toolbar'
import type { PricingModel } from '../types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    ...overrides,
  }
}

function createProps(
  overrides: Partial<PricingToolbarProps> = {}
): PricingToolbarProps {
  return {
    filteredCount: 42,
    totalCount: 100,
    sortBy: 'name',
    onSortChange: vi.fn(),
    tokenUnit: 'M',
    onTokenUnitChange: vi.fn(),
    showRechargePrice: false,
    onRechargePriceChange: vi.fn(),
    viewMode: 'card',
    onViewModeChange: vi.fn(),
    quotaTypeFilter: 'all',
    endpointTypeFilter: 'all',
    vendorFilter: 'all',
    groupFilter: 'all',
    tagFilter: 'all',
    onQuotaTypeChange: vi.fn(),
    onEndpointTypeChange: vi.fn(),
    onVendorChange: vi.fn(),
    onGroupChange: vi.fn(),
    onTagChange: vi.fn(),
    vendors: [],
    groups: [],
    tags: [],
    models: [createModel()],
    hasActiveFilters: false,
    activeFilterCount: 0,
    onClearFilters: vi.fn(),
    ...overrides,
  }
}

describe('PricingToolbar', () => {
  test('renders filtered count', () => {
    render(<PricingToolbar {...createProps()} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders singular "model" for count of 1', () => {
    render(<PricingToolbar {...createProps({ filteredCount: 1 })} />)
    expect(screen.getByText('model')).toBeInTheDocument()
  })

  test('renders plural "models" for count > 1', () => {
    render(<PricingToolbar {...createProps({ filteredCount: 5 })} />)
    expect(screen.getByText('models')).toBeInTheDocument()
  })

  test('shows total count when active filters', () => {
    render(
      <PricingToolbar
        {...createProps({ hasActiveFilters: true, totalCount: 100 })}
      />
    )
    expect(screen.getByText('/ 100')).toBeInTheDocument()
  })

  test('hides total count when no active filters', () => {
    render(
      <PricingToolbar
        {...createProps({ hasActiveFilters: false, totalCount: 100 })}
      />
    )
    expect(screen.queryByText('/ 100')).not.toBeInTheDocument()
  })

  test('renders Filter button with badge when activeFilterCount > 0', () => {
    render(
      <PricingToolbar {...createProps({ activeFilterCount: 3 })} />
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('renders Standard and Recharge price mode options', () => {
    render(<PricingToolbar {...createProps()} />)
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('Recharge')).toBeInTheDocument()
  })

  test('renders token unit options', () => {
    render(<PricingToolbar {...createProps()} />)
    expect(screen.getByText('/1M')).toBeInTheDocument()
    expect(screen.getByText('/1K')).toBeInTheDocument()
  })

  test('renders current sort label', () => {
    render(<PricingToolbar {...createProps({ sortBy: 'name' })} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})
