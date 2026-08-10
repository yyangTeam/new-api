import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { TermsFooter } from './terms-footer'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('TermsFooter', () => {
  it('renders nothing when neither agreement nor policy enabled', () => {
    const { container } = render(
      React.createElement(TermsFooter, {
        status: { user_agreement_enabled: false, privacy_policy_enabled: false } as any,
      })
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when status is null', () => {
    const { container } = render(
      React.createElement(TermsFooter, { status: null })
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders user agreement link when enabled', () => {
    render(
      React.createElement(TermsFooter, {
        status: { user_agreement_enabled: true, privacy_policy_enabled: false } as any,
      })
    )

    expect(screen.getByText('User Agreement')).toBeInTheDocument()
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument()
  })

  it('renders privacy policy link when enabled', () => {
    render(
      React.createElement(TermsFooter, {
        status: { user_agreement_enabled: false, privacy_policy_enabled: true } as any,
      })
    )

    expect(screen.queryByText('User Agreement')).not.toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('renders both links when both enabled', () => {
    render(
      React.createElement(TermsFooter, {
        status: { user_agreement_enabled: true, privacy_policy_enabled: true } as any,
      })
    )

    expect(screen.getByText('User Agreement')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('uses sign-in variant text by default', () => {
    render(
      React.createElement(TermsFooter, {
        status: { user_agreement_enabled: true } as any,
      })
    )

    expect(screen.getByText(/clicking sign in/)).toBeInTheDocument()
  })

  it('uses sign-up variant text', () => {
    render(
      React.createElement(TermsFooter, {
        variant: 'sign-up',
        status: { user_agreement_enabled: true } as any,
      })
    )

    expect(screen.getByText(/creating an account/)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      React.createElement(TermsFooter, {
        className: 'extra-class',
        status: { user_agreement_enabled: true } as any,
      })
    )

    expect(container.firstChild).toHaveClass('extra-class')
  })

  it('links have correct hrefs', () => {
    render(
      React.createElement(TermsFooter, {
        status: { user_agreement_enabled: true, privacy_policy_enabled: true } as any,
      })
    )

    const agreementLink = screen.getByText('User Agreement')
    const policyLink = screen.getByText('Privacy Policy')

    expect(agreementLink).toHaveAttribute('href', '/user-agreement')
    expect(policyLink).toHaveAttribute('href', '/privacy-policy')
  })
})
