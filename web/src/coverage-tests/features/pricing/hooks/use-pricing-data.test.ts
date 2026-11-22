import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/pricing/api', () => ({
  getPricing: vi.fn(),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: { price: 2, usd_exchange_rate: 7.2 },
  }),
}))

import { getPricing } from '@/features/pricing/api'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'

const mockGetPricing = getPricing as unknown as ReturnType<typeof vi.fn>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePricingData', () => {
  test('returns loading state initially', () => {
    mockGetPricing.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePricingData(), { wrapper: createWrapper() })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.models).toEqual([])
  })

  test('returns models with vendor info merged', async () => {
    mockGetPricing.mockResolvedValue({
      success: true,
      data: [
        { id: 1, model_name: 'gpt-4', vendor_id: 10, model_ratio: 30, completion_ratio: 2, enable_groups: ['default'], quota_type: 0 },
      ],
      vendors: [{ id: 10, name: 'OpenAI', icon: '/openai.png', description: 'AI company' }],
      group_ratio: { default: 1 },
      usable_group: { default: { desc: 'Default', ratio: 1 } },
      supported_endpoint: { openai: '/v1/chat' },
      auto_groups: ['auto'],
    })
    const { result } = renderHook(() => usePricingData(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.models).toHaveLength(1)
    expect(result.current.models[0].vendor_name).toBe('OpenAI')
    expect(result.current.models[0].vendor_icon).toBe('/openai.png')
    expect(result.current.models[0].vendor_description).toBe('AI company')
    expect(result.current.models[0].key).toBe('gpt-4')
    expect(result.current.models[0].group_ratio).toEqual({ default: 1 })
  })

  test('handles model without vendor_id', async () => {
    mockGetPricing.mockResolvedValue({
      success: true,
      data: [
        { id: 2, model_name: 'custom', model_ratio: 1, completion_ratio: 1, enable_groups: [], quota_type: 0 },
      ],
      vendors: [{ id: 10, name: 'OpenAI' }],
      group_ratio: {},
      usable_group: {},
      supported_endpoint: {},
      auto_groups: [],
    })
    const { result } = renderHook(() => usePricingData(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.models[0].vendor_name).toBeUndefined()
  })

  test('returns priceRate from status', async () => {
    mockGetPricing.mockResolvedValue({
      success: true,
      data: [],
      vendors: [],
      group_ratio: {},
      usable_group: {},
      supported_endpoint: {},
      auto_groups: [],
    })
    const { result } = renderHook(() => usePricingData(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.priceRate).toBe(2)
    expect(result.current.usdExchangeRate).toBe(7.2)
  })

  test('returns default values when data is missing', async () => {
    mockGetPricing.mockResolvedValue({
      success: true,
      data: undefined,
      vendors: undefined,
      group_ratio: undefined,
      usable_group: undefined,
      supported_endpoint: undefined,
      auto_groups: undefined,
    })
    const { result } = renderHook(() => usePricingData(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.models).toEqual([])
    expect(result.current.vendors).toEqual([])
    expect(result.current.groupRatio).toEqual({})
    expect(result.current.usableGroup).toEqual({})
    expect(result.current.endpointMap).toEqual({})
    expect(result.current.autoGroups).toEqual([])
  })
})
