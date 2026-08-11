import { describe, it, expect } from 'vitest'

import type {
  ApiResponse,
  PasskeyStatus,
  PasskeyOptionsPayload,
} from '@/features/auth/passkey/types'

describe('passkey/types', () => {
  it('ApiResponse can be constructed with success state', () => {
    const response: ApiResponse<string> = {
      success: true,
      message: 'OK',
      data: 'result',
    }
    expect(response.success).toBe(true)
    expect(response.data).toBe('result')
  })

  it('ApiResponse can have no data', () => {
    const response: ApiResponse = {
      success: false,
      message: 'Not found',
    }
    expect(response.success).toBe(false)
    expect(response.data).toBeUndefined()
  })

  it('PasskeyStatus has correct required fields', () => {
    const status: PasskeyStatus = {
      enabled: true,
    }
    expect(status.enabled).toBe(true)
    expect(status.last_used_at).toBeUndefined()
  })

  it('PasskeyStatus supports all optional fields', () => {
    const status: PasskeyStatus = {
      enabled: true,
      last_used_at: '2024-01-01T00:00:00Z',
      backup_eligible: true,
      backup_state: false,
    }
    expect(status.last_used_at).toBe('2024-01-01T00:00:00Z')
    expect(status.backup_eligible).toBe(true)
    expect(status.backup_state).toBe(false)
  })

  it('PasskeyStatus allows null last_used_at', () => {
    const status: PasskeyStatus = {
      enabled: false,
      last_used_at: null,
    }
    expect(status.last_used_at).toBeNull()
  })

  it('PasskeyStatus allows extra keys via index signature', () => {
    const status: PasskeyStatus = {
      enabled: true,
      customField: 'value',
    }
    expect(status.customField).toBe('value')
  })

  it('PasskeyOptionsPayload can be constructed with options', () => {
    const payload: PasskeyOptionsPayload = {
      options: { challenge: 'abc' },
      flow_token: 'token123',
      expires_at: 1234567890,
    }
    expect(payload.flow_token).toBe('token123')
    expect(payload.expires_at).toBe(1234567890)
  })

  it('PasskeyOptionsPayload supports publicKey and response fields', () => {
    const payload: PasskeyOptionsPayload = {
      publicKey: { challenge: 'abc' },
      response: { id: 'cred1' },
      Response: { id: 'cred2' },
    }
    expect(payload.publicKey).toEqual({ challenge: 'abc' })
    expect(payload.response).toEqual({ id: 'cred1' })
    expect(payload.Response).toEqual({ id: 'cred2' })
  })

  it('PasskeyOptionsPayload allows all fields undefined', () => {
    const payload: PasskeyOptionsPayload = {}
    expect(payload.options).toBeUndefined()
    expect(payload.flow_token).toBeUndefined()
    expect(payload.expires_at).toBeUndefined()
  })
})
