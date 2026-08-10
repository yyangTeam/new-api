import { describe, it, expect } from 'vitest'

import type {
  VerificationMethod,
  SecurityProofScope,
  SecurityProof,
  VerificationMethods,
  SecureVerificationState,
  UseSecureVerificationOptions,
  StartVerificationOptions,
} from './types'

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

  it('VerificationMethods has correct shape', () => {
    const methods: VerificationMethods = {
      has2FA: true,
      hasPasskey: false,
      passkeySupported: true,
    }
    expect(methods.has2FA).toBe(true)
    expect(methods.hasPasskey).toBe(false)
    expect(methods.passkeySupported).toBe(true)
  })

  it('SecureVerificationState has correct shape', () => {
    const state: SecureVerificationState = {
      method: '2fa',
      loading: false,
      code: '123456',
    }
    expect(state.method).toBe('2fa')
    expect(state.loading).toBe(false)
    expect(state.code).toBe('123456')
  })

  it('SecureVerificationState supports optional fields', () => {
    const state: SecureVerificationState = {
      method: 'passkey',
      scope: 'passkey.register',
      loading: true,
      code: '',
      title: 'Custom title',
      description: 'Custom desc',
    }
    expect(state.scope).toBe('passkey.register')
    expect(state.title).toBe('Custom title')
    expect(state.description).toBe('Custom desc')
  })

  it('SecureVerificationState allows null method', () => {
    const state: SecureVerificationState = {
      method: null,
      loading: false,
      code: '',
    }
    expect(state.method).toBeNull()
  })

  it('UseSecureVerificationOptions has correct shape', () => {
    const options: UseSecureVerificationOptions = {
      onSuccess: () => {},
      onError: () => {},
      successMessage: 'Done!',
      autoReset: true,
    }
    expect(options.successMessage).toBe('Done!')
    expect(options.autoReset).toBe(true)
  })

  it('StartVerificationOptions has correct shape', () => {
    const options: StartVerificationOptions = {
      scope: 'channel.key.read',
      preferredMethod: 'passkey',
      title: 'Verify',
      description: 'Please verify',
    }
    expect(options.scope).toBe('channel.key.read')
    expect(options.preferredMethod).toBe('passkey')
  })

  it('StartVerificationOptions requires only scope', () => {
    const options: StartVerificationOptions = {
      scope: 'passkey.delete',
    }
    expect(options.scope).toBe('passkey.delete')
    expect(options.preferredMethod).toBeUndefined()
    expect(options.title).toBeUndefined()
  })
})
