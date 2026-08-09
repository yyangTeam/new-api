import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

import { SignUpForm } from './sign-up-form'

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
      },
    }),
}))

vi.mock('@/features/auth/api', () => ({
  register: vi.fn(),
  wechatLoginByCode: vi.fn(),
  sendEmailVerification: vi.fn(),
}))

vi.mock('@/features/auth/lib/storage', () => ({
  getAffiliateCode: vi.fn().mockReturnValue(undefined),
  saveAffiliateCode: vi.fn(),
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

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({
      status: {
        email_verification: false,
        oauth_register_enabled: false,
      },
      loading: false,
    })
  })

  it('renders username field', () => {
    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText('Enter your username')
    ).toBeInTheDocument()
  })

  it('renders password field', () => {
    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText('Enter password (8-20 characters)')
    ).toBeInTheDocument()
  })

  it('renders confirm password field', () => {
    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText('Confirm password')
    ).toBeInTheDocument()
  })

  it('renders create account button', () => {
    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument()
  })

  it('shows email field when email verification is required', () => {
    mockUseStatus.mockReturnValue({
      status: {
        email_verification: true,
      },
      loading: false,
    })

    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText('name@example.com')
    ).toBeInTheDocument()
  })

  it('does not show email field when email verification is not required', () => {
    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.queryByPlaceholderText('name@example.com')
    ).not.toBeInTheDocument()
  })

  it('shows verification code section when email verification is required', () => {
    mockUseStatus.mockReturnValue({
      status: {
        email_verification: true,
      },
      loading: false,
    })

    render(React.createElement(SignUpForm, {}), {
      wrapper: createWrapper(),
    })

    expect(
      screen.getByPlaceholderText('Verification code')
    ).toBeInTheDocument()
  })
})
