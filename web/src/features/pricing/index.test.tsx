import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('./components', () => ({
  LoadingSkeleton: ({ viewMode }: { viewMode: string }) => <div data-testid='loading-skeleton' data-view={viewMode} />,
  EmptyState: () => <div data-testid='empty-state' />,
  SearchBar: () => <div data-testid='search-bar' />,
  PricingTable: () => <div data-testid='pricing-table' />,
  PricingSidebar: () => <div data-testid='pricing-sidebar' />,
  PricingToolbar: () => <div data-testid='pricing-toolbar' />,
  ModelCardGrid: () => <div data-testid='model-card-grid' />,
  ModelDetailsDrawer: () => <div data-testid='model-details-drawer' />,
}))

vi.mock('./hooks/use-filters', () => ({
  useFilters: () => ({
    searchInput: '',
    sortBy: 'name',
    vendorFilter: 'all',
    groupFilter: 'all',
    quotaTypeFilter: 'all',
    endpointTypeFilter: 'all',
    tagFilter: 'all',
    tokenUnit: 'M',
    viewMode: 'card',
    showRechargePrice: false,
    setSearchInput: vi.fn(),
    setSortBy: vi.fn(),
    setVendorFilter: vi.fn(),
    setGroupFilter: vi.fn(),
    setQuotaTypeFilter: vi.fn(),
    setEndpointTypeFilter: vi.fn(),
    setTagFilter: vi.fn(),
    setTokenUnit: vi.fn(),
    setViewMode: vi.fn(),
    setShowRechargePrice: vi.fn(),
    filteredModels: [{ model_name: 'gpt-4', id: 1, quota_type: 0, model_ratio: 30, completion_ratio: 2, enable_groups: ['default'] }],
    hasActiveFilters: false,
    activeFilterCount: 0,
    availableTags: [],
    clearFilters: vi.fn(),
    clearSearch: vi.fn(),
  }),
}))

let mockIsLoading = false
vi.mock('./hooks/use-pricing-data', () => ({
  usePricingData: () => ({
    models: [{ model_name: 'gpt-4', id: 1, quota_type: 0, model_ratio: 30, completion_ratio: 2, enable_groups: ['default'] }],
    vendors: [],
    groupRatio: {},
    usableGroup: { default: { desc: 'Default', ratio: 1 } },
    endpointMap: {},
    autoGroups: [],
    isLoading: mockIsLoading,
    priceRate: 1,
    usdExchangeRate: 7.2,
  }),
}))

vi.mock('@/components/layout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/page-transition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { Pricing } from './index'

describe('Pricing page', () => {
  test('renders loading skeleton when isLoading', () => {
    mockIsLoading = true
    render(<Pricing />)
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    mockIsLoading = false
  })

  test('renders toolbar and content when loaded', () => {
    mockIsLoading = false
    render(<Pricing />)
    expect(screen.getByTestId('pricing-toolbar')).toBeInTheDocument()
  })

  test('renders search bar', () => {
    render(<Pricing />)
    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
  })

  test('renders model card grid in card view mode', () => {
    render(<Pricing />)
    expect(screen.getByTestId('model-card-grid')).toBeInTheDocument()
  })

  test('renders page heading', () => {
    render(<Pricing />)
    expect(screen.getByText('Model Square')).toBeInTheDocument()
  })

  test('renders model count', () => {
    render(<Pricing />)
    expect(screen.getByText(/1 models enabled/)).toBeInTheDocument()
  })
})
