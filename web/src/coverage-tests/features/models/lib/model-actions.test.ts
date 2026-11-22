import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type QueryClient } from '@tanstack/react-query'

import {
  handleEnableModel,
  handleDisableModel,
  handleToggleModelStatus,
  handleBatchEnableModels,
  handleBatchDisableModels,
} from '@/features/models/lib/model-actions'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/features/models/api', () => ({
  updateModelStatus: vi.fn(),
}))

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('@/features/models/vendor-api', () => ({
  invalidateVendorData: vi.fn(),
}))

import { toast } from 'sonner'
import { updateModelStatus } from '@/features/models/api'
import { handleServerError } from '@/lib/handle-server-error'
import { invalidateVendorData } from '@/features/models/vendor-api'

const mockUpdateModelStatus = vi.mocked(updateModelStatus)
const mockHandleServerError = vi.mocked(handleServerError)
const mockInvalidateVendorData = vi.mocked(invalidateVendorData)

function createMockQueryClient(): QueryClient {
  return {
    invalidateQueries: vi.fn(),
  } as unknown as QueryClient
}

describe('model-actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleEnableModel', () => {
    it('calls updateModelStatus with status 1', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      await handleEnableModel(42)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(42, 1)
    })

    it('shows success toast on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      await handleEnableModel(1)
      expect(toast.success).toHaveBeenCalledWith(
        'Model shown in model square'
      )
    })

    it('invalidates vendor data on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      await handleEnableModel(1, qc)
      expect(mockInvalidateVendorData).toHaveBeenCalledWith(qc)
    })

    it('calls onSuccess callback on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const onSuccess = vi.fn()
      await handleEnableModel(1, undefined, onSuccess)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('calls handleServerError when API returns success=false', async () => {
      const response = {
        success: false,
        message: 'Permission denied',
      }
      mockUpdateModelStatus.mockResolvedValue(response)
      await handleEnableModel(1)
      expect(mockHandleServerError).toHaveBeenCalledWith(
        response,
        'Failed to show model in model square'
      )
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('calls handleServerError on network/throw error', async () => {
      const error = new Error('Network error')
      mockUpdateModelStatus.mockRejectedValue(error)
      await handleEnableModel(1)
      expect(mockHandleServerError).toHaveBeenCalledWith(
        error,
        'Failed to show model in model square'
      )
    })

    it('does not invalidate vendor data on failure', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: false })
      const qc = createMockQueryClient()
      await handleEnableModel(1, qc)
      expect(mockInvalidateVendorData).not.toHaveBeenCalled()
    })

    it('does not call onSuccess on failure', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: false })
      const onSuccess = vi.fn()
      await handleEnableModel(1, undefined, onSuccess)
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('handleDisableModel', () => {
    it('calls updateModelStatus with status 0', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      await handleDisableModel(7)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(7, 0)
    })

    it('shows success toast on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      await handleDisableModel(1)
      expect(toast.success).toHaveBeenCalledWith(
        'Model hidden from model square'
      )
    })

    it('invalidates vendor data on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      await handleDisableModel(1, qc)
      expect(mockInvalidateVendorData).toHaveBeenCalledWith(qc)
    })

    it('calls handleServerError when API returns success=false', async () => {
      const response = {
        success: false,
        message: 'Model not found',
      }
      mockUpdateModelStatus.mockResolvedValue(response)
      await handleDisableModel(1)
      expect(mockHandleServerError).toHaveBeenCalledWith(
        response,
        'Failed to hide model from model square'
      )
    })

    it('calls handleServerError on thrown error', async () => {
      const error = new Error('Timeout')
      mockUpdateModelStatus.mockRejectedValue(error)
      await handleDisableModel(1)
      expect(mockHandleServerError).toHaveBeenCalledWith(
        error,
        'Failed to hide model from model square'
      )
    })
  })

  describe('handleToggleModelStatus', () => {
    it('calls handleDisableModel when currentStatus is 1', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      await handleToggleModelStatus(5, 1)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(5, 0)
    })

    it('calls handleEnableModel when currentStatus is 0', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      await handleToggleModelStatus(5, 0)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(5, 1)
    })

    it('passes queryClient and onSuccess through', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      const onSuccess = vi.fn()
      await handleToggleModelStatus(5, 0, qc, onSuccess)
      expect(mockInvalidateVendorData).toHaveBeenCalledWith(qc)
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  describe('handleBatchEnableModels', () => {
    it('shows error toast for empty ids', async () => {
      await handleBatchEnableModels([])
      expect(toast.error).toHaveBeenCalledWith(
        'Please select at least one model'
      )
      expect(mockUpdateModelStatus).not.toHaveBeenCalled()
    })

    it('enables all models and shows success count', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      const onSuccess = vi.fn()
      await handleBatchEnableModels([1, 2], qc, onSuccess)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(1, 1)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(2, 1)
      expect(toast.success).toHaveBeenCalled()
      expect(mockInvalidateVendorData).toHaveBeenCalledWith(qc)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('reports partial failures', async () => {
      mockUpdateModelStatus
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, message: 'err' })
      await handleBatchEnableModels([1, 2])
      expect(toast.success).toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalled()
    })

    it('calls handleServerError on thrown error', async () => {
      const error = new Error('Batch failed')
      mockUpdateModelStatus.mockRejectedValue(error)
      await handleBatchEnableModels([1])
      expect(mockHandleServerError).toHaveBeenCalledWith(
        error,
        'Batch enable failed'
      )
    })
  })

  describe('handleBatchDisableModels', () => {
    it('shows error toast for empty ids', async () => {
      await handleBatchDisableModels([])
      expect(toast.error).toHaveBeenCalledWith(
        'Please select at least one model'
      )
      expect(mockUpdateModelStatus).not.toHaveBeenCalled()
    })

    it('disables all models and shows success count', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      const onSuccess = vi.fn()
      await handleBatchDisableModels([3, 4], qc, onSuccess)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(3, 0)
      expect(mockUpdateModelStatus).toHaveBeenCalledWith(4, 0)
      expect(toast.success).toHaveBeenCalled()
      expect(mockInvalidateVendorData).toHaveBeenCalledWith(qc)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('reports partial failures', async () => {
      mockUpdateModelStatus
        .mockResolvedValueOnce({ success: false, message: 'err' })
        .mockResolvedValueOnce({ success: true })
      await handleBatchDisableModels([1, 2])
      expect(toast.success).toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalled()
    })

    it('calls handleServerError on thrown error', async () => {
      const error = new Error('Timeout')
      mockUpdateModelStatus.mockRejectedValue(error)
      await handleBatchDisableModels([1])
      expect(mockHandleServerError).toHaveBeenCalledWith(
        error,
        'Batch disable failed'
      )
    })
  })
})
