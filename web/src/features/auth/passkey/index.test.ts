import { describe, it, expect, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: null, loading: false }),
}))

vi.mock('@/lib/passkey', () => ({
  buildAssertionResult: vi.fn(),
  prepareCredentialRequestOptions: vi.fn(),
  isPasskeySupported: vi.fn().mockResolvedValue(false),
}))

import * as passkeyIndex from './index'

describe('passkey barrel exports', () => {
  it('exports API functions', () => {
    expect(passkeyIndex.beginPasskeyLogin).toBeDefined()
    expect(passkeyIndex.finishPasskeyLogin).toBeDefined()
    expect(passkeyIndex.beginPasskeyRegistration).toBeDefined()
    expect(passkeyIndex.finishPasskeyRegistration).toBeDefined()
    expect(passkeyIndex.getPasskeyStatus).toBeDefined()
    expect(passkeyIndex.deletePasskey).toBeDefined()
    expect(passkeyIndex.beginPasskeyVerification).toBeDefined()
    expect(passkeyIndex.finishPasskeyVerification).toBeDefined()
  })

  it('exports usePasskeyManagement hook', () => {
    expect(passkeyIndex.usePasskeyManagement).toBeDefined()
  })

  it('all exports are functions', () => {
    const functionExports = [
      'beginPasskeyLogin',
      'finishPasskeyLogin',
      'beginPasskeyRegistration',
      'finishPasskeyRegistration',
      'getPasskeyStatus',
      'deletePasskey',
      'usePasskeyManagement',
    ] as const

    for (const name of functionExports) {
      expect(typeof (passkeyIndex as Record<string, unknown>)[name]).toBe(
        'function'
      )
    }
  })
})
