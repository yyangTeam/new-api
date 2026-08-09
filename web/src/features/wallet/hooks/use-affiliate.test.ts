import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useAffiliate } from './use-affiliate'

const mockGetAffiliateCode = vi.fn()
const mockTransferAffiliateQuota = vi.fn()
const mockGetSelf = vi.fn()
const mockCopyToClipboard = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('../api', () => ({
  getAffiliateCode: (...args: unknown[]) => mockGetAffiliateCode(...args),
  transferAffiliateQuota: (...args: unknown[]) => mockTransferAffiliateQuota(...args),
}))

vi.mock('@/lib/api', () => ({
  getSelf: (...args: unknown[]) => mockGetSelf(...args),
}))

vi.mock('@/hooks/use-copy-to-clipboard', () => ({
  useCopyToClipboard: () => ({ copyToClipboard: mockCopyToClipboard }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('../lib', () => ({
  generateAffiliateLink: (code: string) => `http://localhost/sign-up?aff=${code}`,
}))

describe('useAffiliate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSelf.mockResolvedValue(undefined)
    mockGetAffiliateCode.mockResolvedValue({ success: true, data: 'ABC123' })
  })

  it('fetches affiliate code on mount', async () => {
    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.affiliateCode).toBe('ABC123')
    expect(result.current.affiliateLink).toBe('http://localhost/sign-up?aff=ABC123')
    expect(result.current.loading).toBe(false)
  })

  it('starts in loading state', () => {
    mockGetAffiliateCode.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useAffiliate())
    expect(result.current.loading).toBe(true)
  })

  it('handles failed fetch gracefully', async () => {
    mockGetAffiliateCode.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.affiliateCode).toBe('')
    expect(result.current.loading).toBe(false)
  })

  it('handles response without success', async () => {
    mockGetAffiliateCode.mockResolvedValue({ success: false })

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(result.current.affiliateCode).toBe('')
  })

  it('copies affiliate link to clipboard', async () => {
    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    act(() => {
      result.current.copyAffiliateLink()
    })

    expect(mockCopyToClipboard).toHaveBeenCalledWith('http://localhost/sign-up?aff=ABC123')
  })

  it('transfers quota successfully', async () => {
    mockTransferAffiliateQuota.mockResolvedValue({ success: true, message: 'OK' })

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let transferResult: boolean = false
    await act(async () => {
      transferResult = await result.current.transferQuota(500)
    })

    expect(transferResult).toBe(true)
    expect(mockTransferAffiliateQuota).toHaveBeenCalledWith({ quota: 500 })
    expect(mockToastSuccess).toHaveBeenCalled()
    expect(mockGetSelf).toHaveBeenCalled()
  })

  it('handles transfer failure from API response', async () => {
    mockTransferAffiliateQuota.mockResolvedValue({ success: false, message: 'Insufficient quota' })

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let transferResult: boolean = true
    await act(async () => {
      transferResult = await result.current.transferQuota(9999)
    })

    expect(transferResult).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Insufficient quota')
  })

  it('handles transfer exception', async () => {
    mockTransferAffiliateQuota.mockRejectedValue(new Error('Network'))

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let transferResult: boolean = true
    await act(async () => {
      transferResult = await result.current.transferQuota(100)
    })

    expect(transferResult).toBe(false)
    expect(mockToastError).toHaveBeenCalled()
  })

  it('sets transferring state during transfer', async () => {
    let resolveTransfer: (value: unknown) => void = () => {}
    mockTransferAffiliateQuota.mockImplementation(
      () => new Promise((resolve) => { resolveTransfer = resolve })
    )

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    let transferPromise: Promise<boolean>
    act(() => {
      transferPromise = result.current.transferQuota(100)
    })

    expect(result.current.transferring).toBe(true)

    await act(async () => {
      resolveTransfer({ success: true })
      await transferPromise!
    })

    expect(result.current.transferring).toBe(false)
  })

  it('refetch calls fetchAffiliateCode again', async () => {
    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    mockGetAffiliateCode.mockResolvedValue({ success: true, data: 'NEW_CODE' })

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.affiliateCode).toBe('NEW_CODE')
  })

  it('uses fallback error message for transfer when no message', async () => {
    mockTransferAffiliateQuota.mockResolvedValue({ success: false, message: '' })

    const { result } = renderHook(() => useAffiliate())

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    await act(async () => {
      await result.current.transferQuota(100)
    })

    expect(mockToastError).toHaveBeenCalled()
  })
})
