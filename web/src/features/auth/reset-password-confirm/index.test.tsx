import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

import { ResetPasswordConfirm } from './index'

const mockNavigate = vi.fn()
const mockApiPost = vi.fn()
const mockCopyToClipboard = vi.fn()
const mockCountdown = { secondsLeft: 0, isActive: false, start: vi.fn() }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
}))

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: (...args: unknown[]) => mockCopyToClipboard(...args),
}))

vi.mock('@/hooks/use-countdown', () => ({
  useCountdown: () => mockCountdown,
}))

vi.mock('../auth-layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { role: 'alert' }, children),
  AlertDescription: ({ children }: React.PropsWithChildren) =>
    React.createElement('p', null, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('button', { onClick, disabled, ...props }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', { ...props }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: React.PropsWithChildren) =>
    React.createElement('label', null, children),
}))

vi.mock('lucide-react', () => ({
  CheckIcon: () => React.createElement('span', null, 'check'),
  CopyIcon: () => React.createElement('span', null, 'copy'),
}))

describe('ResetPasswordConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCountdown.secondsLeft = 0
    mockCountdown.isActive = false
    mockCopyToClipboard.mockResolvedValue(true)
  })

  it('renders with email and shows confirm button', () => {
    render(React.createElement(ResetPasswordConfirm, { email: 'test@example.com', token: 'abc' }))

    expect(screen.getByText('Reset password')).toBeInTheDocument()
    expect(screen.getByText('auth.resetPasswordConfirm.confirm')).toBeInTheDocument()
  })

  it('shows error alert when reset link is invalid', () => {
    render(React.createElement(ResetPasswordConfirm, {}))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Invalid reset link, please request a new password reset.')).toBeInTheDocument()
  })

  it('submits reset request and shows new password', async () => {
    mockApiPost.mockResolvedValue({
      data: { success: true, data: 'newpass123' },
    })

    render(React.createElement(ResetPasswordConfirm, { email: 'test@example.com', token: 'tok' }))

    const confirmBtn = screen.getByText('auth.resetPasswordConfirm.confirm')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        '/api/user/reset',
        { email: 'test@example.com', token: 'tok' },
        expect.any(Object)
      )
    })
  })

  it('shows back to login when no email/token', () => {
    render(React.createElement(ResetPasswordConfirm, {}))

    expect(screen.getByText('Back to login')).toBeInTheDocument()
  })

  it('back to login navigates to sign-in', () => {
    render(React.createElement(ResetPasswordConfirm, {}))

    const btn = screen.getByText('Back to login')
    fireEvent.click(btn)

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true })
  })

  it('disables confirm button during countdown', () => {
    mockCountdown.isActive = true
    mockCountdown.secondsLeft = 25

    render(React.createElement(ResetPasswordConfirm, { email: 'a@b.com', token: 'x' }))

    const btn = screen.getByRole('button', { name: /retry/i })
    expect(btn).toBeDisabled()
  })
})
