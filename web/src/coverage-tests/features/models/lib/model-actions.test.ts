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

import { toast } from 'sonner'
import { updateModelStatus } from '@/features/models/api'

const mockUpdateModelStatus = vi.mocked(updateModelStatus)

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
      expect(toast.success).toHaveBeenCalledWith('Model enabled successfully')
    })

    it('invalidates query cache on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      await handleEnableModel(1, qc)
      expect(qc.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['models', 'list'],
      })
    })

    it('calls onSuccess callback on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const onSuccess = vi.fn()
      await handleEnableModel(1, undefined, onSuccess)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('shows error toast when API returns success=false', async () => {
      mockUpdateModelStatus.mockResolvedValue({
        success: false,
        message: 'Permission denied',
      })
      await handleEnableModel(1)
      expect(toast.error).toHaveBeenCalledWith('Permission denied')
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('shows fallback error message when API returns no message', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: false })
      await handleEnableModel(1)
      expect(toast.error).toHaveBeenCalledWith('Failed to enable model')
    })

    it('shows error toast on network/throw error', async () => {
      mockUpdateModelStatus.mockRejectedValue(new Error('Network error'))
      await handleEnableModel(1)
      expect(toast.error).toHaveBeenCalledWith('Network error')
    })

    it('does not invalidate queries on failure', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: false })
      const qc = createMockQueryClient()
      await handleEnableModel(1, qc)
      expect(qc.invalidateQueries).not.toHaveBeenCalled()
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
      expect(toast.success).toHaveBeenCalledWith('Model disabled successfully')
    })

    it('invalidates query cache on success', async () => {
      mockUpdateModelStatus.mockResolvedValue({ success: true })
      const qc = createMockQueryClient()
      await handleDisableModel(1, qc)
      expect(qc.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['models', 'list'],
      })
    })

    it('shows error toast when API returns success=false', async () => {
      mockUpdateModelStatus.mockResolvedValue({
        success: false,
        message: 'Model not found',
      })
      await handleDisableModel(1)
      expect(toast.error).toHaveBeenCalledWith('Model not found')
    })

    it('shows error toast on thrown error', async () => {
      mockUpdateModelStatus.mockRejectedValue(new Error('Timeout'))
      await handleDisableModel(1)
      expect(toast.error).toHaveBeenCalledWith('Timeout')
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
      expect(qc.invalidateQueries).toHaveBeenCalled()
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
      expect(qc.invalidateQueries).toHaveBeenCalled()
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

    it('shows error toast on thrown error', async () => {
      mockUpdateModelStatus.mockRejectedValue(new Error('Batch failed'))
      await handleBatchEnableModels([1])
      expect(toast.error).toHaveBeenCalledWith('Batch failed')
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
      expect(qc.invalidateQueries).toHaveBeenCalled()
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

    it('shows error toast on thrown error', async () => {
      mockUpdateModelStatus.mockRejectedValue(new Error('Timeout'))
      await handleBatchDisableModels([1])
      expect(toast.error).toHaveBeenCalledWith('Timeout')
    })
  })
})
