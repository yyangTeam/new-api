import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'

import { UsersPrimaryButtons } from './users-primary-buttons'

const mockSetOpen = vi.fn()
const mockSetCurrentRow = vi.fn()

vi.mock('./users-provider', () => ({
  useUsers: () => ({
    setOpen: mockSetOpen,
    setCurrentRow: mockSetCurrentRow,
  }),
}))

describe('UsersPrimaryButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders Add User button', () => {
    render(<UsersPrimaryButtons />)
    expect(screen.getByText('Add User')).toBeInTheDocument()
  })

  test('clicking Add User sets open to create and row to null', () => {
    render(<UsersPrimaryButtons />)
    screen.getByText('Add User').click()
    expect(mockSetCurrentRow).toHaveBeenCalledWith(null)
    expect(mockSetOpen).toHaveBeenCalledWith('create')
  })
})
