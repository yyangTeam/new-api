import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { deleteUser } from '@/features/users/api'
import { UsersDeleteDialog } from '@/features/users/components/users-delete-dialog'

const mockSetOpen = vi.fn()
const mockTriggerRefresh = vi.fn()
const mockRequestVerification = vi.fn()
const mockToastError = vi.fn()
let mockOpen: string | null = 'delete'
let mockCurrentRow: { id: number; username: string } | null = {
  id: 1,
  username: 'testuser',
}

vi.mock('@/features/users/components/users-provider', () => ({
  useUsers: () => ({
    open: mockOpen,
    setOpen: mockSetOpen,
    currentRow: mockCurrentRow,
    triggerRefresh: mockTriggerRefresh,
    requestVerification: mockRequestVerification,
    verificationActive: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock('@/features/users/api', () => ({
  deleteUser: vi.fn(),
}))

vi.mock('@/features/users/lib', () => ({
  getUserActionMessage: () => 'User deleted successfully',
}))

const mockDeleteUser = deleteUser as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockRequestVerification.mockResolvedValue({ proof_token: 'delete-proof' })
  mockOpen = 'delete'
  mockCurrentRow = { id: 1, username: 'testuser' }
})

describe('UsersDeleteDialog', () => {
  test('renders dialog when open is delete', () => {
    render(<UsersDeleteDialog />)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  test('calls deleteUser on confirm and triggers refresh on success', async () => {
    mockDeleteUser.mockResolvedValue({ success: true })
    render(<UsersDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockRequestVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'admin.user.delete',
          context: { user_id: 1 },
        })
      )
      expect(mockDeleteUser).toHaveBeenCalledWith(1, 'delete-proof')
      expect(mockSetOpen).toHaveBeenCalledWith(null)
      expect(mockTriggerRefresh).toHaveBeenCalled()
    })
  })

  test('shows error toast on failure', async () => {
    mockDeleteUser.mockResolvedValue({ success: false, message: 'Not allowed' })
    render(<UsersDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith(1, 'delete-proof')
      expect(mockToastError).toHaveBeenCalled()
      expect(mockSetOpen).not.toHaveBeenCalled()
    })
  })

  test('shows error toast on exception', async () => {
    mockDeleteUser.mockRejectedValue(new Error('network'))
    render(<UsersDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith(1, 'delete-proof')
      expect(mockToastError).toHaveBeenCalled()
    })
  })

  test('does not delete when verification is cancelled', async () => {
    mockRequestVerification.mockResolvedValue(null)
    render(<UsersDeleteDialog />)

    await userEvent.click(screen.getByRole('button', { name: /Delete/i }))

    expect(mockRequestVerification).toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
    expect(mockSetOpen).not.toHaveBeenCalled()
  })

  test('does nothing when currentRow is null', async () => {
    mockCurrentRow = null
    render(<UsersDeleteDialog />)
    // The dialog still renders but delete does nothing
    const deleteBtn = screen.queryByRole('button', { name: /Delete/i })
    if (deleteBtn) {
      await userEvent.click(deleteBtn)
      expect(mockDeleteUser).not.toHaveBeenCalled()
    }
  })
})
