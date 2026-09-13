import { render, screen, userEvent } from '@/test/test-utils'

vi.mock('@/components/copy-button', () => ({
  CopyButton: () => <span>copy</span>,
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('@/features/pricing/lib/dynamic-price', () => ({
  getDynamicDisplayGroupRatio: () => 1,
  getDynamicPricingSummary: () => null,
  getDynamicPriceUnitLabelKey: () => null,
  getCardExamplePrice: () => null,
  isDynamicPricingModel: () => false,
  isUnconfiguredTaskUsageModel: vi.fn(() => false),
  hasTaskUsageSchema: vi.fn(() => false),
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

vi.mock('@/features/pricing/lib/task-price-display', () => ({
  taskPriceLabel: () => null,
  taskUsageUnitLabel: () => '',
}))

vi.mock('@/features/pricing/hooks/use-billing-time', () => ({
  useBillingTime: () => undefined,
}))

vi.mock('@/features/pricing/components/model-billing-mode-badge', () => ({
  ModelBillingModeBadge: () => <span>billing-badge</span>,
}))

vi.mock('@/features/pricing/components/model-perf-badge', () => ({
  ModelPerfBadge: (props: { children?: React.ReactNode }) => <div>{props.children}</div>,
}))

vi.mock('@/stores/system-config-store', () => ({
  useSystemConfigStore: (selector: (state: any) => any) => selector({
    config: { currency: { type: 'NONE' } },
  }),
}))

import { ModelCard } from '@/features/pricing/components/model-card'
import type { PricingModel } from '@/features/pricing/types'

function createModel(overrides: Partial<PricingModel> = {}): PricingModel {
  return {
    id: 1,
    model_name: 'gpt-4o',
    description: 'A powerful model',
    quota_type: 0,
    model_ratio: 5,
    completion_ratio: 15,
    enable_groups: ['default'],
    tags: 'chat,vision',
    supported_endpoint_types: ['openai', 'openai-response'],
    ...overrides,
  }
}

describe('ModelCard', () => {
  const defaultProps = {
    model: createModel(),
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders model name', () => {
    render(<ModelCard {...defaultProps} />)
    expect(screen.getByText('gpt-4o')).toBeInTheDocument()
  })

  test('renders description', () => {
    render(<ModelCard {...defaultProps} />)
    expect(screen.getByText('A powerful model')).toBeInTheDocument()
  })

  test('renders "No description available." when description is empty', () => {
    const model = createModel({ description: '' })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(
      screen.getByText('No description available.')
    ).toBeInTheDocument()
  })

  test('renders Details button', () => {
    render(<ModelCard {...defaultProps} />)
    expect(screen.getByText('Details')).toBeInTheDocument()
  })

  test('calls onClick when Details button is clicked', async () => {
    const user = userEvent.setup()
    render(<ModelCard {...defaultProps} />)
    await user.click(screen.getByText('Details'))
    expect(defaultProps.onClick).toHaveBeenCalled()
  })

  test('renders input and output prices for token-based model', () => {
    render(<ModelCard {...defaultProps} />)
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  test('renders per request price for request-based model', () => {
    const model = createModel({ quota_type: 1 })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.getByText('request', { exact: false })).toBeInTheDocument()
  })

  test('renders cached price when cache_ratio is set', () => {
    const model = createModel({ cache_ratio: 0.5 })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.getByText('Cached')).toBeInTheDocument()
  })

  test('does not render cached price when cache_ratio is null', () => {
    const model = createModel({ cache_ratio: null })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.queryByText('Cached')).not.toBeInTheDocument()
  })

  test('shows first group as primaryGroup', () => {
    const model = createModel({ enable_groups: ['premium', 'default'] })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.getByText('premium')).toBeInTheDocument()
  })

  test('renders initial when no icon available', () => {
    const model = createModel({ icon: undefined, vendor_icon: undefined })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  test('renders ? as initial when model_name is empty', () => {
    const model = createModel({ model_name: '' })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  test('renders with K token unit', () => {
    render(<ModelCard {...defaultProps} tokenUnit='K' />)
    const matches = screen.getAllByText(/\/\s*1K/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  test('renders with M token unit by default', () => {
    render(<ModelCard {...defaultProps} />)
    const matches = screen.getAllByText(/\/\s*1M/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  test('shows hidden count when there are many tags/endpoints/groups', () => {
    const model = createModel({
      tags: 'a,b,c,d,e',
      supported_endpoint_types: ['openai', 'anthropic', 'gemini'],
      enable_groups: ['g1', 'g2', 'g3'],
    })
    render(<ModelCard {...defaultProps} model={model} />)
    // Tags: 5 tags, shows first 2, remainder = +3
    expect(screen.getByText('+3')).toBeInTheDocument()
    // Groups: 3 groups, shows first 1, remainder = +2
    expect(screen.getByText('+2')).toBeInTheDocument()
    // Endpoints: 3 endpoints, shows first 2, remainder = +1
    expect(screen.getByText('+1')).toBeInTheDocument()
  })
})
