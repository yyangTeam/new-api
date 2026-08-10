import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { SignUp } from './index'

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

vi.mock('../auth-layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
}))

vi.mock('./components/sign-up-form', () => ({
  SignUpForm: () =>
    React.createElement('form', { 'data-testid': 'sign-up-form' }),
}))

vi.mock('../components/terms-footer', () => ({
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

describe('SignUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({
      status: {},
    })
  })

  it('renders within AuthLayout', () => {
    render(React.createElement(SignUp))
    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
  })

  it('renders "Create an account" heading', () => {
    render(React.createElement(SignUp))
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('renders sign in link', () => {
    render(React.createElement(SignUp))

    const signInLink = screen.getByText('Sign in')
    expect(signInLink).toBeInTheDocument()
    expect(signInLink.closest('a')).toHaveAttribute('href', '/sign-in')
  })

  it('renders "Already have an account?" text', () => {
    render(React.createElement(SignUp))
    expect(
      screen.getByText((_, element) => {
        return element?.tagName === 'P' && element.textContent?.includes('Already have an account?') === true
      })
    ).toBeInTheDocument()
  })

  it('renders SignUpForm', () => {
    render(React.createElement(SignUp))
    expect(screen.getByTestId('sign-up-form')).toBeInTheDocument()
  })

  it('renders TermsFooter with sign-up variant', () => {
    render(React.createElement(SignUp))

    const footer = screen.getByTestId('terms-footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveAttribute('data-variant', 'sign-up')
  })

  it('renders TermsFooter with text-center className', () => {
    render(React.createElement(SignUp))

    const footer = screen.getByTestId('terms-footer')
    expect(footer).toHaveClass('text-center')
  })

  it('renders when status is null', () => {
    mockUseStatus.mockReturnValue({ status: null })

    render(React.createElement(SignUp))
    expect(screen.getByText('Create an account')).toBeInTheDocument()
    expect(screen.getByTestId('sign-up-form')).toBeInTheDocument()
  })
})
