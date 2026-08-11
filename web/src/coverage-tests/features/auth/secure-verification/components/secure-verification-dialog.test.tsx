import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import { SecureVerificationDialog } from '@/features/auth/secure-verification/components/secure-verification-dialog'
import type {
  SecureVerificationState,
  VerificationMethod,
  VerificationMethods,
} from '@/features/auth/secure-verification/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('lucide-react', () => ({
  ShieldCheck: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'shield-check', className }),
  KeyRound: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'key-round', className }),
  Loader2: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'loader', className }),
}))

vi.mock('@/components/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
  }: {
    open: boolean
    onOpenChange: (v: boolean) => void
    title: React.ReactNode
    description: React.ReactNode
    children: React.ReactNode
    footer?: React.ReactNode
    [key: string]: unknown
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'dialog', role: 'dialog' },
          React.createElement('div', { 'data-testid': 'dialog-title' }, title),
          React.createElement(
            'div',
            { 'data-testid': 'dialog-description' },
            description
          ),
          children,
          footer
            ? React.createElement(
                'div',
                { 'data-testid': 'dialog-footer' },
                footer
              )
            : null
        )
      : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
  }: {
    children: React.ReactNode
    disabled?: boolean
    onClick?: () => void
    type?: string
    [key: string]: unknown
  }) =>
    React.createElement(
      'button',
      { disabled, onClick, type },
      children
    ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    disabled,
    onKeyDown,
    ...props
  }: {
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    disabled?: boolean
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
    [key: string]: unknown
  }) =>
    React.createElement('input', {
      value,
      onChange,
      placeholder,
      disabled,
      onKeyDown,
      'data-testid': 'verification-input',
    }),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode
    value: string
    onValueChange: (v: string) => void
    [key: string]: unknown
  }) =>
    React.createElement(
      'div',
      {
        'data-testid': 'tabs',
        'data-value': value,
        onClick: () => onValueChange(value),
      },
      children
    ),
  TabsList: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'tabs-list', role: 'tablist' }, children),
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) =>
    React.createElement(
      'button',
      { 'data-testid': `tab-${value}`, role: 'tab' },
      children
    ),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode
    value: string
  }) =>
    React.createElement(
      'div',
      { 'data-testid': `tab-content-${value}`, role: 'tabpanel' },
      children
    ),
}))

function createState(
  overrides: Partial<SecureVerificationState> = {}
): SecureVerificationState {
  return {
    method: '2fa',
    loading: false,
    code: '',
    ...overrides,
  }
}

function createMethods(
  overrides: Partial<VerificationMethods> = {}
): VerificationMethods {
  return {
    has2FA: true,
    hasPasskey: false,
    passkeySupported: false,
    ...overrides,
  }
}

