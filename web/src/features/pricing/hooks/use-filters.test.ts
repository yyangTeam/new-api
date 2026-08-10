import { renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
}))

vi.mock('../lib/filters', () => ({
  filterAndSortModels: vi.fn((models) => models),
  extractAllTags: vi.fn(() => ['chat', 'embedding']),
}))

import { useFilters } from './use-filters'
import type { PricingModel } from '../types'

const mockModels: PricingModel[] = [
  {
    id: 1,
    model_name: 'gpt-4',
    quota_type: 0,
    model_ratio: 30,
    completion_ratio: 2,
    enable_groups: ['default'],
    tags: 'chat',
  },
  {
    id: 2,
    model_name: 'embed-v2',
    quota_type: 0,
    model_ratio: 0.1,
    completion_ratio: 0,
    enable_groups: ['default'],
    tags: 'embedding',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useFilters', () => {
  test('returns default filter values', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    expect(result.current.searchInput).toBe('')
    expect(result.current.sortBy).toBe('name')
    expect(result.current.vendorFilter).toBe('all')
    expect(result.current.groupFilter).toBe('all')
    expect(result.current.quotaTypeFilter).toBe('all')
    expect(result.current.endpointTypeFilter).toBe('all')
    expect(result.current.tagFilter).toBe('all')
    expect(result.current.tokenUnit).toBe('M')
    expect(result.current.viewMode).toBe('card')
    expect(result.current.showRechargePrice).toBe(false)
  })

  test('setSearchInput updates search', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setSearchInput('gpt') })
    expect(result.current.searchInput).toBe('gpt')
  })

  test('setSearchInput with empty clears search', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setSearchInput('gpt') })
    act(() => { result.current.setSearchInput('') })
    expect(result.current.searchInput).toBe('')
  })

  test('setSortBy updates sortBy', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setSortBy('price-low') })
    expect(result.current.sortBy).toBe('price-low')
  })

  test('setSortBy to name resets to default', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setSortBy('price-high') })
    act(() => { result.current.setSortBy('name') })
    expect(result.current.sortBy).toBe('name')
  })

  test('setVendorFilter updates vendor', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setVendorFilter('OpenAI') })
    expect(result.current.vendorFilter).toBe('OpenAI')
  })

  test('setVendorFilter to all resets', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setVendorFilter('OpenAI') })
    act(() => { result.current.setVendorFilter('all') })
    expect(result.current.vendorFilter).toBe('all')
  })

  test('setGroupFilter updates group', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setGroupFilter('vip') })
    expect(result.current.groupFilter).toBe('vip')
  })

  test('setQuotaTypeFilter updates quotaType', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setQuotaTypeFilter('token') })
    expect(result.current.quotaTypeFilter).toBe('token')
  })

  test('setEndpointTypeFilter updates endpointType', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setEndpointTypeFilter('openai') })
    expect(result.current.endpointTypeFilter).toBe('openai')
  })

  test('setTagFilter updates tag', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setTagFilter('chat') })
    expect(result.current.tagFilter).toBe('chat')
  })

  test('setTokenUnit updates token unit', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setTokenUnit('K') })
    expect(result.current.tokenUnit).toBe('K')
  })

  test('setViewMode updates view mode', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setViewMode('table') })
    expect(result.current.viewMode).toBe('table')
  })

  test('setViewMode to card resets', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setViewMode('table') })
    act(() => { result.current.setViewMode('card') })
    expect(result.current.viewMode).toBe('card')
  })

  test('setShowRechargePrice updates flag', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setShowRechargePrice(true) })
    expect(result.current.showRechargePrice).toBe(true)
  })

  test('setShowRechargePrice(false) clears flag', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setShowRechargePrice(true) })
    act(() => { result.current.setShowRechargePrice(false) })
    expect(result.current.showRechargePrice).toBe(false)
  })

  test('hasActiveFilters is false when all defaults', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    expect(result.current.hasActiveFilters).toBe(false)
  })

  test('hasActiveFilters is true with a filter set', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setVendorFilter('OpenAI') })
    expect(result.current.hasActiveFilters).toBe(true)
  })

  test('activeFilterCount counts active filters', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setVendorFilter('OpenAI') })
    act(() => { result.current.setGroupFilter('vip') })
    expect(result.current.activeFilterCount).toBe(2)
  })

  test('clearFilters resets all filter values', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => {
      result.current.setVendorFilter('OpenAI')
      result.current.setGroupFilter('vip')
      result.current.setQuotaTypeFilter('token')
    })
    act(() => { result.current.clearFilters() })
    expect(result.current.vendorFilter).toBe('all')
    expect(result.current.groupFilter).toBe('all')
    expect(result.current.quotaTypeFilter).toBe('all')
    expect(result.current.hasActiveFilters).toBe(false)
  })

  test('clearSearch clears search input', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    act(() => { result.current.setSearchInput('test') })
    act(() => { result.current.clearSearch() })
    expect(result.current.searchInput).toBe('')
  })

  test('availableTags is extracted from models', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    expect(result.current.availableTags).toEqual(['chat', 'embedding'])
  })

  test('availableTags is empty when models are empty', () => {
    const { result } = renderHook(() => useFilters([]))
    expect(result.current.availableTags).toEqual([])
  })

  test('filteredModels returns models (delegated to filterAndSortModels)', () => {
    const { result } = renderHook(() => useFilters(mockModels))
    expect(result.current.filteredModels).toEqual(mockModels)
  })

  test('filteredModels is empty when models is empty', () => {
    const { result } = renderHook(() => useFilters([]))
    expect(result.current.filteredModels).toEqual([])
  })
})
