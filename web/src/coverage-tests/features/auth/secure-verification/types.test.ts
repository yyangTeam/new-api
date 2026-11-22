import { describe, it, expect } from 'vitest'

import type {
  VerificationMethod,
  SecurityProofScope,
  SecurityProof,
  SecureVerificationState,
  VerificationRequirements,
  VerificationInput,
  RequestVerificationOptions,
} from '@/features/auth/secure-verification/types'

describe('secure-verification/types', () => {
  it('VerificationMethod accepts 2fa', () => {
    const method: VerificationMethod = '2fa'
    expect(method).toBe('2fa')
  })

  it('VerificationMethod accepts passkey', () => {
    const method: VerificationMethod = 'passkey'
    expect(method).toBe('passkey')
  })

  it('SecurityProofScope accepts channel.key.read', () => {
    const scope: SecurityProofScope = 'channel.key.read'
    expect(scope).toBe('channel.key.read')
  })

  it('SecurityProofScope accepts passkey.register', () => {
    const scope: SecurityProofScope = 'passkey.register'
    expect(scope).toBe('passkey.register')
  })

  it('SecurityProofScope accepts passkey.delete', () => {
    const scope: SecurityProofScope = 'passkey.delete'
    expect(scope).toBe('passkey.delete')
  })

  it('SecurityProof can be constructed with required fields', () => {
    const proof: SecurityProof = {
      proof_token: 'token123',
      expires_at: 1234567890,
      method: '2fa',
      scope: 'channel.key.read',
    }
    expect(proof.proof_token).toBe('token123')
    expect(proof.expires_at).toBe(1234567890)
    expect(proof.method).toBe('2fa')
    expect(proof.scope).toBe('channel.key.read')
  })

  it('SecureVerificationState idle phase has no extra fields', () => {
    const state: SecureVerificationState = { phase: 'idle' }
    expect(state.phase).toBe('idle')
  })

  it('SecureVerificationState loading phase carries the request', () => {
    const request: RequestVerificationOptions = {
      scope: 'channel.key.read',
      context: { channel_id: 1 },
    }
    const state: SecureVerificationState = { phase: 'loading', request }
    expect(state.phase).toBe('loading')
    expect(state.request).toBe(request)
  })

  it('SecureVerificationState error phase carries request and error', () => {
    const request: RequestVerificationOptions = {
      scope: 'passkey.register',
    }
    const state: SecureVerificationState = {
      phase: 'error',
      request,
      error: 'Something went wrong',
    }
    expect(state.phase).toBe('error')
    expect(state.error).toBe('Something went wrong')
    expect(state.request).toBe(request)
  })

  it('SecureVerificationState ready phase carries requirements and input', () => {
    const request: RequestVerificationOptions = {
      scope: 'channel.key.read',
      context: { channel_id: 1 },
    }
    const requirements: VerificationRequirements = {
      scope: 'channel.key.read',
      methods: [{ method: '2fa', available: true }],
      oauth_providers: [],
      password_encryption_enabled: false,
    }
    const input: VerificationInput = { method: '2fa', code: '123456' }
    const state: SecureVerificationState = {
      phase: 'ready',
      request,
      requirements,
      input,
    }
    expect(state.phase).toBe('ready')
    expect(state.requirements.methods).toHaveLength(1)
    expect(state.input).toEqual(input)
  })

  it('SecureVerificationState ready phase allows null input', () => {
    const request: RequestVerificationOptions = {
      scope: 'passkey.delete',
    }
    const requirements: VerificationRequirements = {
      scope: 'passkey.delete',
      methods: [],
      oauth_providers: [],
      password_encryption_enabled: false,
    }
    const state: SecureVerificationState = {
      phase: 'ready',
      request,
      requirements,
      input: null,
    }
    expect(state.input).toBeNull()
  })
})
