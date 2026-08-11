// Test just verifies the index re-exports exist via the module
vi.mock('@/features/pricing/components/model-card', () => ({ ModelCard: () => null }))
vi.mock('@/features/pricing/components/model-card-grid', () => ({ ModelCardGrid: () => null }))
vi.mock('@/features/pricing/components/search-bar', () => ({ SearchBar: () => null }))
vi.mock('@/features/pricing/components/empty-state', () => ({ EmptyState: () => null }))
vi.mock('@/features/pricing/components/loading-skeleton', () => ({ LoadingSkeleton: () => null }))
vi.mock('@/features/pricing/components/pricing-sidebar', () => ({ PricingSidebar: () => null }))
vi.mock('@/features/pricing/components/pricing-toolbar', () => ({ PricingToolbar: () => null }))
vi.mock('@/features/pricing/components/model-details', () => ({
  ModelDetails: () => null,
  ModelDetailsContent: () => null,
  ModelDetailsDrawer: () => null,
}))
vi.mock('@/features/pricing/components/pricing-table', () => ({ PricingTable: () => null }))

import * as componentsIndex from '@/features/pricing/components/index'

describe('pricing components index', () => {
  test('exports ModelCard', () => {
    expect(componentsIndex).toHaveProperty('ModelCard')
  })

  test('exports ModelCardGrid', () => {
    expect(componentsIndex).toHaveProperty('ModelCardGrid')
  })

  test('exports SearchBar', () => {
    expect(componentsIndex).toHaveProperty('SearchBar')
  })

  test('exports EmptyState', () => {
    expect(componentsIndex).toHaveProperty('EmptyState')
  })

  test('exports LoadingSkeleton', () => {
    expect(componentsIndex).toHaveProperty('LoadingSkeleton')
  })

  test('exports PricingSidebar', () => {
    expect(componentsIndex).toHaveProperty('PricingSidebar')
  })

  test('exports PricingToolbar', () => {
    expect(componentsIndex).toHaveProperty('PricingToolbar')
  })

  test('exports ModelDetails', () => {
    expect(componentsIndex).toHaveProperty('ModelDetails')
  })

  test('exports ModelDetailsContent', () => {
    expect(componentsIndex).toHaveProperty('ModelDetailsContent')
  })

  test('exports PricingTable', () => {
    expect(componentsIndex).toHaveProperty('PricingTable')
  })
})