describe('SecureVerificationDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    methods: createMethods(),
    state: createState(),
    onVerify: vi.fn(),
    onCancel: vi.fn(),
    onCodeChange: vi.fn(),
    onMethodChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        open: false,
      })
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog when open', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays default title when no custom title', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(
      screen.getByText('Additional verification required')
    ).toBeInTheDocument()
  })

  it('displays custom title from state', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ title: 'Custom Title' }),
      })
    )
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  it('displays default description when no custom description', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(
      screen.getByText(
        'Confirm your identity before accessing this sensitive action.'
      )
    ).toBeInTheDocument()
  })

  it('displays custom description from state', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ description: 'Custom desc' }),
      })
    )
    expect(screen.getByText('Custom desc')).toBeInTheDocument()
  })

  it('shows 2FA tab when has2FA is true', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(screen.getByTestId('tab-2fa')).toBeInTheDocument()
    expect(screen.getByText('Authenticator code')).toBeInTheDocument()
  })

  it('shows passkey tab when hasPasskey and passkeySupported', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({ has2FA: true, hasPasskey: true, passkeySupported: true }),
      })
    )
    expect(screen.getByTestId('tab-passkey')).toBeInTheDocument()
    expect(screen.getByText('Passkey')).toBeInTheDocument()
  })

  it('does not show passkey tab when passkeySupported is false', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({ hasPasskey: true, passkeySupported: false }),
      })
    )
    expect(screen.queryByTestId('tab-passkey')).not.toBeInTheDocument()
  })

  it('shows verification input for 2FA method', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(screen.getByTestId('verification-input')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('Enter verification code')
    ).toBeInTheDocument()
  })

  it('shows TOTP description text in 2FA tab', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(
      screen.getByText(
        'Enter the 6-digit Time-based One-Time Password or 8-character backup code from your authenticator app.'
      )
    ).toBeInTheDocument()
  })

  it('shows passkey content when passkey tab is available', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({ has2FA: true, hasPasskey: true, passkeySupported: true }),
      })
    )
    expect(screen.getByText('Use your Passkey')).toBeInTheDocument()
    expect(
      screen.getByText(
        'We will prompt your device to confirm using biometrics or your hardware key.'
      )
    ).toBeInTheDocument()
  })

  it('renders cancel button', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))

    const cancelButton = screen.getByText('Cancel')
    expect(cancelButton).toBeInTheDocument()
  })

  it('renders verify button', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))

    const verifyButton = screen.getByText('Verify')
    expect(verifyButton).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        onCancel,
      })
    )

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onVerify with 2fa method and code when verify is clicked', () => {
    const onVerify = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ code: '123456', method: '2fa' }),
        onVerify,
      })
    )

    fireEvent.click(screen.getByText('Verify'))
    expect(onVerify).toHaveBeenCalledWith('2fa', '123456')
  })

  it('calls onVerify with passkey method and no code', () => {
    const onVerify = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({ has2FA: false, hasPasskey: true, passkeySupported: true }),
        state: createState({ method: 'passkey', code: '' }),
        onVerify,
      })
    )

    fireEvent.click(screen.getByText('Verify'))
    expect(onVerify).toHaveBeenCalledWith('passkey', undefined)
  })

  it('disables verify button when code is too short for 2FA', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ code: '123', method: '2fa' }),
      })
    )

    const verifyButton = screen.getByText('Verify').closest('button')
    expect(verifyButton).toBeDisabled()
  })

  it('disables verify button when code is empty for 2FA', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ code: '', method: '2fa' }),
      })
    )

    const verifyButton = screen.getByText('Verify').closest('button')
    expect(verifyButton).toBeDisabled()
  })

  it('enables verify button when code has 6+ characters for 2FA', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ code: '123456', method: '2fa' }),
      })
    )

    const verifyButton = screen.getByText('Verify').closest('button')
    expect(verifyButton).not.toBeDisabled()
  })

  it('disables verify button when loading', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ loading: true, code: '123456' }),
      })
    )

    const verifyButton = screen.getByText('Verify').closest('button')
    expect(verifyButton).toBeDisabled()
  })

  it('shows loader when loading', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ loading: true, code: '123456' }),
      })
    )

    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('disables cancel button when loading', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ loading: true }),
      })
    )

    const cancelButton = screen.getByText('Cancel').closest('button')
    expect(cancelButton).toBeDisabled()
  })

  it('disables input when loading', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ loading: true }),
      })
    )

    expect(screen.getByTestId('verification-input')).toBeDisabled()
  })

  it('calls onCodeChange when input value changes', () => {
    const onCodeChange = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        onCodeChange,
      })
    )

    fireEvent.change(screen.getByTestId('verification-input'), {
      target: { value: '123456' },
    })
    expect(onCodeChange).toHaveBeenCalledWith('123456')
  })

  it('shows empty state when no verification methods available', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({
          has2FA: false,
          hasPasskey: false,
          passkeySupported: false,
        }),
      })
    )

    expect(
      screen.getByText(
        'Enable Two-factor Authentication or Passkey in your profile to unlock sensitive operations.'
      )
    ).toBeInTheDocument()
  })

  it('shows unavailable title when no methods available', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({
          has2FA: false,
          hasPasskey: false,
          passkeySupported: false,
        }),
        state: createState({ title: undefined }),
      })
    )

    expect(screen.getByText('Verification unavailable')).toBeInTheDocument()
  })

  it('shows unavailable description when no methods available', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({
          has2FA: false,
          hasPasskey: false,
          passkeySupported: false,
        }),
        state: createState({ description: undefined }),
      })
    )

    expect(
      screen.getByText(
        'Enable Two-factor Authentication or Passkey in your profile settings to continue.'
      )
    ).toBeInTheDocument()
  })

  it('disables verify button when no methods available', () => {
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({
          has2FA: false,
          hasPasskey: false,
          passkeySupported: false,
        }),
      })
    )

    const verifyButton = screen.getByText('Verify').closest('button')
    expect(verifyButton).toBeDisabled()
  })

  it('does not call onVerify when activeMethod is null', () => {
    const onVerify = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        methods: createMethods({
          has2FA: false,
          hasPasskey: false,
          passkeySupported: false,
        }),
        state: createState({ method: null }),
        onVerify,
      })
    )

    // Even though verify button is disabled, clicking shouldn't call onVerify
    fireEvent.click(screen.getByText('Verify'))
    expect(onVerify).not.toHaveBeenCalled()
  })

  it('triggers verify on Enter key in input', () => {
    const onVerify = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ code: '123456', method: '2fa' }),
        onVerify,
      })
    )

    fireEvent.keyDown(screen.getByTestId('verification-input'), {
      key: 'Enter',
    })
    expect(onVerify).toHaveBeenCalledWith('2fa', '123456')
  })

  it('does not trigger verify on Enter when code is too short', () => {
    const onVerify = vi.fn()
    render(
      React.createElement(SecureVerificationDialog, {
        ...defaultProps,
        state: createState({ code: '12', method: '2fa' }),
        onVerify,
      })
    )

    fireEvent.keyDown(screen.getByTestId('verification-input'), {
      key: 'Enter',
    })
    expect(onVerify).not.toHaveBeenCalled()
  })

  it('renders shield icon in title', () => {
    render(React.createElement(SecureVerificationDialog, defaultProps))
    expect(screen.getByTestId('shield-check')).toBeInTheDocument()
  })
})
