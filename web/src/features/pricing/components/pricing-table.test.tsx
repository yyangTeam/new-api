import { render, screen } from '@/test/test-utils'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('../lib/dynamic-price', () => ({
  getDynamicDisplayGroupRatio: () => 1,
  getDynamicPricingSummary: () => null,
  isDynamicPricingModel: () => false,
}))

vi.mock('../lib/filters', () => ({
  parseTags: (tags?: string) => (tags ? tags.split(',') : []),
}))

vi.mock('../lib/model-helpers', () => ({
  isTokenBasedModel: (m: { quota_type: number }) => m.quota_type === 0,
}))

vi.mock('../lib/price', () => ({
  formatPrice: () => '$0.01',
  formatRequestPrice: () => '$0.005',
  stripTrailingZeros: (s: string) => s,
}))

import { PricingTable } from './pricing-table'
import type { PricingModel } from '../types'

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
    const { container } = render(
      <PricingTable models={[]} isLoading={true} />
    )
    // Loading state should not show "No Models Found"
    expect(screen.queryByText('No Models Found')).not.toBeInTheDocument()
    // Should have some content rendered
    expect(container.firstChild).not.toBeNull()
  })

  test('does not show pagination when loading', () => {
    render(<PricingTable models={[]} isLoading={true} />)
    // No pagination should be visible during loading
    expect(screen.queryByText(/of \d+/)).not.toBeInTheDocument()
  })
})
