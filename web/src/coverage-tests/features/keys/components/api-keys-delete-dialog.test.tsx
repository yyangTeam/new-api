import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { ApiKeysDeleteDialog } from '@/features/keys/components/api-keys-delete-dialog'

const mockSetOpen = vi.fn()
const mockTriggerRefresh = vi.fn()
let mockOpen: string | null = 'delete'
let mockCurrentRow: { id: number; name: string } | null = { id: 1, name: 'My Key' }

vi.mock('@/features/keys/components/api-keys-provider', () => ({
  useApiKeys: () => ({
    open: mockOpen,
    setOpen: mockSetOpen,
    currentRow: mockCurrentRow,
    triggerRefresh: mockTriggerRefresh,
  }),
}))

vi.mock('@/features/keys/api', () => ({
  deleteApiKey: vi.fn(),
}))

import { deleteApiKey } from '@/features/keys/api'

const mockDelete = deleteApiKey as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockOpen = 'delete'
  mockCurrentRow = { id: 1, name: 'My Key' }
})

describe('ApiKeysDeleteDialog', () => {
  test('renders when open is delete', () => {
    render(<ApiKeysDeleteDialog />)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('My Key')).toBeInTheDocument()
  })

  test('calls deleteApiKey on confirm success', async () => {
    mockDelete.mockResolvedValue({ success: true })
    render(<ApiKeysDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1)
      expect(mockSetOpen).toHaveBeenCalledWith(null)
      expect(mockTriggerRefresh).toHaveBeenCalled()
    })
  })

  test('shows error on failure', async () => {
    mockDelete.mockResolvedValue({ success: false, message: 'Denied' })
    render(<ApiKeysDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1)
      expect(mockSetOpen).not.toHaveBeenCalled()
    })
  })

  test('shows error on exception', async () => {
    mockDelete.mockRejectedValue(new Error('net'))
    render(<ApiKeysDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(1)
    })
  })

  test('does nothing when currentRow is null', async () => {
    mockCurrentRow = null
    render(<ApiKeysDeleteDialog />)
    const deleteBtn = screen.queryByRole('button', { name: /Delete/i })
    if (deleteBtn) {
      await userEvent.click(deleteBtn)
      expect(mockDelete).not.toHaveBeenCalled()
    }
  })
})
