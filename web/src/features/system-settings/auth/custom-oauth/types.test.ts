import { describe, it, expect } from 'vitest'
import * as z from 'zod'

import {
  customOAuthFormSchema,
  OAUTH_PRESETS,
  AUTH_STYLE_OPTIONS,
} from './types'

describe('customOAuthFormSchema', () => {
  const validData = {
    name: 'My Provider',
    slug: 'my-provider',
    icon: 'github',
    enabled: true,
    client_id: 'client123',
    client_secret: 'secret456',
    authorization_endpoint: 'https://auth.test/authorize',
    token_endpoint: 'https://auth.test/token',
    user_info_endpoint: 'https://auth.test/userinfo',
    scopes: 'openid profile',
    user_id_field: 'sub',
    username_field: 'preferred_username',
    display_name_field: 'name',
    email_field: 'email',
    well_known: 'https://auth.test/.well-known/openid-configuration',
    auth_style: 0,
    access_policy: '',
    access_denied_message: '',
  }

  it('validates valid data', () => {
    const result = customOAuthFormSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = customOAuthFormSchema.safeParse({ ...validData, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['name'])
    }
  })

  it('requires slug', () => {
    const result = customOAuthFormSchema.safeParse({ ...validData, slug: '' })
    expect(result.success).toBe(false)
  })

  it('validates slug format - only lowercase, numbers, hyphens', () => {
    const invalid = customOAuthFormSchema.safeParse({
      ...validData,
      slug: 'Invalid_Slug!',
    })
    expect(invalid.success).toBe(false)

    const valid = customOAuthFormSchema.safeParse({
      ...validData,
      slug: 'valid-slug-123',
    })
    expect(valid.success).toBe(true)
  })

  it('requires client_id', () => {
    const result = customOAuthFormSchema.safeParse({
      ...validData,
      client_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires authorization_endpoint', () => {
    const result = customOAuthFormSchema.safeParse({
      ...validData,
      authorization_endpoint: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires token_endpoint', () => {
    const result = customOAuthFormSchema.safeParse({
      ...validData,
      token_endpoint: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires user_info_endpoint', () => {
    const result = customOAuthFormSchema.safeParse({
      ...validData,
      user_info_endpoint: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires user_id_field', () => {
    const result = customOAuthFormSchema.safeParse({
      ...validData,
      user_id_field: '',
    })
    expect(result.success).toBe(false)
  })

  it('defaults optional string fields to empty string', () => {
    const minimal = {
      name: 'Test',
      slug: 'test',
      client_id: 'cid',
      authorization_endpoint: 'https://x/auth',
      token_endpoint: 'https://x/token',
      user_info_endpoint: 'https://x/user',
      user_id_field: 'id',
    }
    const result = customOAuthFormSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.icon).toBe('')
      expect(result.data.client_secret).toBe('')
      expect(result.data.scopes).toBe('')
      expect(result.data.username_field).toBe('')
      expect(result.data.display_name_field).toBe('')
      expect(result.data.email_field).toBe('')
      expect(result.data.well_known).toBe('')
      expect(result.data.access_policy).toBe('')
      expect(result.data.access_denied_message).toBe('')
    }
  })

  it('defaults enabled to true', () => {
    const minimal = {
      name: 'Test',
      slug: 'test',
      client_id: 'cid',
      authorization_endpoint: 'https://x/auth',
      token_endpoint: 'https://x/token',
      user_info_endpoint: 'https://x/user',
      user_id_field: 'id',
    }
    const result = customOAuthFormSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.enabled).toBe(true)
    }
  })

  it('defaults auth_style to 0', () => {
    const minimal = {
      name: 'Test',
      slug: 'test',
      client_id: 'cid',
      authorization_endpoint: 'https://x/auth',
      token_endpoint: 'https://x/token',
      user_info_endpoint: 'https://x/user',
      user_id_field: 'id',
    }
    const result = customOAuthFormSchema.safeParse(minimal)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.auth_style).toBe(0)
    }
  })

  it('validates auth_style range (0-2)', () => {
    expect(
      customOAuthFormSchema.safeParse({ ...validData, auth_style: -1 }).success
    ).toBe(false)
    expect(
      customOAuthFormSchema.safeParse({ ...validData, auth_style: 3 }).success
    ).toBe(false)
    expect(
      customOAuthFormSchema.safeParse({ ...validData, auth_style: 1 }).success
    ).toBe(true)
    expect(
      customOAuthFormSchema.safeParse({ ...validData, auth_style: 2 }).success
    ).toBe(true)
  })

  it('requires auth_style to be an integer', () => {
    expect(
      customOAuthFormSchema.safeParse({ ...validData, auth_style: 1.5 }).success
    ).toBe(false)
  })
})

describe('OAUTH_PRESETS', () => {
  it('contains expected presets', () => {
    const keys = OAUTH_PRESETS.map((p) => p.key)
    expect(keys).toContain('github-enterprise')
    expect(keys).toContain('gitlab')
    expect(keys).toContain('gitea')
    expect(keys).toContain('nextcloud')
    expect(keys).toContain('keycloak')
    expect(keys).toContain('authentik')
    expect(keys).toContain('ory')
  })

  it('all presets have required fields', () => {
    for (const preset of OAUTH_PRESETS) {
      expect(preset.key).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.icon).toBeTruthy()
      expect(preset.authorization_endpoint).toBeTruthy()
      expect(preset.token_endpoint).toBeTruthy()
      expect(preset.user_info_endpoint).toBeTruthy()
      expect(preset.user_id_field).toBeTruthy()
      expect(typeof preset.needsBaseUrl).toBe('boolean')
    }
  })

  it('all presets need base URL', () => {
    for (const preset of OAUTH_PRESETS) {
      expect(preset.needsBaseUrl).toBe(true)
    }
  })
})

describe('AUTH_STYLE_OPTIONS', () => {
  it('has three options', () => {
    expect(AUTH_STYLE_OPTIONS).toHaveLength(3)
  })

  it('has values 0, 1, 2', () => {
    expect(AUTH_STYLE_OPTIONS[0].value).toBe(0)
    expect(AUTH_STYLE_OPTIONS[1].value).toBe(1)
    expect(AUTH_STYLE_OPTIONS[2].value).toBe(2)
  })

  it('has descriptive labels', () => {
    expect(AUTH_STYLE_OPTIONS[0].labelKey).toBe('Auto Detect')
    expect(AUTH_STYLE_OPTIONS[1].labelKey).toBe('Params (in body)')
    expect(AUTH_STYLE_OPTIONS[2].labelKey).toBe('Header (Basic Auth)')
  })
})
