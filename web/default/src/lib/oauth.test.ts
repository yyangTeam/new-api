import {
  buildGitHubOAuthUrl,
  buildDiscordOAuthUrl,
  buildOIDCOAuthUrl,
  buildLinuxDOOAuthUrl,
} from './oauth'

describe('buildGitHubOAuthUrl', () => {
  test('builds correct GitHub OAuth URL with client_id and state', () => {
    const url = buildGitHubOAuthUrl('my-client-id', 'my-state')
    expect(url).toBe(
      'https://github.com/login/oauth/authorize?client_id=my-client-id&state=my-state&scope=user:email'
    )
  })

  test('includes special characters in state', () => {
    const url = buildGitHubOAuthUrl('cid', 'abc123+xyz')
    expect(url).toContain('state=abc123+xyz')
  })

  test('preserves empty string parameters', () => {
    const url = buildGitHubOAuthUrl('', '')
    expect(url).toBe(
      'https://github.com/login/oauth/authorize?client_id=&state=&scope=user:email'
    )
  })
})

describe('buildDiscordOAuthUrl', () => {
  test('builds correct Discord OAuth URL with all required params', () => {
    const url = buildDiscordOAuthUrl('discord-client', 'discord-state')
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://discord.com')
    expect(parsed.pathname).toBe('/oauth2/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('discord-client')
    expect(parsed.searchParams.get('state')).toBe('discord-state')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('scope')).toBe('identify+openid')
  })

  test('sets redirect_uri based on window.location.origin', () => {
    const url = buildDiscordOAuthUrl('cid', 'state')
    const parsed = new URL(url)
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      `${window.location.origin}/oauth/discord`
    )
  })
})

describe('buildOIDCOAuthUrl', () => {
  test('builds correct OIDC URL from a custom auth URL', () => {
    const url = buildOIDCOAuthUrl(
      'https://auth.example.com/authorize',
      'oidc-client',
      'oidc-state'
    )
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://auth.example.com')
    expect(parsed.pathname).toBe('/authorize')
    expect(parsed.searchParams.get('client_id')).toBe('oidc-client')
    expect(parsed.searchParams.get('state')).toBe('oidc-state')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('scope')).toBe('openid profile email')
  })

  test('sets redirect_uri to /oauth/oidc', () => {
    const url = buildOIDCOAuthUrl(
      'https://idp.test/auth',
      'cid',
      'st'
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      `${window.location.origin}/oauth/oidc`
    )
  })

  test('preserves existing query params in authUrl', () => {
    const url = buildOIDCOAuthUrl(
      'https://idp.test/auth?existing=1',
      'cid',
      'st'
    )
    const parsed = new URL(url)
    expect(parsed.searchParams.get('existing')).toBe('1')
    expect(parsed.searchParams.get('client_id')).toBe('cid')
  })
})

describe('buildLinuxDOOAuthUrl', () => {
  test('builds correct LinuxDO OAuth URL', () => {
    const url = buildLinuxDOOAuthUrl('ldo-client', 'ldo-state')
    expect(url).toBe(
      'https://connect.linux.do/oauth2/authorize?response_type=code&client_id=ldo-client&state=ldo-state'
    )
  })

  test('preserves empty string parameters', () => {
    const url = buildLinuxDOOAuthUrl('', '')
    expect(url).toBe(
      'https://connect.linux.do/oauth2/authorize?response_type=code&client_id=&state='
    )
  })
})
