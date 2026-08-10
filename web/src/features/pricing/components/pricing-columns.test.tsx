import { renderHook } from '@testing-library/react'

vi.mock('@/lib/lobe-icon', () => ({
  getLobeIcon: (_key: string, _size: number) => null,
}))

vi.mock('../lib/dynamic-price', () => ({
  getDynamicDisplayGroupRatio: () => 1,
  getDynamicPricingSummary: vi.fn().mockReturnValue(null),
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

import { usePricingColumns } from './pricing-columns'

describe('usePricingColumns', () => {
  test('returns columns with default options', () => {
    const { result } = renderHook(() => usePricingColumns())
    expect(result.current.length).toBeGreaterThan(0)
  })

  test('returns model_name column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const modelCol = result.current.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'model_name'
    )
    expect(modelCol).toBeDefined()
  })

  test('returns quota_type column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const typeCol = result.current.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'quota_type'
    )
    expect(typeCol).toBeDefined()
  })

  test('returns price column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const priceCol = result.current.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'price'
    )
    expect(priceCol).toBeDefined()
  })

  test('returns cached_price column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const cacheCol = result.current.find((col) => 'id' in col && col.id === 'cached_price')
    expect(cacheCol).toBeDefined()
  })

  test('returns vendor_name column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const vendorCol = result.current.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'vendor_name'
    )
    expect(vendorCol).toBeDefined()
  })

  test('returns tags column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const tagsCol = result.current.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'tags'
    )
    expect(tagsCol).toBeDefined()
  })

  test('returns enable_groups column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const groupsCol = result.current.find(
      (col) => 'accessorKey' in col && col.accessorKey === 'enable_groups'
    )
    expect(groupsCol).toBeDefined()
  })

  test('returns supported_endpoint_types column', () => {
    const { result } = renderHook(() => usePricingColumns())
    const endpointsCol = result.current.find(
      (col) =>
        'accessorKey' in col && col.accessorKey === 'supported_endpoint_types'
    )
    expect(endpointsCol).toBeDefined()
  })

  test('accepts custom options', () => {
    const { result } = renderHook(() =>
      usePricingColumns({
        tokenUnit: 'K',
        priceRate: 2,
        usdExchangeRate: 7.2,
        showRechargePrice: true,
        selectedGroup: 'premium',
      })
    )
    expect(result.current.length).toBeGreaterThan(0)
  })
})
