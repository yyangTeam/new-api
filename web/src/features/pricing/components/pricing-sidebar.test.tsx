import { render, screen } from '@/test/test-utils'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('../lib/filters', () => ({
  parseTags: (tags?: string) => (tags ? tags.split(',') : []),
}))

import { PricingSidebar, type PricingSidebarProps } from './pricing-sidebar'
import type { PricingModel } from '../types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'test-model',
    quota_type: 0,
    model_ratio: 1,
    completion_ratio: 1,
    enable_groups: ['default'],
    tags: 'chat',
    supported_endpoint_types: ['openai'],
    vendor_name: 'TestVendor',
    ...overrides,
  }
}

function createProps(
  overrides: Partial<PricingSidebarProps> = {}
): PricingSidebarProps {
  return {
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
    vendors: [{ id: 1, name: 'TestVendor' }],
    groups: ['default', 'premium'],
    tags: ['chat', 'vision'],
    models: [createModel()],
    hasActiveFilters: false,
    onClearFilters: vi.fn(),
    ...overrides,
  }
}

describe('PricingSidebar', () => {
  test('renders Filter heading', () => {
    render(<PricingSidebar {...createProps()} />)
    expect(screen.getAllByText('Filter').length).toBeGreaterThan(0)
  })

  test('renders Reset button', () => {
    render(<PricingSidebar {...createProps()} />)
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  test('disables Reset when no active filters', () => {
    render(<PricingSidebar {...createProps({ hasActiveFilters: false })} />)
    const resetBtn = screen.getByRole('button', { name: /Reset/i })
    expect(resetBtn).toBeDisabled()
  })

  test('enables Reset when active filters present', () => {
    render(<PricingSidebar {...createProps({ hasActiveFilters: true })} />)
    const resetBtn = screen.getByRole('button', { name: /Reset/i })
    expect(resetBtn).not.toBeDisabled()
  })

  test('shows "Filters active" badge when has active filters', () => {
    render(<PricingSidebar {...createProps({ hasActiveFilters: true })} />)
    expect(screen.getByText('Filters active')).toBeInTheDocument()
  })

  test('does not show "Filters active" badge when no active filters', () => {
    render(<PricingSidebar {...createProps({ hasActiveFilters: false })} />)
    expect(screen.queryByText('Filters active')).not.toBeInTheDocument()
  })

  test('renders group options', () => {
    render(<PricingSidebar {...createProps()} />)
    expect(screen.getByText('All Groups')).toBeInTheDocument()
    expect(screen.getByText('default')).toBeInTheDocument()
    expect(screen.getByText('premium')).toBeInTheDocument()
  })

  test('renders tag options', () => {
    render(<PricingSidebar {...createProps()} />)
    expect(screen.getByText('All Tags')).toBeInTheDocument()
    expect(screen.getByText('chat')).toBeInTheDocument()
    expect(screen.getByText('vision')).toBeInTheDocument()
  })

  test('renders vendor options', () => {
    render(<PricingSidebar {...createProps()} />)
    expect(screen.getAllByText('All Vendors').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TestVendor').length).toBeGreaterThan(0)
  })

  test('formats group ratio', () => {
    render(
      <PricingSidebar
        {...createProps({
          groupRatios: { default: 1, premium: 0.5 },
        })}
      />
    )
    expect(screen.getByText('x1')).toBeInTheDocument()
    expect(screen.getByText('x0.5')).toBeInTheDocument()
  })

  test('hides vendors with zero count', () => {
    render(
      <PricingSidebar
        {...createProps({
          vendors: [
            { id: 1, name: 'TestVendor' },
            { id: 2, name: 'EmptyVendor' },
          ],
          models: [createModel({ vendor_name: 'TestVendor' })],
        })}
      />
    )
    const emptyVendors = screen.queryAllByText('EmptyVendor')
    expect(emptyVendors.length).toBe(0)
  })
})
