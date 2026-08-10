import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { ForgotPasswordForm } from './forgot-password-form'

const mockSendPasswordResetEmail = vi.fn()
const mockUseTurnstile = vi.fn()
const mockUseCountdown = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/features/auth/api', () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}))

vi.mock('@/features/auth/constants', () => ({
  forgotPasswordFormSchema: {
    parse: (data: unknown) => data,
    safeParse: () => ({ success: true }),
  },
  PASSWORD_RESET_COUNTDOWN: 60,
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: () => async (values: unknown) => ({ values, errors: {} }),
}))

vi.mock('@/features/auth/hooks/use-turnstile', () => ({
  useTurnstile: () => mockUseTurnstile(),
}))

vi.mock('@/hooks/use-countdown', () => ({
  useCountdown: () => mockUseCountdown(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/turnstile', () => ({
  Turnstile: ({ onVerify }: { onVerify: (token: string) => void }) =>
    React.createElement('div', {
      'data-testid': 'turnstile',
      onClick: () => onVerify('tk'),
    }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', { disabled, ...props }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', { ...props, 'data-testid': 'email-input' }),
}))

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', null, children),
  FormControl: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', null, children),
  FormField: ({ render }: { render: (opts: { field: Record<string, unknown> }) => React.ReactNode }) =>
    React.createElement('div', null, render({ field: { value: '', onChange: vi.fn(), name: 'email' } })),
  FormItem: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', null, children),
  FormLabel: ({ children }: React.PropsWithChildren) =>
    React.createElement('label', null, children),
  FormMessage: () => null,
}))

vi.mock('lucide-react', () => ({
  ArrowRight: () => React.createElement('span', null, '>'),
  Loader2: () => React.createElement('span', { 'data-testid': 'loader' }),
}))

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTurnstile.mockReturnValue({
      isTurnstileEnabled: false,
      turnstileSiteKey: '',
      turnstileToken: '',
      setTurnstileToken: vi.fn(),
      validateTurnstile: () => true,
    })
    mockUseCountdown.mockReturnValue({
      secondsLeft: 0,
      isActive: false,
      start: vi.fn(),
    })
  })

  it('renders the forgot password form', () => {
    render(React.createElement(ForgotPasswordForm))

    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Send reset email')).toBeInTheDocument()
  })

  it('does not render turnstile when disabled', () => {
    render(React.createElement(ForgotPasswordForm))

    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument()
  })

  it('renders turnstile when enabled', () => {
    mockUseTurnstile.mockReturnValue({
      isTurnstileEnabled: true,
      turnstileSiteKey: 'site-key',
      turnstileToken: '',
      setTurnstileToken: vi.fn(),
      validateTurnstile: () => true,
    })

    render(React.createElement(ForgotPasswordForm))

    expect(screen.getByTestId('turnstile')).toBeInTheDocument()
  })

  it('shows countdown text when active', () => {
    mockUseCountdown.mockReturnValue({
      secondsLeft: 45,
      isActive: true,
      start: vi.fn(),
    })

    render(React.createElement(ForgotPasswordForm))

    // The button text includes "Resend" with interpolation
    const btn = screen.getByRole('button', { name: /Resend/i })
    expect(btn).toBeInTheDocument()
  })

  it('disables button during countdown', () => {
    mockUseCountdown.mockReturnValue({
      secondsLeft: 30,
      isActive: true,
      start: vi.fn(),
    })

    render(React.createElement(ForgotPasswordForm))

    const btn = screen.getByRole('button', { name: /Resend/i })
    expect(btn).toBeDisabled()
  })
})
