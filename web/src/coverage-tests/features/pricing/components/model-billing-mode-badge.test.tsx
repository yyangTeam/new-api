import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

vi.mock('@/features/pricing/lib/dynamic-price', () => ({
  isDynamicPricingModel: vi.fn(),
}))

vi.mock('@/features/pricing/lib/model-helpers', () => ({
  isTokenBasedModel: vi.fn(),
}))

vi.mock('@/components/status-badge', () => ({
  StatusBadge: ({ label, variant }: { label: string; variant: string }) => (
    <span data-testid='badge' data-variant={variant}>{label}</span>
  ),
}))

import { isDynamicPricingModel } from '@/features/pricing/lib/dynamic-price'
import { isTokenBasedModel } from '@/features/pricing/lib/model-helpers'
import { ModelBillingModeBadge } from '@/features/pricing/components/model-billing-mode-badge'

const mockIsDynamic = isDynamicPricingModel as unknown as ReturnType<typeof vi.fn>
const mockIsTokenBased = isTokenBasedModel as unknown as ReturnType<typeof vi.fn>

describe('ModelBillingModeBadge', () => {
  const baseModel = { model_name: 'test', quota_type: 1, model_ratio: 1, completion_ratio: 1, enable_groups: [], id: 1 } as any

  test('renders Dynamic Pricing when isDynamicPricingModel returns true', () => {
    mockIsDynamic.mockReturnValue(true)
    mockIsTokenBased.mockReturnValue(false)
    render(<ModelBillingModeBadge model={baseModel} />)
    expect(screen.getByText('Dynamic Pricing')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'warning')
  })

  test('renders Token-based when isTokenBasedModel returns true', () => {
    mockIsDynamic.mockReturnValue(false)
    mockIsTokenBased.mockReturnValue(true)
    render(<ModelBillingModeBadge model={baseModel} />)
    expect(screen.getByText('Token-based')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'info')
  })

  test('renders Per Request by default', () => {
    mockIsDynamic.mockReturnValue(false)
    mockIsTokenBased.mockReturnValue(false)
    render(<ModelBillingModeBadge model={baseModel} />)
    expect(screen.getByText('Per Request')).toBeInTheDocument()
    expect(screen.getByTestId('badge')).toHaveAttribute('data-variant', 'purple')
  })
})
