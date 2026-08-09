import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

import {
  useStatusData,
  useApiInfo,
  useAnnouncements,
  useFAQ,
  useDashboardContentVisibility,
} from './use-status-data'

const mockUseStatus = vi.fn()

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => mockUseStatus(),
}))

describe('useStatusData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty items when status is null', () => {
    mockUseStatus.mockReturnValue({ status: null, loading: false })
    const { result } = renderHook(() =>
      useStatusData('api_info_enabled', 'api_info')
    )

    expect(result.current.items).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('returns empty items when the enabled key is false', () => {
    mockUseStatus.mockReturnValue({
      status: {
        api_info_enabled: false,
        api_info: [{ url: 'http://example.com' }],
      },
      loading: false,
    })
    const { result } = renderHook(() =>
      useStatusData('api_info_enabled', 'api_info')
    )

    expect(result.current.items).toEqual([])
  })

  it('returns items when enabled key is not false', () => {
    const items = [
      { url: 'http://api1.com', route: '/v1', description: 'API 1', color: 'blue' },
    ]
    mockUseStatus.mockReturnValue({
      status: {
        api_info_enabled: true,
        api_info: items,
      },
      loading: false,
    })
    const { result } = renderHook(() =>
      useStatusData('api_info_enabled', 'api_info')
    )

    expect(result.current.items).toEqual(items)
  })

  it('returns loading state from useStatus', () => {
    mockUseStatus.mockReturnValue({ status: null, loading: true })
    const { result } = renderHook(() =>
      useStatusData('key', 'data')
    )

    expect(result.current.loading).toBe(true)
  })
})

describe('useApiInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns api_info items when enabled', () => {
    const items = [
      { url: 'http://api.com', route: '/v1/chat', description: 'Chat', color: 'green' },
    ]
    mockUseStatus.mockReturnValue({
      status: { api_info_enabled: true, api_info: items },
      loading: false,
    })
    const { result } = renderHook(() => useApiInfo())

    expect(result.current.items).toEqual(items)
  })
})

describe('useAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns announcements when enabled', () => {
    const announcements = [
      { content: 'Hello world', type: 'default' as const },
    ]
    mockUseStatus.mockReturnValue({
      status: { announcements_enabled: true, announcements },
      loading: false,
    })
    const { result } = renderHook(() => useAnnouncements())

    expect(result.current.items).toEqual(announcements)
  })

  it('returns empty when announcements are disabled', () => {
    mockUseStatus.mockReturnValue({
      status: { announcements_enabled: false, announcements: [{ content: 'x' }] },
      loading: false,
    })
    const { result } = renderHook(() => useAnnouncements())

    expect(result.current.items).toEqual([])
  })
})

describe('useFAQ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns FAQ items when enabled', () => {
    const faqs = [{ question: 'Q1?', answer: 'A1' }]
    mockUseStatus.mockReturnValue({
      status: { faq_enabled: true, faq: faqs },
      loading: false,
    })
    const { result } = renderHook(() => useFAQ())

    expect(result.current.items).toEqual(faqs)
  })
})

describe('useDashboardContentVisibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all false when status is null', () => {
    mockUseStatus.mockReturnValue({ status: null, loading: false })
    const { result } = renderHook(() => useDashboardContentVisibility())

    expect(result.current.apiInfo).toBe(false)
    expect(result.current.announcements).toBe(false)
    expect(result.current.faq).toBe(false)
    expect(result.current.uptimeKuma).toBe(false)
  })

  it('returns true for each enabled panel', () => {
    mockUseStatus.mockReturnValue({
      status: {
        api_info_enabled: true,
        announcements_enabled: true,
        faq_enabled: true,
        uptime_kuma_enabled: true,
      },
      loading: false,
    })
    const { result } = renderHook(() => useDashboardContentVisibility())

    expect(result.current.apiInfo).toBe(true)
    expect(result.current.announcements).toBe(true)
    expect(result.current.faq).toBe(true)
    expect(result.current.uptimeKuma).toBe(true)
  })

  it('returns true when panel key is not explicitly false (defaults to enabled)', () => {
    mockUseStatus.mockReturnValue({
      status: {},
      loading: false,
    })
    const { result } = renderHook(() => useDashboardContentVisibility())

    // All panels default to visible when not explicitly set to false
    expect(result.current.apiInfo).toBe(true)
    expect(result.current.announcements).toBe(true)
    expect(result.current.faq).toBe(true)
    expect(result.current.uptimeKuma).toBe(true)
  })

  it('returns false for explicitly disabled panels', () => {
    mockUseStatus.mockReturnValue({
      status: {
        api_info_enabled: false,
        faq_enabled: false,
      },
      loading: false,
    })
    const { result } = renderHook(() => useDashboardContentVisibility())

    expect(result.current.apiInfo).toBe(false)
    expect(result.current.faq).toBe(false)
    expect(result.current.announcements).toBe(true)
    expect(result.current.uptimeKuma).toBe(true)
  })
})
