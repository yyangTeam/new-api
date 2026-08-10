import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { OAuthCallbackScreen } from './oauth-callback-screen'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}))

vi.mock('../auth-layout', () => ({
  AuthLayout: ({ children }: React.PropsWithChildren) =>
    React.createElement('div', { 'data-testid': 'auth-layout' }, children),
}))

vi.mock('lucide-react', () => ({
  Loader2: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'loader', className }),
  Send: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'send-icon', className }),
  Shield: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'shield-icon', className }),
  UserRound: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'user-icon', className }),
}))

vi.mock('react-icons/si', () => ({
  SiGithub: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'github-icon', className }),
  SiLinux: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'linux-icon', className }),
  SiWechat: ({ className }: { className?: string }) =>
    React.createElement('span', { 'data-testid': 'wechat-icon', className }),
}))

describe('OAuthCallbackScreen', () => {
  it('renders login mode for github provider', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'github', mode: 'login' }))

    expect(screen.getByTestId('auth-layout')).toBeInTheDocument()
    expect(screen.getByTestId('github-icon')).toBeInTheDocument()
    expect(screen.getByText(/Signing you in/)).toBeInTheDocument()
  })

  it('renders bind mode for github provider', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'github', mode: 'bind' }))

    expect(screen.getByText(/Binding your/)).toBeInTheDocument()
  })

  it('renders oidc provider with shield icon', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'oidc', mode: 'login' }))

    expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
  })

  it('renders telegram provider with send icon', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'telegram', mode: 'login' }))

    expect(screen.getByTestId('send-icon')).toBeInTheDocument()
  })

  it('renders linuxdo provider', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'linuxdo', mode: 'login' }))

    expect(screen.getByTestId('linux-icon')).toBeInTheDocument()
  })

  it('renders wechat provider', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'wechat', mode: 'bind' }))

    expect(screen.getByTestId('wechat-icon')).toBeInTheDocument()
  })

  it('renders unknown provider with UserRound icon', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'unknown', mode: 'login' }))

    expect(screen.getByTestId('user-icon')).toBeInTheDocument()
  })

  it('shows processing message', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'github', mode: 'login' }))

    expect(screen.getByText('Processing OAuth response...')).toBeInTheDocument()
  })

  it('shows bind mode secondary note', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'github', mode: 'bind' }))

    expect(
      screen.getByText(/close this tab once the binding completes/)
    ).toBeInTheDocument()
  })

  it('shows login mode secondary note', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'github', mode: 'login' }))

    expect(
      screen.getByText(/redirected automatically/)
    ).toBeInTheDocument()
  })

  it('handles case-insensitive provider', () => {
    render(React.createElement(OAuthCallbackScreen, { provider: 'GitHub', mode: 'login' }))

    expect(screen.getByTestId('github-icon')).toBeInTheDocument()
  })
})
