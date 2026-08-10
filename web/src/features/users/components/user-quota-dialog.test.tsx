import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi, beforeEach } from 'vitest'

import { UserQuotaDialog } from './user-quota-dialog'

vi.mock('@/lib/currency', () => ({
  getCurrencyDisplay: () => ({ meta: { kind: 'dollars' } }),
  getCurrencyLabel: () => 'USD',
}))

vi.mock('@/lib/format', () => ({
  formatQuota: (v: number) => `$${v}`,
  parseQuotaFromDollars: (v: number) => v * 500000,
}))

vi.mock('../api', () => ({
  adjustUserQuota: vi.fn(),
}))

import { adjustUserQuota } from '../api'

const mockAdjust = adjustUserQuota as unknown as ReturnType<typeof vi.fn>

describe('UserQuotaDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    userId: 1,
    currentQuota: 1000000,
    onSuccess: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders dialog with mode buttons', () => {
    render(<UserQuotaDialog {...defaultProps} />)
    expect(screen.getByText('Add')).toBeInTheDocument()
    expect(screen.getByText('Subtract')).toBeInTheDocument()
    expect(screen.getByText('Override')).toBeInTheDocument()
  })

  test('renders amount input', () => {
    render(<UserQuotaDialog {...defaultProps} />)
    expect(screen.getByPlaceholderText(/Enter amount/)).toBeInTheDocument()
  })

  test('confirm button calls adjustUserQuota on success', async () => {
    mockAdjust.mockResolvedValue({ success: true })
    render(<UserQuotaDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Enter amount/)
    await userEvent.type(input, '5')
    const confirmBtn = screen.getByText('Confirm')
    await userEvent.click(confirmBtn)
    await waitFor(() => {
      expect(mockAdjust).toHaveBeenCalled()
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  test('cancel resets state and closes dialog', async () => {
    render(<UserQuotaDialog {...defaultProps} />)
    const cancelBtn = screen.getByText('Cancel')
    await userEvent.click(cancelBtn)
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  test('shows error toast on failed API call', async () => {
    mockAdjust.mockResolvedValue({ success: false, message: 'Insufficient' })
    render(<UserQuotaDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Enter amount/)
    await userEvent.type(input, '10')
    const confirmBtn = screen.getByText('Confirm')
    await userEvent.click(confirmBtn)
    await waitFor(() => {
      expect(mockAdjust).toHaveBeenCalled()
      expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    })
  })

  test('shows error toast on exception', async () => {
    mockAdjust.mockRejectedValue(new Error('Network'))
    render(<UserQuotaDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Enter amount/)
    await userEvent.type(input, '10')
    const confirmBtn = screen.getByText('Confirm')
    await userEvent.click(confirmBtn)
    await waitFor(() => {
      expect(mockAdjust).toHaveBeenCalled()
      expect(defaultProps.onSuccess).not.toHaveBeenCalled()
    })
  })

  test('does not submit when amount is empty in add mode', async () => {
    render(<UserQuotaDialog {...defaultProps} />)
    const confirmBtn = screen.getByText('Confirm')
    await userEvent.click(confirmBtn)
    expect(mockAdjust).not.toHaveBeenCalled()
  })

  test('switching mode clears amount', async () => {
    render(<UserQuotaDialog {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Enter amount/)
    await userEvent.type(input, '123')
    await userEvent.click(screen.getByText('Subtract'))
    expect(input).toHaveValue(null)
  })
})
