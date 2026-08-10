import { describe, it, expect, vi, beforeEach } from 'vitest'

import { render, screen, userEvent } from '@/test/test-utils'

import { OAuthProviders } from './oauth-providers'

// ---------------------------------------------------------------------------
// Mock ONLY external dependencies
// ---------------------------------------------------------------------------

const mockUseOAuthLogin = vi.fn()

vi.mock('../hooks/use-oauth-login', () => ({
  useOAuthLogin: (...args: unknown[]) => mockUseOAuthLogin(...args),
}))

// TelegramLoginDialog loads external scripts, must mock
vi.mock('./telegram-login-dialog', () => ({
  TelegramLoginDialog: ({
    open,
    botName,
  }: {
    open: boolean
    botName: string
  }) =>
    open ? (
      <div data-testid='telegram-dialog'>bot: {botName}</div>
    ) : null,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OAuthProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOAuthLogin.mockReturnValue(defaultOAuthHookReturn())
  })

  it('renders nothing when no providers are enabled', () => {
    const { container } = render(
      <OAuthProviders status={{} as never} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when status is null', () => {
    const { container } = render(
      <OAuthProviders status={null} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders GitHub button when github_oauth is enabled', () => {
    render(
      <OAuthProviders
        status={{ github_oauth: true } as never}
      />
    )

    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
  })

  it('renders Discord button when discord_oauth is enabled', () => {
    render(
      <OAuthProviders
        status={{ discord_oauth: true } as never}
      />
    )

    expect(screen.getByText('Continue with Discord')).toBeInTheDocument()
  })

  it('renders OIDC button with custom display name', () => {
    render(
      <OAuthProviders
        status={
          { oidc_enabled: true, oidc_display_name: 'MySSO' } as never
        }
      />
    )

    expect(
      screen.getByText(/Continue with MySSO/i)
    ).toBeInTheDocument()
  })

  it('renders OIDC button with default name when display name is empty', () => {
    render(
      <OAuthProviders
        status={
          { oidc_enabled: true, oidc_display_name: '  ' } as never
        }
      />
    )

    expect(
      screen.getByText(/Continue with OIDC/i)
    ).toBeInTheDocument()
  })

  it('renders LinuxDO button when linuxdo_oauth is enabled', () => {
    render(
      <OAuthProviders
        status={{ linuxdo_oauth: true } as never}
      />
    )

    expect(
      screen.getByText('Continue with LinuxDO')
    ).toBeInTheDocument()
  })

  it('renders Telegram button when telegram_oauth is enabled', () => {
    render(
      <OAuthProviders
        status={{ telegram_oauth: true } as never}
      />
    )

    expect(
      screen.getByText('Continue with Telegram')
    ).toBeInTheDocument()
  })

  it('renders WeChat button when wechat_login enabled and onWeChatLogin provided', () => {
    render(
      <OAuthProviders
        status={{ wechat_login: true } as never}
        onWeChatLogin={vi.fn()}
      />
    )

    expect(
      screen.getByText('Continue with WeChat')
    ).toBeInTheDocument()
  })

  it('does not render WeChat button when onWeChatLogin is not provided', () => {
    const { container } = render(
      <OAuthProviders
        status={{ wechat_login: true } as never}
      />
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders custom OAuth providers', () => {
    render(
      <OAuthProviders
        status={
          {
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
          } as never
        }
      />
    )

    expect(
      screen.getByText(/Continue with Okta/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Continue with Auth0/i)
    ).toBeInTheDocument()
  })

  it('renders "Or continue with" divider text', () => {
    render(
      <OAuthProviders
        status={{ github_oauth: true } as never}
      />
    )

    expect(screen.getByText('Or continue with')).toBeInTheDocument()
  })

  it('renders multiple providers together', () => {
    render(
      <OAuthProviders
        status={
          {
            github_oauth: true,
            discord_oauth: true,
            telegram_oauth: true,
          } as never
        }
      />
    )

    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
    expect(screen.getByText('Continue with Discord')).toBeInTheDocument()
    expect(screen.getByText('Continue with Telegram')).toBeInTheDocument()
  })

  it('calls handleGitHubLogin when GitHub button is clicked', async () => {
    const handleGitHubLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleGitHubLogin,
    })

    render(
      <OAuthProviders
        status={{ github_oauth: true } as never}
      />
    )
    const user = userEvent.setup()

    await user.click(screen.getByText('Continue with GitHub'))
    expect(handleGitHubLogin).toHaveBeenCalledOnce()
  })

  it('calls handleDiscordLogin when Discord button is clicked', async () => {
    const handleDiscordLogin = vi.fn()
    mockUseOAuthLogin.mockReturnValue({
      ...defaultOAuthHookReturn(),
      handleDiscordLogin,
    })

    render(
      <OAuthProviders
        status={{ discord_oauth: true } as never}
      />
    )
    const user = userEvent.setup()

    await user.click(screen.getByText('Continue with Discord'))
    expect(handleDiscordLogin).toHaveBeenCalledOnce()
  })

  it('calls onWeChatLogin when WeChat button is clicked', async () => {
    const onWeChatLogin = vi.fn()
    render(
      <OAuthProviders
        status={{ wechat_login: true } as never}
        onWeChatLogin={onWeChatLogin}
      />
    )
    const user = userEvent.setup()

    await user.click(screen.getByText('Continue with WeChat'))
    expect(onWeChatLogin).toHaveBeenCalledOnce()
  })

  it('calls handleCustomOAuthLogin when custom provider button is clicked', async () => {
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
      <OAuthProviders
        status={{ custom_oauth_providers: [provider] } as never}
      />
    )
    const user = userEvent.setup()

    await user.click(screen.getByText(/Continue with Okta/i))
    expect(handleCustomOAuthLogin).toHaveBeenCalledWith(provider)
  })

  it('disables all buttons when disabled prop is true', () => {
    render(
      <OAuthProviders
        status={
          { github_oauth: true, discord_oauth: true } as never
        }
        disabled
      />
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
      <OAuthProviders
        status={
          { github_oauth: true, discord_oauth: true } as never
        }
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('passes redirectTo to useOAuthLogin', () => {
    render(
      <OAuthProviders
        status={{ github_oauth: true } as never}
        redirectTo='/dashboard'
      />
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
      <OAuthProviders
        status={
          {
            telegram_oauth: true,
            telegram_bot_name: 'test_bot',
          } as never
        }
      />
    )

    expect(screen.getByTestId('telegram-dialog')).toBeInTheDocument()
    expect(screen.getByText('bot: test_bot')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <OAuthProviders
        status={{ github_oauth: true } as never}
        className='my-custom-class'
      />
    )

    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
