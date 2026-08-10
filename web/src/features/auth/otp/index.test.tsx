import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { Otp } from './index'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    React.createElement('a', { href: to }, children),
}))

vi.mock('../auth-layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
}))

vi.mock('./components/otp-form', () => ({
  OtpForm: () => React.createElement('div', { 'data-testid': 'otp-form' }),
}))

describe('Otp page', () => {
  it('renders auth layout', () => {
    render(React.createElement(Otp))

    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
  })

  it('renders heading', () => {
    render(React.createElement(Otp))

    expect(screen.getByText('Two-factor Authentication')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(React.createElement(Otp))

    expect(screen.getByText('Please enter the authentication code.')).toBeInTheDocument()
  })

  it('renders re-login link', () => {
    render(React.createElement(Otp))

    const link = screen.getByText('Re-login')
    expect(link).toHaveAttribute('href', '/sign-in')
  })

  it('renders otp form', () => {
    render(React.createElement(Otp))

    expect(screen.getByTestId('otp-form')).toBeInTheDocument()
  })

  it('renders session expired text with re-login link', () => {
    render(React.createElement(Otp))

    // Text is split across elements, so use a function matcher
    expect(screen.getByText(/Session expired/)).toBeInTheDocument()
  })
})
