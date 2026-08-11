import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { ForgotPassword } from '@/features/auth/forgot-password/index'

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
}))

vi.mock('@/features/auth/auth-layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
}))

vi.mock('@/features/auth/forgot-password/components/forgot-password-form', () => ({
  ForgotPasswordForm: ({ className }: { className?: string }) =>
    React.createElement('form', {
      'data-testid': 'forgot-password-form',
      className,
    }),
}))

describe('ForgotPassword', () => {
  it('renders within AuthLayout', () => {
    render(React.createElement(ForgotPassword))

    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
  })

  it('renders heading', () => {
    render(React.createElement(ForgotPassword))

    expect(screen.getByText('Forgot password')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(React.createElement(ForgotPassword))

    expect(
      screen.getByText(
        'Enter your registered email and we will send you a link to reset your password.'
      )
    ).toBeInTheDocument()
  })

  it('renders sign up link', () => {
    render(React.createElement(ForgotPassword))

    const signUpLink = screen.getByText('Sign up')
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink.closest('a')).toHaveAttribute('href', '/sign-up')
  })

  it('renders "Don\'t have an account?" text', () => {
    render(React.createElement(ForgotPassword))

    expect(
      screen.getByText((_, element) => {
        return element?.tagName === 'P' && element.textContent?.includes("Don't have an account?") === true
      })
    ).toBeInTheDocument()
  })

  it('renders ForgotPasswordForm component', () => {
    render(React.createElement(ForgotPassword))

    expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
  })

  it('passes className to ForgotPasswordForm', () => {
    render(React.createElement(ForgotPassword))

    const form = screen.getByTestId('forgot-password-form')
    expect(form).toHaveClass('space-y-0')
  })
})
