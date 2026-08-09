import { describe, it, expect, vi, beforeEach } from 'vitest'

import { handleDeleteVendor } from './vendor-actions'

const mockDeleteVendor = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock('../api', () => ({
  deleteVendor: (...args: unknown[]) => mockDeleteVendor(...args),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('./query-keys', () => ({
  vendorsQueryKeys: { lists: () => ['vendors', 'list'] },
  modelsQueryKeys: { lists: () => ['models', 'list'] },
}))

describe('handleDeleteVendor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes vendor successfully and invalidates queries', async () => {
    mockDeleteVendor.mockResolvedValue({ success: true })
    const mockQueryClient = {
      invalidateQueries: vi.fn(),
    }
    const onSuccess = vi.fn()

    await handleDeleteVendor(5, mockQueryClient as any, onSuccess)

    expect(mockDeleteVendor).toHaveBeenCalledWith(5)
    expect(mockToastSuccess).toHaveBeenCalled()
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows error toast when API returns failure', async () => {
    mockDeleteVendor.mockResolvedValue({ success: false, message: 'Vendor has models' })

    await handleDeleteVendor(3)

    expect(mockToastError).toHaveBeenCalledWith('Vendor has models')
  })

  it('shows fallback error when message is empty', async () => {
    mockDeleteVendor.mockResolvedValue({ success: false })

    await handleDeleteVendor(3)

    expect(mockToastError).toHaveBeenCalled()
  })

  it('handles exception', async () => {
    mockDeleteVendor.mockRejectedValue(new Error('Network failure'))

    await handleDeleteVendor(3)

    expect(mockToastError).toHaveBeenCalledWith('Network failure')
  })

  it('handles exception without message', async () => {
    mockDeleteVendor.mockRejectedValue({})

    await handleDeleteVendor(3)

    expect(mockToastError).toHaveBeenCalled()
  })

  it('works without queryClient and onSuccess', async () => {
    mockDeleteVendor.mockResolvedValue({ success: true })

    await handleDeleteVendor(1)

    expect(mockToastSuccess).toHaveBeenCalled()
  })
})
