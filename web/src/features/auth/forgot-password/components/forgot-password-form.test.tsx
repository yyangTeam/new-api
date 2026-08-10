import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

import { render, screen, userEvent, waitFor } from '@/test/test-utils'

import { ForgotPasswordForm } from './forgot-password-form'

// ---------------------------------------------------------------------------
// Mock ONLY external dependencies
// ---------------------------------------------------------------------------

const mockUseStatus = vi.fn()
const mockSendPasswordResetEmail = vi.fn()

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => mockUseStatus(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/features/auth/api', () => ({
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
}))

// Turnstile is a browser widget, must mock
vi.mock('@/components/turnstile', () => ({
  Turnstile: () => <div data-testid='turnstile' />,
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({
      status: {},
      loading: false,
    })
  })

  it('renders email input and send reset email button', () => {
    render(<ForgotPasswordForm />)

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /send reset email/i })
    ).toBeInTheDocument()
  })

  it('does not render turnstile when disabled', () => {
    render(<ForgotPasswordForm />)

    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument()
  })

  it('renders turnstile when enabled', () => {
    mockUseStatus.mockReturnValue({
      status: {
        turnstile_check: true,
        turnstile_site_key: 'site-key',
      },
      loading: false,
    })

    render(<ForgotPasswordForm />)

    expect(screen.getByTestId('turnstile')).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    render(<ForgotPasswordForm />)
    const user = userEvent.setup()

    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'notanemail'
    )
    await user.click(
      screen.getByRole('button', { name: /send reset email/i })
    )

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument()
    })
  })

  it('shows validation error for empty email', async () => {
    render(<ForgotPasswordForm />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /send reset email/i })
    )

    await waitFor(() => {
      expect(
        screen.getByText('Please enter a valid email address')
      ).toBeInTheDocument()
    })
  })

  it('calls sendPasswordResetEmail on valid submission', async () => {
    mockSendPasswordResetEmail.mockResolvedValue({ success: true })

    render(<ForgotPasswordForm />)
    const user = userEvent.setup()

    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'test@example.com'
    )
    await user.click(
      screen.getByRole('button', { name: /send reset email/i })
    )

    await waitFor(() => {
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        ''
      )
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Reset email sent, please check your inbox'
      )
    })
  })

  it('shows error toast when send fails', async () => {
    mockSendPasswordResetEmail.mockResolvedValue({
      success: false,
      message: 'Email not found',
    })

    render(<ForgotPasswordForm />)
    const user = userEvent.setup()

    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'unknown@example.com'
    )
    await user.click(
      screen.getByRole('button', { name: /send reset email/i })
    )

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Email not found')
    })
  })

  it('disables button during countdown after successful send', async () => {
    mockSendPasswordResetEmail.mockResolvedValue({ success: true })

    render(<ForgotPasswordForm />)
    const user = userEvent.setup()

    await user.type(
      screen.getByPlaceholderText('name@example.com'),
      'test@example.com'
    )
    await user.click(
      screen.getByRole('button', { name: /send reset email/i })
    )

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
    })

    // After successful send, the countdown should start and button text changes
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /resend/i })
      expect(btn).toBeDisabled()
    })
  })
})
