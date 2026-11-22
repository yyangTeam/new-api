import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import { LegalConsent } from '@/features/auth/components/legal-consent'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: Record<string, unknown>) =>
    React.createElement('input', {
      type: 'checkbox',
      checked: checked as boolean,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        (onCheckedChange as Function)?.(e.target.checked),
      'data-testid': 'checkbox',
      ...props,
    }),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('label', props, children),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

describe('LegalConsent', () => {
  it('renders nothing when neither agreement nor policy enabled', () => {
    const { container } = render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: false, privacy_policy_enabled: false } as any,
        checked: false,
        onCheckedChange: vi.fn(),
      })
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when status is null', () => {
    const { container } = render(
      React.createElement(LegalConsent, {
        status: null,
        checked: false,
        onCheckedChange: vi.fn(),
      })
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders when user agreement is enabled', () => {
    render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: true, privacy_policy_enabled: false } as any,
        checked: false,
        onCheckedChange: vi.fn(),
      })
    )

    expect(screen.getByText('User Agreement')).toBeInTheDocument()
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument()
  })

  it('renders when privacy policy is enabled', () => {
    render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: false, privacy_policy_enabled: true } as any,
        checked: false,
        onCheckedChange: vi.fn(),
      })
    )

    expect(screen.queryByText('User Agreement')).not.toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('renders both when both enabled', () => {
    render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: true, privacy_policy_enabled: true } as any,
        checked: false,
        onCheckedChange: vi.fn(),
      })
    )

    expect(screen.getByText('User Agreement')).toBeInTheDocument()
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
  })

  it('calls onCheckedChange when checkbox clicked', () => {
    const onCheckedChange = vi.fn()
    render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: true } as any,
        checked: false,
        onCheckedChange,
      })
    )

    const checkbox = screen.getByTestId('checkbox')
    fireEvent.click(checkbox)

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders checked state', () => {
    render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: true } as any,
        checked: true,
        onCheckedChange: vi.fn(),
      })
    )

    const checkbox = screen.getByTestId('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('applies custom className', () => {
    const { container } = render(
      React.createElement(LegalConsent, {
        status: { user_agreement_enabled: true } as any,
        checked: false,
        onCheckedChange: vi.fn(),
        className: 'custom-class',
      })
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})
