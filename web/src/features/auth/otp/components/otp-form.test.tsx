import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { OtpForm } from './otp-form'

const mockHandleLoginSuccess = vi.fn()
const mockRedirectToLogin = vi.fn()
const mockLogin2fa = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
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

vi.mock('@/features/auth/constants', () => ({
  otpFormSchema: {
    parse: (data: unknown) => data,
    safeParse: () => ({ success: true }),
  },
  OTP_LENGTH: 6,
  BACKUP_CODE_LENGTH: 9,
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (values: unknown) => ({ values, errors: {} }),
}))

vi.mock('@/features/auth/lib/validation', () => ({
  isValidOTP: (v: string) => /^\d{6}$/.test(v),
  isValidBackupCode: (v: string) => /^[A-Z]{4}-[A-Z]{4}$/.test(v),
  formatBackupCode: (v: string) => v.toUpperCase().replace(/[^A-Z]/g, '').replace(/(.{4})(.+)/, '$1-$2').slice(0, 9),
  cleanBackupCode: (v: string) => v.replace(/-/g, ''),
}))

vi.mock('@/lib/server-error-message', () => ({
  getServerErrorMessageKey: () => false,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', props, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', { ...props, 'data-testid': 'input' }),
}))

vi.mock('@/components/ui/input-otp', () => ({
  InputOTP: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', { 'data-testid': 'input-otp', ...props }, children),
  InputOTPGroup: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', null, children),
  InputOTPSlot: ({ index }: { index: number }) =>
    React.createElement('div', { 'data-testid': `otp-slot-${index}` }),
  InputOTPSeparator: () => React.createElement('span', null, '-'),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', props, children),
  FormControl: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', null, children),
  FormField: ({ render }: { render: (opts: { field: Record<string, unknown> }) => React.ReactNode }) =>
    React.createElement('div', null, render({ field: { value: '', onChange: vi.fn(), name: 'otp' } })),
  FormItem: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) =>
    React.createElement('label', null, children),
  FormMessage: () => null,
  FormDescription: ({ children }: React.PropsWithChildren) =>
    React.createElement('p', null, children),
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'loader' }),
}))

describe('OtpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the OTP form', () => {
    render(React.createElement(OtpForm))

    expect(screen.getByText('Verification Code')).toBeInTheDocument()
    expect(screen.getByText('Verify and Sign In')).toBeInTheDocument()
  })

  it('renders toggle button for backup code', () => {
    render(React.createElement(OtpForm))

    expect(screen.getByText('Use backup code')).toBeInTheDocument()
  })

  it('shows backup code input when toggled', () => {
    render(React.createElement(OtpForm))

    const toggleBtn = screen.getByText('Use backup code')
    fireEvent.click(toggleBtn)

    expect(screen.getByText('Backup Code')).toBeInTheDocument()
    expect(screen.getByText('Use authenticator code')).toBeInTheDocument()
  })

  it('renders back to login button', () => {
    render(React.createElement(OtpForm))

    expect(screen.getByText('Back to login')).toBeInTheDocument()
  })

  it('back to login redirects', () => {
    render(React.createElement(OtpForm))

    const btn = screen.getByText('Back to login')
    fireEvent.click(btn)

    expect(mockRedirectToLogin).toHaveBeenCalled()
  })
})
