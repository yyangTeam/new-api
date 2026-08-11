import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import { UserAuthForm } from '@/features/auth/sign-in/components/user-auth-form'

const mockUseStatus = vi.fn()
const mockNavigate = vi.fn()

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => mockUseStatus(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
    React.createElement('a', { href: to, ...props }, children),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: null,
        setPending2FAFlowToken: vi.fn(),
      },
    }),
}))

vi.mock('@/features/auth/api', () => ({
  login: vi.fn(),
  wechatLoginByCode: vi.fn(),
}))

vi.mock('@/features/auth/passkey', () => ({
  beginPasskeyLogin: vi.fn(),
  finishPasskeyLogin: vi.fn(),
}))

vi.mock('@/lib/passkey', () => ({
  buildAssertionResult: vi.fn(),
  prepareCredentialRequestOptions: vi.fn(),
  isPasskeySupported: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/components/turnstile', () => ({
  Turnstile: () => React.createElement('div', { 'data-testid': 'turnstile' }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('UserAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({
      status: {
        password_login_enabled: true,
      },
      loading: false,
    })
  })

  it('renders username/email input field', () => {
    render(React.createElement(UserAuthForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText('Enter your username or email')
    ).toBeInTheDocument()
  })

  it('renders password input field', () => {
    render(React.createElement(UserAuthForm, {}), {
      wrapper: createWrapper(),
    })

    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(React.createElement(UserAuthForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument()
  })

  it('renders forgot password link', () => {
    render(React.createElement(UserAuthForm, {}), {
      wrapper: createWrapper(),
    })

    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
  })

  it('renders passkey button when passkey login is enabled', () => {
    mockUseStatus.mockReturnValue({
      status: {
        password_login_enabled: true,
        passkey_login: true,
      },
      loading: false,
    })

    render(React.createElement(UserAuthForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByRole('button', { name: /sign in with passkey/i })
    ).toBeInTheDocument()
  })

  it('does not render password fields when password login is disabled', () => {
    mockUseStatus.mockReturnValue({
      status: {
        password_login_enabled: false,
      },
      loading: false,
    })

    render(React.createElement(UserAuthForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.queryByPlaceholderText('Enter your username or email')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Enter password')
    ).not.toBeInTheDocument()
  })
})
