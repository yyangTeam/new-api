// Test just verifies the index re-exports exist via the module
vi.mock('./model-card', () => ({ ModelCard: () => null }))
vi.mock('./model-card-grid', () => ({ ModelCardGrid: () => null }))
vi.mock('./search-bar', () => ({ SearchBar: () => null }))
vi.mock('./empty-state', () => ({ EmptyState: () => null }))
vi.mock('./loading-skeleton', () => ({ LoadingSkeleton: () => null }))
vi.mock('./pricing-sidebar', () => ({ PricingSidebar: () => null }))
vi.mock('./pricing-toolbar', () => ({ PricingToolbar: () => null }))
vi.mock('./model-details', () => ({
  ModelDetails: () => null,
  ModelDetailsContent: () => null,
  ModelDetailsDrawer: () => null,
}))
vi.mock('./pricing-table', () => ({ PricingTable: () => null }))

import * as componentsIndex from './index'

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
