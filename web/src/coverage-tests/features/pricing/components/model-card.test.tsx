import { render, screen, userEvent } from '@/test/test-utils'

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: vi.fn() }),
}))

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: () => null,
}))

vi.mock('@/features/pricing/lib/dynamic-price', () => ({
  getDynamicDisplayGroupRatio: () => 1,
  getDynamicPricingSummary: () => null,
  isDynamicPricingModel: () => false,
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
    expect(screen.getByText('/ request')).toBeInTheDocument()
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
    expect(screen.getByText('1K')).toBeInTheDocument()
  })

  test('renders with M token unit by default', () => {
    render(<ModelCard {...defaultProps} />)
    expect(screen.getByText('1M')).toBeInTheDocument()
  })

  test('shows hidden count when there are many tags/endpoints', () => {
    const model = createModel({
      tags: 'a,b,c,d,e',
      supported_endpoint_types: ['openai', 'anthropic', 'gemini'],
      enable_groups: ['g1', 'g2', 'g3'],
    })
    render(<ModelCard {...defaultProps} model={model} />)
    expect(screen.getByText('+6')).toBeInTheDocument()
  })
})
