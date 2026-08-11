import { describe, it, expect, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: () => null,
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({ systemName: '', logo: '', loading: false }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: null, loading: false }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ auth: { user: null, setPending2FAFlowToken: vi.fn() } }),
}))

vi.mock('@/lib/passkey', () => ({
  buildAssertionResult: vi.fn(),
  prepareCredentialRequestOptions: vi.fn(),
  isPasskeySupported: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/components/turnstile', () => ({
  Turnstile: () => null,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

import * as authIndex from '@/features/auth/index'

describe('auth barrel exports', () => {
  it('exports API functions', () => {
    expect(authIndex.login).toBeDefined()
    expect(authIndex.login2fa).toBeDefined()
    expect(authIndex.logout).toBeDefined()
    expect(authIndex.register).toBeDefined()
    expect(authIndex.sendPasswordResetEmail).toBeDefined()
    expect(authIndex.sendEmailVerification).toBeDefined()
    expect(authIndex.bindEmail).toBeDefined()
    expect(authIndex.createOAuthFlow).toBeDefined()
    expect(authIndex.githubOAuthStart).toBeDefined()
    expect(authIndex.wechatLoginByCode).toBeDefined()
    expect(authIndex.telegramLogin).toBeDefined()
  })

  it('exports form schemas', () => {
    expect(authIndex.loginFormSchema).toBeDefined()
    expect(authIndex.registerFormSchema).toBeDefined()
    expect(authIndex.forgotPasswordFormSchema).toBeDefined()
    expect(authIndex.otpFormSchema).toBeDefined()
  })

  it('exports constants', () => {
    expect(typeof authIndex.PASSWORD_MIN_LENGTH).toBe('number')
    expect(typeof authIndex.PASSWORD_MAX_LENGTH).toBe('number')
    expect(typeof authIndex.OTP_LENGTH).toBe('number')
    expect(typeof authIndex.BACKUP_CODE_LENGTH).toBe('number')
    expect(authIndex.BACKUP_CODE_REGEX).toBeInstanceOf(RegExp)
    expect(authIndex.OTP_REGEX).toBeInstanceOf(RegExp)
    expect(typeof authIndex.EMAIL_VERIFICATION_COUNTDOWN).toBe('number')
    expect(typeof authIndex.PASSWORD_RESET_COUNTDOWN).toBe('number')
  })

  it('exports OAuth URL builder functions', () => {
    expect(authIndex.buildGitHubOAuthUrl).toBeDefined()
    expect(authIndex.buildDiscordOAuthUrl).toBeDefined()
    expect(authIndex.buildOIDCOAuthUrl).toBeDefined()
    expect(authIndex.buildLinuxDOOAuthUrl).toBeDefined()
    expect(authIndex.getAvailableOAuthProviders).toBeDefined()
    expect(authIndex.hasOAuthProviders).toBeDefined()
  })

  it('exports storage functions', () => {
    expect(authIndex.getAffiliateCode).toBeDefined()
    expect(authIndex.saveAffiliateCode).toBeDefined()
  })

  it('exports validation functions', () => {
    expect(authIndex.isValidOTP).toBeDefined()
    expect(authIndex.isValidBackupCode).toBeDefined()
    expect(authIndex.formatBackupCode).toBeDefined()
    expect(authIndex.cleanBackupCode).toBeDefined()
    expect(authIndex.isValidEmail).toBeDefined()
  })

  it('exports hooks', () => {
    expect(authIndex.useTurnstile).toBeDefined()
    expect(authIndex.useOAuthLogin).toBeDefined()
    expect(authIndex.useAuthRedirect).toBeDefined()
    expect(authIndex.useEmailVerification).toBeDefined()
  })

  it('exports components', () => {
    expect(authIndex.AuthLayout).toBeDefined()
    expect(authIndex.OAuthProviders).toBeDefined()
    expect(authIndex.TermsFooter).toBeDefined()
    expect(authIndex.LegalConsent).toBeDefined()
    expect(authIndex.SignIn).toBeDefined()
    expect(authIndex.SignUp).toBeDefined()
    expect(authIndex.ForgotPassword).toBeDefined()
    expect(authIndex.Otp).toBeDefined()
  })
})
