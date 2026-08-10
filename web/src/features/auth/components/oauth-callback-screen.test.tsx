import { describe, it, expect, vi } from 'vitest'

import { render, screen } from '@/test/test-utils'

import { OAuthCallbackScreen } from './oauth-callback-screen'

// ---------------------------------------------------------------------------
// Mock ONLY external dependencies
// ---------------------------------------------------------------------------

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: React.ReactNode
    to: string
    [key: string]: unknown
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'Test',
    logo: '/logo.png',
    loading: false,
  }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OAuthCallbackScreen', () => {
  it('renders login mode for github provider', () => {
    render(<OAuthCallbackScreen provider='github' mode='login' />)

    expect(
      screen.getByText(/Signing you in with GitHub/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText('Processing OAuth response...')
    ).toBeInTheDocument()
  })

  it('renders bind mode for github provider', () => {
    render(<OAuthCallbackScreen provider='github' mode='bind' />)

    expect(
      screen.getByText(/Binding your GitHub account/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Hang tight while we securely link this account to your profile.'
      )
    ).toBeInTheDocument()
  })

  it('renders with known provider: oidc', () => {
    render(<OAuthCallbackScreen provider='oidc' mode='login' />)

    expect(
      screen.getByText(/Signing you in with OIDC/i)
    ).toBeInTheDocument()
  })

  it('renders with known provider: linuxdo', () => {
    render(<OAuthCallbackScreen provider='linuxdo' mode='login' />)

    expect(
      screen.getByText(/Signing you in with LinuxDO/i)
    ).toBeInTheDocument()
  })

  it('renders with known provider: telegram', () => {
    render(<OAuthCallbackScreen provider='telegram' mode='login' />)

    expect(
      screen.getByText(/Signing you in with Telegram/i)
    ).toBeInTheDocument()
  })

  it('renders with known provider: wechat', () => {
    render(<OAuthCallbackScreen provider='wechat' mode='login' />)

    expect(
      screen.getByText(/Signing you in with WeChat/i)
    ).toBeInTheDocument()
  })

  it('renders with unknown provider fallback', () => {
    render(<OAuthCallbackScreen provider='unknown' mode='login' />)

    expect(
      screen.getByText(/Signing you in with account/i)
    ).toBeInTheDocument()
  })

  it('shows secondary note for login mode', () => {
    render(<OAuthCallbackScreen provider='github' mode='login' />)

    expect(
      screen.getByText(/You'll be redirected automatically/)
    ).toBeInTheDocument()
  })

  it('shows secondary note for bind mode', () => {
    render(<OAuthCallbackScreen provider='github' mode='bind' />)

    expect(
      screen.getByText(
        /You can close this tab once the binding completes/
      )
    ).toBeInTheDocument()
  })

  it('shows validation note', () => {
    render(<OAuthCallbackScreen provider='github' mode='login' />)

    expect(
      screen.getByText(
        /This may take a few moments while we validate the request/
      )
    ).toBeInTheDocument()
  })

  it('is case-insensitive for provider names', () => {
    render(<OAuthCallbackScreen provider='GitHub' mode='login' />)

    expect(
      screen.getByText(/Signing you in with GitHub/i)
    ).toBeInTheDocument()
  })

  it('renders hang tight message for login mode', () => {
    render(<OAuthCallbackScreen provider='github' mode='login' />)

    expect(
      screen.getByText(
        'Hang tight while we finish connecting your account.'
      )
    ).toBeInTheDocument()
  })
})
