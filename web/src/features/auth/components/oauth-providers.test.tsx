import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import { OAuthProviders } from './oauth-providers'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts
        ? key.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts[k] ?? ''))
        : key,
  }),
}))

vi.mock('@/assets/brand-icons', () => ({
  IconDiscord: () => React.createElement('span', { 'data-testid': 'icon-discord' }),
  IconGithub: () => React.createElement('span', { 'data-testid': 'icon-github' }),
  IconLinuxDo: () => React.createElement('span', { 'data-testid': 'icon-linuxdo' }),
  IconTelegram: () => React.createElement('span', { 'data-testid': 'icon-telegram' }),
  IconWeChat: () => React.createElement('span', { 'data-testid': 'icon-wechat' }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode
    disabled?: boolean
    onClick?: () => void
    [key: string]: unknown
  }) =>
    React.createElement(
      'button',
      { disabled, onClick, 'data-testid': props['data-testid'] },
      children
    ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

const mockUseOAuthLogin = vi.fn()
vi.mock('../hooks/use-oauth-login', () => ({
  useOAuthLogin: (...args: unknown[]) => mockUseOAuthLogin(...args),
}))

vi.mock('./telegram-login-dialog', () => ({
  TelegramLoginDialog: ({
    open,
    botName,
  }: {
    open: boolean
    botName: string
  }) =>
    open
      ? React.createElement(
          'div',
          { 'data-testid': 'telegram-dialog' },
          `bot: ${botName}`
        )
      : null,
}))

function defaultOAuthHookReturn() {
  return {
    isLoading: false,
    githubButtonText: 'Continue with GitHub',
    githubButtonDisabled: false,
    handleGitHubLogin: vi.fn(),
    handleDiscordLogin: vi.fn(),
    handleOIDCLogin: vi.fn(),
    handleLinuxDOLogin: vi.fn(),
    handleTelegramLogin: vi.fn(),
    handleCustomOAuthLogin: vi.fn(),
    isTelegramDialogOpen: false,
    isTelegramPending: false,
    handleTelegramAuthorization: vi.fn(),
    setIsTelegramDialogOpen: vi.fn(),
  }
}

describe('OAuthProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOAuthLogin.mockReturnValue(defaultOAuthHookReturn())
  })

  it('renders nothing when no providers are enabled', () => {
    const { container } = render(
      React.createElement(OAuthProviders, { status: {} as any })
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when status is null', () => {
    const { container } = render(
      React.createElement(OAuthProviders, { status: null })
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders GitHub button when github_oauth is enabled', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true } as any,
      })
    )

    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
    expect(screen.getByTestId('icon-github')).toBeInTheDocument()
  })

  it('renders Discord button when discord_oauth is enabled', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { discord_oauth: true } as any,
      })
    )

    expect(screen.getByText('Continue with Discord')).toBeInTheDocument()
    expect(screen.getByTestId('icon-discord')).toBeInTheDocument()
  })

  it('renders OIDC button with custom display name', () => {
    render(
      React.createElement(OAuthProviders, {
        status: {
          oidc_enabled: true,
          oidc_display_name: 'MySSO',
        } as any,
      })
    )

    expect(screen.getByText('Continue with MySSO')).toBeInTheDocument()
  })

  it('renders OIDC button with default name when display name is empty', () => {
    render(
      React.createElement(OAuthProviders, {
        status: {
          oidc_enabled: true,
          oidc_display_name: '  ',
        } as any,
      })
    )

    expect(screen.getByText('Continue with OIDC')).toBeInTheDocument()
  })

  it('renders LinuxDO button when linuxdo_oauth is enabled', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { linuxdo_oauth: true } as any,
      })
    )

    expect(screen.getByText('Continue with LinuxDO')).toBeInTheDocument()
    expect(screen.getByTestId('icon-linuxdo')).toBeInTheDocument()
  })

  it('renders Telegram button when telegram_oauth is enabled', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { telegram_oauth: true } as any,
      })
    )

    expect(screen.getByText('Continue with Telegram')).toBeInTheDocument()
    expect(screen.getByTestId('icon-telegram')).toBeInTheDocument()
  })

  it('renders WeChat button when wechat_login enabled and onWeChatLogin provided', () => {
    const onWeChatLogin = vi.fn()
    render(
      React.createElement(OAuthProviders, {
        status: { wechat_login: true } as any,
        onWeChatLogin,
      })
    )

    expect(screen.getByText('Continue with WeChat')).toBeInTheDocument()
    expect(screen.getByTestId('icon-wechat')).toBeInTheDocument()
  })

  it('does not render WeChat button when onWeChatLogin is not provided', () => {
    const { container } = render(
      React.createElement(OAuthProviders, {
        status: { wechat_login: true } as any,
      })
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders custom OAuth providers', () => {
    render(
      React.createElement(OAuthProviders, {
        status: {
          custom_oauth_providers: [
            {
              id: 1,
              name: 'Okta',
              slug: 'okta',
              icon: '',
              client_id: 'abc',
              authorization_endpoint: 'https://okta.example.com/auth',
              scopes: 'openid',
            },
            {
              id: 2,
              name: 'Auth0',
              slug: 'auth0',
              icon: '',
              client_id: 'def',
              authorization_endpoint: 'https://auth0.example.com/auth',
              scopes: 'openid',
            },
          ],
        } as any,
      })
    )

    expect(screen.getByText('Continue with Okta')).toBeInTheDocument()
    expect(screen.getByText('Continue with Auth0')).toBeInTheDocument()
  })

  it('renders "Or continue with" divider text', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true } as any,
      })
    )

    expect(screen.getByText('Or continue with')).toBeInTheDocument()
  })

  it('renders multiple providers together', () => {
    render(
      React.createElement(OAuthProviders, {
        status: {
          github_oauth: true,
          discord_oauth: true,
          telegram_oauth: true,
        } as any,
      })
    )

    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
    expect(screen.getByText('Continue with Discord')).toBeInTheDocument()
    expect(screen.getByText('Continue with Telegram')).toBeInTheDocument()
  })

  it('calls handleGitHubLogin when GitHub button is clicked', () => {
    const handleGitHubLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleGitHubLogin,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true } as any,
      })
    )

    fireEvent.click(screen.getByText('Continue with GitHub'))
    expect(handleGitHubLogin).toHaveBeenCalledOnce()
  })

  it('calls handleDiscordLogin when Discord button is clicked', () => {
    const handleDiscordLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleDiscordLogin,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { discord_oauth: true } as any,
      })
    )

    fireEvent.click(screen.getByText('Continue with Discord'))
    expect(handleDiscordLogin).toHaveBeenCalledOnce()
  })

  it('calls handleOIDCLogin when OIDC button is clicked', () => {
    const handleOIDCLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleOIDCLogin,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { oidc_enabled: true } as any,
      })
    )

    fireEvent.click(screen.getByText('Continue with OIDC'))
    expect(handleOIDCLogin).toHaveBeenCalledOnce()
  })

  it('calls handleLinuxDOLogin when LinuxDO button is clicked', () => {
    const handleLinuxDOLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleLinuxDOLogin,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { linuxdo_oauth: true } as any,
      })
    )

    fireEvent.click(screen.getByText('Continue with LinuxDO'))
    expect(handleLinuxDOLogin).toHaveBeenCalledOnce()
  })

  it('calls handleTelegramLogin when Telegram button is clicked', () => {
    const handleTelegramLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleTelegramLogin,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { telegram_oauth: true } as any,
      })
    )

    fireEvent.click(screen.getByText('Continue with Telegram'))
    expect(handleTelegramLogin).toHaveBeenCalledOnce()
  })

  it('calls onWeChatLogin when WeChat button is clicked', () => {
    const onWeChatLogin = vi.fn()
    render(
      React.createElement(OAuthProviders, {
        status: { wechat_login: true } as any,
        onWeChatLogin,
      })
    )

    fireEvent.click(screen.getByText('Continue with WeChat'))
    expect(onWeChatLogin).toHaveBeenCalledOnce()
  })

  it('calls handleCustomOAuthLogin when custom provider button is clicked', () => {
    const handleCustomOAuthLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleCustomOAuthLogin,
    })

    const provider = {
      id: 1,
      name: 'Okta',
      slug: 'okta',
      icon: '',
      client_id: 'abc',
      authorization_endpoint: 'https://okta.example.com/auth',
      scopes: 'openid',
    }

    render(
      React.createElement(OAuthProviders, {
        status: { custom_oauth_providers: [provider] } as any,
      })
    )

    fireEvent.click(screen.getByText('Continue with Okta'))
    expect(handleCustomOAuthLogin).toHaveBeenCalledWith(provider)
  })

  it('disables all buttons when disabled prop is true', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true, discord_oauth: true } as any,
        disabled: true,
      })
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('disables all buttons when isLoading from hook is true', () => {
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      isLoading: true,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true, discord_oauth: true } as any,
      })
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('disables WeChat button when isWeChatLoading is true', () => {
    const onWeChatLogin = vi.fn()
    render(
      React.createElement(OAuthProviders, {
        status: { wechat_login: true } as any,
        onWeChatLogin,
        isWeChatLoading: true,
      })
    )

    expect(screen.getByText('Continue with WeChat').closest('button')).toBeDisabled()
  })

  it('passes redirectTo to useOAuthLogin', () => {
    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true } as any,
        redirectTo: '/dashboard',
      })
    )

    expect(mockUseOAuthLogin).toHaveBeenCalledWith(
      expect.objectContaining({ github_oauth: true }),
      '/dashboard'
    )
  })

  it('renders Telegram login dialog when open', () => {
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      isTelegramDialogOpen: true,
    })

    render(
      React.createElement(OAuthProviders, {
        status: {
          telegram_oauth: true,
          telegram_bot_name: 'test_bot',
        } as any,
      })
    )

    expect(screen.getByTestId('telegram-dialog')).toBeInTheDocument()
    expect(screen.getByText('bot: test_bot')).toBeInTheDocument()
  })

  it('does not render Telegram dialog when closed', () => {
    render(
      React.createElement(OAuthProviders, {
        status: {
          telegram_oauth: true,
          telegram_bot_name: 'test_bot',
        } as any,
      })
    )

    expect(screen.queryByTestId('telegram-dialog')).not.toBeInTheDocument()
  })

  it('uses githubButtonDisabled from hook', () => {
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      githubButtonDisabled: true,
    })

    render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true } as any,
      })
    )

    expect(screen.getByText('Continue with GitHub').closest('button')).toBeDisabled()
  })

  it('applies custom className', () => {
    const { container } = render(
      React.createElement(OAuthProviders, {
        status: { github_oauth: true } as any,
        className: 'my-custom-class',
      })
    )

    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
