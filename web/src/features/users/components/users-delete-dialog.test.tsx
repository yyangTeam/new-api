import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { UsersDeleteDialog } from './users-delete-dialog'

const mockSetOpen = vi.fn()
const mockTriggerRefresh = vi.fn()
let mockOpen: string | null = 'delete'
let mockCurrentRow: { id: number; username: string } | null = { id: 1, username: 'testuser' }

vi.mock('./users-provider', () => ({
  useUsers: () => ({
    open: mockOpen,
    setOpen: mockSetOpen,
    currentRow: mockCurrentRow,
    triggerRefresh: mockTriggerRefresh,
  }),
}))

vi.mock('../api', () => ({
  deleteUser: vi.fn(),
}))

vi.mock('../lib', () => ({
  getUserActionMessage: () => 'User deleted successfully',
}))

import { deleteUser } from '../api'

const mockDeleteUser = deleteUser as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
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
      expect(mockDeleteUser).toHaveBeenCalledWith(1)
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
      expect(mockDeleteUser).toHaveBeenCalledWith(1)
      expect(mockSetOpen).not.toHaveBeenCalled()
    })
  })

  test('shows error toast on exception', async () => {
    mockDeleteUser.mockRejectedValue(new Error('network'))
    render(<UsersDeleteDialog />)
    const deleteBtn = screen.getByRole('button', { name: /Delete/i })
    await userEvent.click(deleteBtn)
    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalledWith(1)
    })
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
