import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'

import { render, screen, userEvent, waitFor } from '@/test/test-utils'

import { OtpForm } from './otp-form'

// ---------------------------------------------------------------------------
// Mock ONLY external dependencies
// ---------------------------------------------------------------------------

const mockHandleLoginSuccess = vi.fn()
const mockRedirectToLogin = vi.fn()
const mockLogin2fa = vi.fn()
const mockNavigate = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode
    to: string
  }) => <a href={to}>{children}</a>,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      auth: { pending2FAFlowToken: 'flow-token-123' },
    }),
}))

vi.mock('@/features/auth/api', () => ({
  login2fa: (...args: unknown[]) => mockLogin2fa(...args),
}))

vi.mock('@/features/auth/hooks/use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess: mockHandleLoginSuccess,
    redirectToLogin: mockRedirectToLogin,
  }),
}))

vi.mock('@/lib/server-error-message', () => ({
  getServerErrorMessageKey: () => false,
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OtpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the OTP form with verification code label', () => {
    render(<OtpForm />)

    expect(screen.getByText('Verification Code')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /verify and sign in/i })
    ).toBeInTheDocument()
  })

  it('renders toggle button for backup code mode', () => {
    render(<OtpForm />)

    expect(
      screen.getByRole('button', { name: /use backup code/i })
    ).toBeInTheDocument()
  })

  it('switches to backup code mode when toggle is clicked', async () => {
    render(<OtpForm />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /use backup code/i })
    )

    expect(screen.getByText('Backup Code')).toBeInTheDocument()
    expect(
      screen.getByText('Each backup code can only be used once.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /use authenticator code/i })
    ).toBeInTheDocument()
  })

  it('shows backup code placeholder in backup mode', async () => {
    render(<OtpForm />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /use backup code/i })
    )

    expect(
      screen.getByPlaceholderText('Enter backup code (e.g., CAWD-OQDV)')
    ).toBeInTheDocument()
  })

  it('renders back to login button', () => {
    render(<OtpForm />)

    expect(
      screen.getByRole('button', { name: /back to login/i })
    ).toBeInTheDocument()
  })

  it('calls redirectToLogin when back to login is clicked', async () => {
    render(<OtpForm />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /back to login/i })
    )

    expect(mockRedirectToLogin).toHaveBeenCalled()
  })

  it('shows description about 30-second rotation', () => {
    render(<OtpForm />)

    expect(
      screen.getByText('Verification code updates every 30 seconds.')
    ).toBeInTheDocument()
  })

  it('verify button is initially disabled (no OTP entered)', () => {
    render(<OtpForm />)

    expect(
      screen.getByRole('button', { name: /verify and sign in/i })
    ).toBeDisabled()
  })

  it('switches back from backup code mode to OTP mode', async () => {
    render(<OtpForm />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: /use backup code/i })
    )
    expect(screen.getByText('Backup Code')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /use authenticator code/i })
    )
    expect(screen.getByText('Verification Code')).toBeInTheDocument()
  })
})
