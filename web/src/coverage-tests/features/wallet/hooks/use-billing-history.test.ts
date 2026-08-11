import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useBillingHistory } from '@/features/wallet/hooks/use-billing-history'

const mockGetUserBillingHistory = vi.fn()
const mockGetAllBillingHistory = vi.fn()
const mockCompleteOrder = vi.fn()
const mockIsApiSuccess = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
let mockIsAdmin = false

vi.mock('@/features/wallet/api', () => ({
  getUserBillingHistory: (...args: unknown[]) => mockGetUserBillingHistory(...args),
  getAllBillingHistory: (...args: unknown[]) => mockGetAllBillingHistory(...args),
  completeOrder: (...args: unknown[]) => mockCompleteOrder(...args),
  isApiSuccess: (...args: unknown[]) => mockIsApiSuccess(...args),
}))

vi.mock('@/hooks/use-admin', () => ({
  useIsAdmin: () => mockIsAdmin,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

describe('useBillingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAdmin = false
    mockIsApiSuccess.mockImplementation((res: { success?: boolean; message?: string }) => {
      return res.success === true || res.message === 'success'
    })
    mockGetUserBillingHistory.mockResolvedValue({
      success: true,
      data: { items: [{ id: 1 }], total: 1 },
    })
    mockGetAllBillingHistory.mockResolvedValue({
      success: true,
      data: { items: [{ id: 2 }], total: 2 },
    })
  })

  it('fetches user billing history on mount for non-admin', async () => {
    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockGetUserBillingHistory).toHaveBeenCalledWith(1, 10, '')
    expect(result.current.records).toEqual([{ id: 1 }])
    expect(result.current.total).toBe(1)
    expect(result.current.loading).toBe(false)
  })

  it('fetches all billing history for admin', async () => {
    mockIsAdmin = true

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockGetAllBillingHistory).toHaveBeenCalledWith(1, 10, '')
    expect(result.current.records).toEqual([{ id: 2 }])
    expect(result.current.total).toBe(2)
  })

  it('uses custom initial page and page size', async () => {
    const { result } = renderHook(() =>
      useBillingHistory({ initialPage: 3, initialPageSize: 25 })
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockGetUserBillingHistory).toHaveBeenCalledWith(3, 25, '')
    expect(result.current.page).toBe(3)
    expect(result.current.pageSize).toBe(25)
  })

  it('handles API failure response', async () => {
    mockGetUserBillingHistory.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
    })

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.records).toEqual([])
    expect(result.current.total).toBe(0)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('handles API exception', async () => {
    mockGetUserBillingHistory.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.records).toEqual([])
    expect(result.current.total).toBe(0)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('changes page correctly', async () => {
    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => {
      result.current.handlePageChange(5)
    })

    expect(result.current.page).toBe(5)
  })

  it('changes page size and resets to page 1', async () => {
    const { result } = renderHook(() =>
      useBillingHistory({ initialPage: 3 })
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => {
      result.current.handlePageSizeChange(50)
    })

    expect(result.current.pageSize).toBe(50)
    expect(result.current.page).toBe(1)
  })

  it('handles search and resets to page 1', async () => {
    const { result } = renderHook(() =>
      useBillingHistory({ initialPage: 2 })
    )

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => {
      result.current.handleSearch('stripe')
    })

    expect(result.current.keyword).toBe('stripe')
    expect(result.current.page).toBe(1)
  })

  it('completes order successfully as admin', async () => {
    mockIsAdmin = true
    mockCompleteOrder.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let orderResult: boolean = false
    await act(async () => {
      orderResult = await result.current.handleCompleteOrder('TRADE_001')
    })

    expect(orderResult).toBe(true)
    expect(mockCompleteOrder).toHaveBeenCalledWith({ trade_no: 'TRADE_001' })
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('rejects complete order for non-admin', async () => {
    mockIsAdmin = false

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let orderResult: boolean = true
    await act(async () => {
      orderResult = await result.current.handleCompleteOrder('TRADE_001')
    })

    expect(orderResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
    expect(mockCompleteOrder).not.toHaveBeenCalled()
  })

  it('handles complete order API failure', async () => {
    mockIsAdmin = true
    mockCompleteOrder.mockResolvedValue({ success: false, message: 'Order not found' })

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let orderResult: boolean = true
    await act(async () => {
      orderResult = await result.current.handleCompleteOrder('BAD')
    })

    expect(orderResult).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Order not found')
  })

  it('handles complete order exception', async () => {
    mockIsAdmin = true
    mockCompleteOrder.mockRejectedValue(new Error('Server error'))

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let orderResult: boolean = true
    await act(async () => {
      orderResult = await result.current.handleCompleteOrder('TRADE')
    })

    expect(orderResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('sets completing state during order completion', async () => {
    mockIsAdmin = true
    let resolveComplete: (val: unknown) => void = () => {}
    mockCompleteOrder.mockImplementation(
      () => new Promise((resolve) => { resolveComplete = resolve })
    )

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let completePromise: Promise<boolean>
    act(() => {
      completePromise = result.current.handleCompleteOrder('TRADE_X')
    })

    expect(result.current.completing).toBe(true)

    await act(async () => {
      resolveComplete({ success: true })
      await completePromise!
    })

    expect(result.current.completing).toBe(false)
  })

  it('exposes isAdmin from hook', () => {
    mockIsAdmin = true
    const { result } = renderHook(() => useBillingHistory())
    expect(result.current.isAdmin).toBe(true)
  })

  it('handles response with missing data items', async () => {
    mockGetUserBillingHistory.mockResolvedValue({
      success: true,
      data: { total: 0 },
    })

    const { result } = renderHook(() => useBillingHistory())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.records).toEqual([])
    expect(result.current.total).toBe(0)
  })
})
