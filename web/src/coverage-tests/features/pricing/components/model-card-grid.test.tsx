import { render, screen, userEvent } from '@/test/test-utils'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('@/features/performance-metrics/api', () => ({
  getPerfMetricsSummary: vi.fn().mockResolvedValue({
    success: true,
    data: { models: [] },
  }),
}))

vi.mock('@/features/pricing/components/model-perf-badge', () => ({
  ModelPerfBadge: () => null,
}))

vi.mock('@/features/pricing/components/model-billing-mode-badge', () => ({
  ModelBillingModeBadge: () => <span>billing-badge</span>,
}))

vi.mock('@/features/pricing/lib/dynamic-price', () => ({
  getDynamicDisplayGroupRatio: () => 1,
  getDynamicPricingSummary: () => null,
}))

vi.mock('@/features/pricing/lib/filters', () => ({
  parseTags: (tags?: string) => (tags ? tags.split(',') : []),
}))

vi.mock('@/features/pricing/lib/model-helpers', () => ({
  isTokenBasedModel: (m: { quota_type: number }) => m.quota_type === 0,
}))

vi.mock('@/features/pricing/lib/price', () => ({
  formatPrice: () => '$0.01',
  formatRequestPrice: () => '$0.005',
}))

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: vi.fn() }),
}))

import { ModelCardGrid } from '@/features/pricing/components/model-card-grid'
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
    tags: 'chat',
    supported_endpoint_types: ['openai'],
    ...overrides,
  }
}

describe('ModelCardGrid', () => {
  const onModelClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null when models array is empty', () => {
    const { container } = render(
      <ModelCardGrid models={[]} onModelClick={onModelClick} />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders model cards', () => {
    const models = [createModel({ id: 1, model_name: 'gpt-4o' })]
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  test('renders multiple model cards', () => {
    const models = [
      createModel({ id: 1, model_name: 'gpt-4o' }),
      createModel({ id: 2, model_name: 'claude-3' }),
    ]
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
    expect(screen.getByText('claude-3')).toBeInTheDocument()
  })

  test('does not show pagination when models fit on one page', () => {
    const models = [createModel({ id: 1, model_name: 'gpt-4o' })]
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)
    expect(screen.queryByText('Previous page')).not.toBeInTheDocument()
    expect(screen.queryByText('Next page')).not.toBeInTheDocument()
  })

  test('shows pagination when models exceed page size', () => {
    const models = Array.from({ length: 25 }, (_, i) =>
      createModel({ id: i, model_name: `model-${i}` })
    )
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)
    expect(screen.getByText('Previous page')).toBeInTheDocument()
    expect(screen.getByText('Next page')).toBeInTheDocument()
  })

  test('previous page button is disabled on first page', () => {
    const models = Array.from({ length: 25 }, (_, i) =>
      createModel({ id: i, model_name: `model-${i}` })
    )
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)
    const prevButton = screen.getByRole('button', { name: /Previous page/i })
    expect(prevButton).toBeDisabled()
  })

  test('navigates to next page', async () => {
    const user = userEvent.setup()
    const models = Array.from({ length: 25 }, (_, i) =>
      createModel({ id: i, model_name: `model-${i}` })
    )
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)

    await user.click(screen.getByRole('button', { name: /Next page/i }))

    // Page 2 should show remaining models
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument()
  })

  test('calls onModelClick when card is clicked', async () => {
    const user = userEvent.setup()
    const models = [createModel({ id: 1, model_name: 'gpt-4o' })]
    render(<ModelCardGrid models={models} onModelClick={onModelClick} />)

    await user.click(screen.getByText('Details'))
    expect(onModelClick).toHaveBeenCalledWith('gpt-4o')
  })

  test('passes tokenUnit K to cards', () => {
    const models = [createModel({ id: 1, model_name: 'gpt-4o' })]
    render(
      <ModelCardGrid
        models={models}
        onModelClick={onModelClick}
        tokenUnit='K'
      />
    )
    expect(screen.getByText('1K')).toBeInTheDocument()
  })
})
