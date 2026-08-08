import type { SystemStatus } from '../types'

import { getAvailableOAuthProviders, hasOAuthProviders } from './oauth'

describe('getAvailableOAuthProviders', () => {
  test('returns empty array when status is null', () => {
    expect(getAvailableOAuthProviders(null)).toEqual([])
  })

  test('returns empty array when no providers are enabled', () => {
    const status = {} as SystemStatus
    expect(getAvailableOAuthProviders(status)).toEqual([])
  })

  test('returns GitHub provider when enabled', () => {
    const status = {
      github_oauth: true,
      github_client_id: 'gh-client-id',
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toEqual([
      {
        name: 'GitHub',
        type: 'github',
        enabled: true,
        clientId: 'gh-client-id',
      },
    ])
  })

  test('returns Discord provider when enabled', () => {
    const status = {
      discord_oauth: true,
      discord_client_id: 'dc-client-id',
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toEqual([
      {
        name: 'Discord',
        type: 'discord',
        enabled: true,
        clientId: 'dc-client-id',
      },
    ])
  })

  test('returns OIDC provider when enabled', () => {
    const status = {
      oidc_enabled: true,
      oidc_client_id: 'oidc-client-id',
      oidc_authorization_endpoint: 'https://auth.example.com/authorize',
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toEqual([
      {
        name: 'OIDC',
        type: 'oidc',
        enabled: true,
        clientId: 'oidc-client-id',
        authEndpoint: 'https://auth.example.com/authorize',
      },
    ])
  })

  test('returns LinuxDO provider when enabled', () => {
    const status = {
      linuxdo_oauth: true,
      linuxdo_client_id: 'ldo-client-id',
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toEqual([
      {
        name: 'LinuxDO',
        type: 'linuxdo',
        enabled: true,
        clientId: 'ldo-client-id',
      },
    ])
  })

  test('returns Telegram provider when enabled', () => {
    const status = {
      telegram_oauth: true,
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toEqual([
      {
        name: 'Telegram',
        type: 'telegram',
        enabled: true,
      },
    ])
  })

  test('returns multiple providers in correct order', () => {
    const status = {
      github_oauth: true,
      github_client_id: 'gh-id',
      discord_oauth: true,
      discord_client_id: 'dc-id',
      telegram_oauth: true,
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toHaveLength(3)
    expect(providers[0].type).toBe('github')
    expect(providers[1].type).toBe('discord')
    expect(providers[2].type).toBe('telegram')
  })

  test('returns all providers when all enabled', () => {
    const status = {
      github_oauth: true,
      github_client_id: 'gh-id',
      discord_oauth: true,
      discord_client_id: 'dc-id',
      oidc_enabled: true,
      oidc_client_id: 'oidc-id',
      oidc_authorization_endpoint: 'https://auth.example.com',
      linuxdo_oauth: true,
      linuxdo_client_id: 'ldo-id',
      telegram_oauth: true,
    } as SystemStatus

    const providers = getAvailableOAuthProviders(status)
    expect(providers).toHaveLength(5)
  })
})

describe('hasOAuthProviders', () => {
  test('returns false when status is null', () => {
    expect(hasOAuthProviders(null)).toBe(false)
  })

  test('returns false when no providers are enabled', () => {
    const status = {} as SystemStatus
    expect(hasOAuthProviders(status)).toBe(false)
  })

  test('returns true when github_oauth is enabled', () => {
    expect(hasOAuthProviders({ github_oauth: true } as SystemStatus)).toBe(true)
  })

  test('returns true when discord_oauth is enabled', () => {
    expect(hasOAuthProviders({ discord_oauth: true } as SystemStatus)).toBe(
      true
    )
  })

  test('returns true when oidc_enabled is enabled', () => {
    expect(hasOAuthProviders({ oidc_enabled: true } as SystemStatus)).toBe(true)
  })

  test('returns true when linuxdo_oauth is enabled', () => {
    expect(hasOAuthProviders({ linuxdo_oauth: true } as SystemStatus)).toBe(
      true
    )
  })

  test('returns true when telegram_oauth is enabled', () => {
    expect(hasOAuthProviders({ telegram_oauth: true } as SystemStatus)).toBe(
      true
    )
  })

  test('returns true when wechat_login is enabled', () => {
    expect(hasOAuthProviders({ wechat_login: true } as SystemStatus)).toBe(true)
  })

  test('returns true when multiple providers are enabled', () => {
    const status = {
      github_oauth: true,
      telegram_oauth: true,
    } as SystemStatus
    expect(hasOAuthProviders(status)).toBe(true)
  })
})
