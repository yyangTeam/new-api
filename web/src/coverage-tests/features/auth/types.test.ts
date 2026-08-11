import { describe, it, expect } from 'vitest'

import type {
  LoginPayload,
  LoginResponse,
  Login2FAResponse,
  TwoFAPayload,
  RegisterPayload,
  PasswordResetPayload,
  EmailVerificationPayload,
  BindEmailPayload,
  ApiResponse,
  SystemStatus,
  OAuthProvider,
  CustomOAuthProviderInfo,
  AuthFormProps,
} from '@/features/auth/types'

describe('auth/types', () => {
  it('LoginPayload requires username and password', () => {
    const payload: LoginPayload = {
      username: 'testuser',
      password: 'pass123',
    }
    expect(payload.username).toBe('testuser')
    expect(payload.password).toBe('pass123')
    expect(payload.turnstile).toBeUndefined()
  })

  it('LoginPayload supports optional turnstile', () => {
    const payload: LoginPayload = {
      username: 'user',
      password: 'pass',
      turnstile: 'token123',
    }
    expect(payload.turnstile).toBe('token123')
  })

  it('TwoFAPayload has code and flow_token', () => {
    const payload: TwoFAPayload = {
      code: '123456',
      flow_token: 'flow-abc',
    }
    expect(payload.code).toBe('123456')
    expect(payload.flow_token).toBe('flow-abc')
  })

  it('RegisterPayload requires username and password', () => {
    const payload: RegisterPayload = {
      username: 'newuser',
      password: 'password123',
    }
    expect(payload.username).toBe('newuser')
    expect(payload.email).toBeUndefined()
  })

  it('RegisterPayload supports all optional fields', () => {
    const payload: RegisterPayload = {
      username: 'newuser',
      password: 'pass',
      email: 'user@test.com',
      verification_code: '123456',
      aff_code: 'aff-code',
      turnstile: 'turnstile-token',
    }
    expect(payload.email).toBe('user@test.com')
    expect(payload.verification_code).toBe('123456')
    expect(payload.aff_code).toBe('aff-code')
  })

  it('PasswordResetPayload requires email', () => {
    const payload: PasswordResetPayload = {
      email: 'user@test.com',
    }
    expect(payload.email).toBe('user@test.com')
    expect(payload.turnstile).toBeUndefined()
  })

  it('EmailVerificationPayload requires email', () => {
    const payload: EmailVerificationPayload = {
      email: 'user@test.com',
    }
    expect(payload.email).toBe('user@test.com')
  })

  it('BindEmailPayload requires email and code', () => {
    const payload: BindEmailPayload = {
      email: 'user@test.com',
      code: '123456',
    }
    expect(payload.email).toBe('user@test.com')
    expect(payload.code).toBe('123456')
  })

  it('LoginResponse can indicate success with auth data', () => {
    const response: LoginResponse = {
      success: true,
      message: 'OK',
      data: { username: 'user', role: 1, access_token: 'tok' } as any,
    }
    expect(response.success).toBe(true)
  })

  it('LoginResponse can indicate 2FA required', () => {
    const response: LoginResponse = {
      success: true,
      message: '2FA required',
      data: {
        require_2fa: true,
        flow_token: 'flow123',
        expires_at: 999,
      },
    }
    expect(response.data).toHaveProperty('require_2fa', true)
    expect(response.data).toHaveProperty('flow_token', 'flow123')
  })

  it('Login2FAResponse returns auth data on success', () => {
    const response: Login2FAResponse = {
      success: true,
      message: 'OK',
      data: { username: 'user' } as any,
    }
    expect(response.success).toBe(true)
    expect(response.data).toHaveProperty('username', 'user')
  })

  it('ApiResponse is generic', () => {
    const response: ApiResponse<number> = {
      success: true,
      message: 'OK',
      data: 42,
    }
    expect(response.data).toBe(42)
  })

  it('SystemStatus supports OAuth flags', () => {
    const status: SystemStatus = {
      github_oauth: true,
      discord_oauth: false,
      oidc_enabled: true,
      linuxdo_oauth: false,
      telegram_oauth: true,
      wechat_login: false,
    }
    expect(status.github_oauth).toBe(true)
    expect(status.discord_oauth).toBe(false)
  })

  it('SystemStatus supports register and password flags', () => {
    const status: SystemStatus = {
      register_enabled: true,
      password_login_enabled: true,
      password_register_enabled: false,
      self_use_mode_enabled: false,
    }
    expect(status.register_enabled).toBe(true)
    expect(status.self_use_mode_enabled).toBe(false)
  })

  it('SystemStatus supports custom OAuth providers', () => {
    const providers: CustomOAuthProviderInfo[] = [
      {
        id: 1,
        name: 'Okta',
        slug: 'okta',
        icon: 'icon-url',
        client_id: 'client123',
        authorization_endpoint: 'https://okta.example.com/auth',
        scopes: 'openid profile',
      },
    ]
    const status: SystemStatus = {
      custom_oauth_providers: providers,
    }
    expect(status.custom_oauth_providers).toHaveLength(1)
    expect(status.custom_oauth_providers![0].name).toBe('Okta')
  })

  it('OAuthProvider has correct structure', () => {
    const provider: OAuthProvider = {
      name: 'GitHub',
      type: 'github',
      enabled: true,
      clientId: 'client123',
    }
    expect(provider.name).toBe('GitHub')
    expect(provider.type).toBe('github')
    expect(provider.enabled).toBe(true)
  })

  it('CustomOAuthProviderInfo has all required fields', () => {
    const provider: CustomOAuthProviderInfo = {
      id: 1,
      name: 'Provider',
      slug: 'provider',
      icon: 'icon.png',
      client_id: 'abc',
      authorization_endpoint: 'https://auth.example.com',
      scopes: 'openid',
    }
    expect(provider.id).toBe(1)
    expect(provider.slug).toBe('provider')
  })

  it('AuthFormProps extends HTMLFormElement attributes', () => {
    const props: AuthFormProps = {
      redirectTo: '/dashboard',
      className: 'my-form',
    }
    expect(props.redirectTo).toBe('/dashboard')
    expect(props.className).toBe('my-form')
  })

  it('SystemStatus supports turnstile settings', () => {
    const status: SystemStatus = {
      turnstile_check: true,
      turnstile_site_key: 'key123',
    }
    expect(status.turnstile_check).toBe(true)
    expect(status.turnstile_site_key).toBe('key123')
  })

  it('SystemStatus supports email verification', () => {
    const status: SystemStatus = {
      email_verification: true,
    }
    expect(status.email_verification).toBe(true)
  })

  it('SystemStatus supports legal settings', () => {
    const status: SystemStatus = {
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    }
    expect(status.user_agreement_enabled).toBe(true)
    expect(status.privacy_policy_enabled).toBe(true)
  })

  it('SystemStatus allows index signature for unknown fields', () => {
    const status: SystemStatus = {
      some_unknown_field: 'value',
    }
    expect(status.some_unknown_field).toBe('value')
  })
})
