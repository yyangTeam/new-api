import { UserAgreement } from '@/features/legal/user-agreement'
import { PrivacyPolicy } from '@/features/legal/privacy-policy'

describe('legal/index exports', () => {
  test('UserAgreement is a function component', () => {
    expect(typeof UserAgreement).toBe('function')
  })

  test('PrivacyPolicy is a function component', () => {
    expect(typeof PrivacyPolicy).toBe('function')
  })
})
