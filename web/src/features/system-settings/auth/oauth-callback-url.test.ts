import { describe, it, expect } from 'vitest'

import { resolveOAuthSiteUrl, buildOAuthCallbackUrl } from './oauth-callback-url'

describe('resolveOAuthSiteUrl', () => {
  it.each([
    {
      desc: 'returns normalized URL without trailing slash',
      serverAddress: 'https://example.com/',
      fallback: 'https://fallback.com',
      expected: 'https://example.com',
    },
    {
      desc: 'removes multiple trailing slashes',
      serverAddress: 'https://example.com///',
      fallback: 'https://fallback.com',
      expected: 'https://example.com',
    },
    {
      desc: 'preserves URL with port',
      serverAddress: 'https://example.com:8080/',
      fallback: 'https://fallback.com',
      expected: 'https://example.com:8080',
    },
    {
      desc: 'trims whitespace',
      serverAddress: '  https://example.com  ',
      fallback: 'https://fallback.com',
      expected: 'https://example.com',
    },
    {
      desc: 'returns fallback when serverAddress is empty',
      serverAddress: '',
      fallback: 'https://fallback.com',
      expected: 'https://fallback.com',
    },
    {
      desc: 'returns fallback when serverAddress is only whitespace',
      serverAddress: '   ',
      fallback: 'https://fallback.com',
      expected: 'https://fallback.com',
    },
    {
      desc: 'returns fallback when serverAddress is only slashes after trim',
      serverAddress: '///',
      fallback: 'https://fallback.com',
      expected: 'https://fallback.com',
    },
    {
      desc: 'preserves path segments',
      serverAddress: 'https://example.com/api/v1/',
      fallback: 'https://fallback.com',
      expected: 'https://example.com/api/v1',
    },
  ])('$desc', ({ serverAddress, fallback, expected }) => {
    expect(resolveOAuthSiteUrl(serverAddress, fallback)).toBe(expected)
  })
})

describe('buildOAuthCallbackUrl', () => {
  it.each([
    {
      desc: 'builds callback URL for github provider',
      serverAddress: 'https://example.com',
      callbackPath: 'github',
      fallback: 'https://fallback.com',
      expected: 'https://example.com/oauth/github',
    },
    {
      desc: 'builds callback URL for discord provider',
      serverAddress: 'https://example.com/',
      callbackPath: 'discord',
      fallback: 'https://fallback.com',
      expected: 'https://example.com/oauth/discord',
    },
    {
      desc: 'builds callback URL for oidc provider',
      serverAddress: 'https://example.com:3000/',
      callbackPath: 'oidc',
      fallback: 'https://fallback.com',
      expected: 'https://example.com:3000/oauth/oidc',
    },
    {
      desc: 'strips leading slashes from callbackPath',
      serverAddress: 'https://example.com',
      callbackPath: '///github',
      fallback: 'https://fallback.com',
      expected: 'https://example.com/oauth/github',
    },
    {
      desc: 'uses fallback when serverAddress is empty',
      serverAddress: '',
      callbackPath: 'github',
      fallback: 'https://fallback.com',
      expected: 'https://fallback.com/oauth/github',
    },
    {
      desc: 'handles serverAddress with trailing slash and callbackPath with leading slash',
      serverAddress: 'https://example.com/',
      callbackPath: '/wechat',
      fallback: 'https://fallback.com',
      expected: 'https://example.com/oauth/wechat',
    },
  ])('$desc', ({ serverAddress, callbackPath, fallback, expected }) => {
    expect(buildOAuthCallbackUrl(serverAddress, callbackPath, fallback)).toBe(
      expected
    )
  })
})
