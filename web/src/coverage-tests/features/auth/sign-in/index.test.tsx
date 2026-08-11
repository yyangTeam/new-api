import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { SignIn } from '@/features/auth/sign-in/index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode
    to: string
  }) => React.createElement('a', { href: to }, children),
  useSearch: () => ({ redirect: undefined }),
}))

vi.mock('@/features/auth/auth-layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
}))

vi.mock('@/features/auth/sign-in/components/user-auth-form', () => ({
  UserAuthForm: ({ redirectTo }: { redirectTo?: string }) =>
    React.createElement('form', {
      'data-testid': 'user-auth-form',
      'data-redirect': redirectTo ?? '',
    }),
}))

vi.mock('@/features/auth/components/terms-footer', () => ({
  TermsFooter: ({
    variant,
    className,
  }: {
    variant?: string
    status: unknown
    className?: string
  }) =>
    React.createElement('div', {
      'data-testid': 'terms-footer',
      'data-variant': variant,
      className,
    }),
}))

const mockUseStatus = vi.fn()
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => mockUseStatus(),
}))

describe('SignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({
      status: {
        register_enabled: true,
        self_use_mode_enabled: false,
      },
    })
  })

  it('renders within AuthLayout', () => {
    render(React.createElement(SignIn))
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
  })

  it('renders "Sign in" heading', () => {
    render(React.createElement(SignIn))
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders sign up link when registration is enabled', () => {
    render(React.createElement(SignIn))

    const signUpLink = screen.getByText('Sign up')
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/sign-up')
  })

  it('renders "Don\'t have an account?" text when registration is enabled', () => {
    render(React.createElement(SignIn))
    expect(
      screen.getByText((_, element) => {
        return element?.tagName === 'P' && element.textContent?.includes("Don't have an account?") === true
      })
    ).toBeInTheDocument()
  })

  it('hides sign up link when self_use_mode_enabled is true', () => {
    mockUseStatus.mockReturnValue({
      status: {
        self_use_mode_enabled: true,
        register_enabled: true,
      },
    })

    render(React.createElement(SignIn))
    expect(screen.queryByText('Sign up')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign up')).not.toBeInTheDocument()
  })

  it('hides sign up link when register_enabled is false', () => {
    mockUseStatus.mockReturnValue({
      status: {
        self_use_mode_enabled: false,
        register_enabled: false,
      },
    })

    render(React.createElement(SignIn))
    expect(screen.queryByText('Sign up')).not.toBeInTheDocument()
  })

  it('shows sign up link when register_enabled is undefined (default)', () => {
    mockUseStatus.mockReturnValue({
      status: {
        self_use_mode_enabled: false,
      },
    })

    render(React.createElement(SignIn))
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })

  it('renders UserAuthForm', () => {
    render(React.createElement(SignIn))
    expect(screen.getByTestId('user-auth-form')).toBeInTheDocument()
  })

  it('renders TermsFooter with sign-in variant', () => {
    render(React.createElement(SignIn))

    const footer = screen.getByTestId('terms-footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveAttribute('data-variant', 'sign-in')
  })

  it('renders TermsFooter with text-center className', () => {
    render(React.createElement(SignIn))

    const footer = screen.getByTestId('terms-footer')
    expect(footer).toHaveClass('text-center')
  })

  it('renders when status is null', () => {
    mockUseStatus.mockReturnValue({ status: null })

    render(React.createElement(SignIn))
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    // Sign up link should not show when status is null (register_enabled is undefined/falsy path)
    // The condition is !status?.self_use_mode_enabled && status?.register_enabled !== false
    // With null status, self_use_mode is falsy so !null?.self_use_mode_enabled = true
    // null?.register_enabled = undefined, undefined !== false = true, so sign up shows
    expect(screen.getByText('Sign up')).toBeInTheDocument()
  })
})
