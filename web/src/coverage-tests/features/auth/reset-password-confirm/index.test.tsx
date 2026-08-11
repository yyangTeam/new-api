import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

import { render, screen, userEvent, waitFor } from '@/test/test-utils'

import { ResetPasswordConfirm } from '@/features/auth/reset-password-confirm/index'

// ---------------------------------------------------------------------------
// Mock ONLY external dependencies
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()
const mockApiPost = vi.fn()
const mockCopyToClipboard = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
}))

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'Test',
    logo: '/logo.png',
    loading: false,
  }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResetPasswordConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCopyToClipboard.mockResolvedValue(true)
  })

  it('renders with email and shows confirm button', () => {
    render(
      <ResetPasswordConfirm email='test@example.com' token='abc' />
    )

    expect(screen.getByText('Reset password')).toBeInTheDocument()
    // Email input should show the provided email
    const emailInput = screen.getByDisplayValue('test@example.com')
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toBeDisabled()
  })

  it('shows error alert when reset link is invalid (no email/token)', () => {
    render(<ResetPasswordConfirm />)

    expect(
      screen.getByText(
        'Invalid reset link, please request a new password reset.'
      )
    ).toBeInTheDocument()
  })

  it('shows back to login link when no email/token', () => {
    render(<ResetPasswordConfirm />)

    expect(screen.getByText('Back to login')).toBeInTheDocument()
  })

  it('navigates to sign-in when back to login is clicked', async () => {
    render(<ResetPasswordConfirm />)
    const user = userEvent.setup()

    await user.click(screen.getByText('Back to login'))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/sign-in',
      replace: true,
    })
  })

  it('submits reset request and shows new password', async () => {
    mockApiPost.mockResolvedValue({
      data: { success: true, data: 'newpass123' },
    })

    render(
      <ResetPasswordConfirm email='test@example.com' token='tok' />
    )
    const user = userEvent.setup()

    // Find and click the confirm button
    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons.find((b) => !b.textContent?.includes('Back'))!
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/user/reset',
        { email: 'test@example.com', token: 'tok' },
        expect.any(Object)
      )
    })

    // After success, new password should be displayed
    await waitFor(() => {
      expect(screen.getByDisplayValue('newpass123')).toBeInTheDocument()
    })
  })

  it('disables confirm button when no valid reset link', () => {
    render(<ResetPasswordConfirm />)

    // The confirm button should be disabled when no email/token
    const buttons = screen.getAllByRole('button')
    const confirmBtn = buttons.find(
      (b) => !b.textContent?.includes('Back')
    )!
    expect(confirmBtn).toBeDisabled()
  })

  it('renders email label', () => {
    render(
      <ResetPasswordConfirm email='test@example.com' token='tok' />
    )

    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('shows placeholder when no email provided', () => {
    render(<ResetPasswordConfirm />)

    expect(
      screen.getByPlaceholderText('Waiting for email...')
    ).toBeInTheDocument()
  })
})
