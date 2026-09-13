import { describe, it, expect, vi, beforeEach } from 'vitest'

import { render, waitFor } from '@/test/test-utils'

import { OtpForm } from '@/features/auth/otp/components/otp-form'

const mockHandleLoginSuccess = vi.fn()
const mockRedirectToLogin = vi.fn()
const mockRequestLoginVerification = vi.fn()
const mockCancel = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: vi.fn(),
}))

vi.mock('@/lib/secure-verification', () => ({
  AuthOperationError: {
    from: (e: unknown) => e,
  },
}))

vi.mock('@/features/auth/hooks/use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess: mockHandleLoginSuccess,
    redirectToLogin: mockRedirectToLogin,
  }),
}))

vi.mock('@/features/auth/secure-verification', () => ({
  useSecureVerification: () => ({
    requestLoginVerification: mockRequestLoginVerification,
    cancel: mockCancel,
    isActive: false,
    dialogProps: {
      state: { phase: 'idle' as const },
      passkeyDomains: null,
      onCancel: mockCancel,
      onRetry: vi.fn(),
      onInputChange: vi.fn(),
      onVerify: vi.fn(),
    },
  }),
  SecureVerificationDialog: ({
    state,
  }: {
    state: { phase: string }
  }) => (state.phase !== 'idle' ? <div data-testid='sv-dialog' /> : null),
}))

let authStoreState = {
  auth: {
    pendingLoginVerification: null as { flow_token: string; challenge: { flow_token: string }; redirectTo?: string } | null,
    session: { sid: 'test-sid' },
    setPendingLoginVerification: vi.fn(),
  },
}

vi.mock('@/stores/auth-store', () => {
  const useAuthStore = (selector: (state: typeof authStoreState) => unknown) =>
    selector(authStoreState)
  useAuthStore.getState = () => authStoreState
  return { useAuthStore }
})

describe('OtpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authStoreState = {
      auth: {
        pendingLoginVerification: null,
        session: { sid: 'test-sid' },
        setPendingLoginVerification: vi.fn(),
      },
    }
  })

  it('redirects to login when there is no pending verification', async () => {
    render(<OtpForm />)

    await waitFor(() => {
      expect(mockRedirectToLogin).toHaveBeenCalled()
    })
  })

  it('calls requestLoginVerification when pending challenge exists', async () => {
    const challenge = { flow_token: 'flow-123' }
    authStoreState.auth.pendingLoginVerification = {
      flow_token: 'flow-123',
      challenge,
      redirectTo: '/dashboard',
    }
    mockRequestLoginVerification.mockResolvedValue({
      token: 'auth-token',
    })

    render(<OtpForm />)

    await waitFor(() => {
      expect(mockRequestLoginVerification).toHaveBeenCalledWith(challenge)
    })
  })

  it('clears pendingLoginVerification from store on mount', async () => {
    const challenge = { flow_token: 'flow-123' }
    const setPending = vi.fn()
    authStoreState.auth.pendingLoginVerification = {
      flow_token: 'flow-123',
      challenge,
    }
    authStoreState.auth.setPendingLoginVerification = setPending
    mockRequestLoginVerification.mockResolvedValue(null)

    render(<OtpForm />)

    await waitFor(() => {
      expect(setPending).toHaveBeenCalledWith(null)
    })
  })

  it('calls handleLoginSuccess when verification succeeds', async () => {
    const challenge = { flow_token: 'flow-123' }
    const bundle = { token: 'auth-token' }
    authStoreState.auth.pendingLoginVerification = {
      flow_token: 'flow-123',
      challenge,
      redirectTo: '/dashboard',
    }
    mockRequestLoginVerification.mockResolvedValue(bundle)

    render(<OtpForm />)

    await waitFor(() => {
      expect(mockHandleLoginSuccess).toHaveBeenCalledWith(
        bundle,
        '/dashboard'
      )
    })
  })

  it('redirects to login when verification returns null', async () => {
    const challenge = { flow_token: 'flow-123' }
    authStoreState.auth.pendingLoginVerification = {
      flow_token: 'flow-123',
      challenge,
    }
    mockRequestLoginVerification.mockResolvedValue(null)

    render(<OtpForm />)

    await waitFor(() => {
      expect(mockRedirectToLogin).toHaveBeenCalled()
    })
  })
})
