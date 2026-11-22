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

import * as secureVerificationIndex from '@/features/auth/secure-verification/index'

describe('secure-verification barrel exports', () => {
  it('exports checkVerificationMethods function', () => {
    expect(secureVerificationIndex.checkVerificationMethods).toBeDefined()
    expect(typeof secureVerificationIndex.checkVerificationMethods).toBe('function')
  })

  it('exports verify function', () => {
    expect(secureVerificationIndex.verify).toBeDefined()
    expect(typeof secureVerificationIndex.verify).toBe('function')
  })

  it('exports SecureVerificationDialog component', () => {
    expect(secureVerificationIndex.SecureVerificationDialog).toBeDefined()
    expect(typeof secureVerificationIndex.SecureVerificationDialog).toBe('function')
  })

  it('exports useSecureVerification hook', () => {
    expect(secureVerificationIndex.useSecureVerification).toBeDefined()
    expect(typeof secureVerificationIndex.useSecureVerification).toBe('function')
  })
})
