import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

import { useOAuthLogin } from './use-oauth-login'

const mockHandleLoginSuccess = vi.fn()
const mockNavigate = vi.fn()
const mockCreateOAuthFlow = vi.fn()
const mockLogout = vi.fn()
const mockTelegramLogin = vi.fn()
const mockClearAuthentication = vi.fn()
const mockIsAuthBundle = vi.fn()
const mockBuildGitHubOAuthUrl = vi.fn()
const mockBuildDiscordOAuthUrl = vi.fn()
const mockBuildOIDCOAuthUrl = vi.fn()
const mockBuildLinuxDOOAuthUrl = vi.fn()
const mockPickTelegramAuthorization = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}))

vi.mock('@/lib/api', () => ({
  clearAuthentication: () => mockClearAuthentication(),
  isAuthBundle: (...args: unknown[]) => mockIsAuthBundle(...args),
}))

vi.mock('../api', () => ({
  createOAuthFlow: (...args: unknown[]) => mockCreateOAuthFlow(...args),
  logout: () => mockLogout(),
  telegramLogin: (...args: unknown[]) => mockTelegramLogin(...args),
}))

vi.mock('../lib/oauth', () => ({
  buildGitHubOAuthUrl: (...args: unknown[]) => mockBuildGitHubOAuthUrl(...args),
  buildDiscordOAuthUrl: (...args: unknown[]) => mockBuildDiscordOAuthUrl(...args),
  buildOIDCOAuthUrl: (...args: unknown[]) => mockBuildOIDCOAuthUrl(...args),
  buildLinuxDOOAuthUrl: (...args: unknown[]) => mockBuildLinuxDOOAuthUrl(...args),
}))

vi.mock('../lib/telegram-login', () => ({
  pickTelegramAuthorization: (...args: unknown[]) => mockPickTelegramAuthorization(...args),
}))

vi.mock('./use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess: mockHandleLoginSuccess,
    redirectToLogin: vi.fn(),
  }),
}))

describe('useOAuthLogin', () => {
  const baseStatus = {
    github_client_id: 'gh-id',
    discord_client_id: 'dc-id',
    oidc_authorization_endpoint: 'https://oidc.example.com/auth',
    oidc_client_id: 'oidc-id',
    linuxdo_client_id: 'ldo-id',
    telegram_bot_name: 'mybot',
  }

  let originalWindowOpen: typeof window.open

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockLogout.mockResolvedValue({ success: true })
    mockCreateOAuthFlow.mockResolvedValue('state-token')
    mockBuildGitHubOAuthUrl.mockReturnValue('https://github.com/oauth')
    mockBuildDiscordOAuthUrl.mockReturnValue('https://discord.com/oauth')
    mockBuildOIDCOAuthUrl.mockReturnValue('https://oidc.example.com/oauth')
    mockBuildLinuxDOOAuthUrl.mockReturnValue('https://linuxdo.com/oauth')
    originalWindowOpen = window.open
    window.open = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.open = originalWindowOpen
  })

  it('initializes with not loading', () => {
    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.githubButtonDisabled).toBe(false)
  })

  it('handleGitHubLogin opens github oauth', async () => {
    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleGitHubLogin()
    })

    expect(mockLogout).toHaveBeenCalled()
    expect(mockCreateOAuthFlow).toHaveBeenCalledWith('github', 'login')
    expect(mockBuildGitHubOAuthUrl).toHaveBeenCalledWith('gh-id', 'state-token')
    expect(window.open).toHaveBeenCalledWith('https://github.com/oauth', '_self')
  })

  it('handleGitHubLogin does nothing without client_id', async () => {
    const { result } = renderHook(() => useOAuthLogin({ ...baseStatus, github_client_id: undefined } as any))

    await act(async () => {
      await result.current.handleGitHubLogin()
    })

    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('handleGitHubLogin shows timeout message', async () => {
    // Make logout hang forever (never resolve)
    let logoutResolve: (v: unknown) => void
    mockLogout.mockReturnValue(new Promise((resolve) => { logoutResolve = resolve }))

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    act(() => {
      result.current.handleGitHubLogin()
    })

    // After 20s timeout fires
    act(() => { vi.advanceTimersByTime(20000) })

    expect(result.current.githubButtonDisabled).toBe(true)
    // Clean up the hanging promise
    logoutResolve!({ success: true })
  })

  it('handleGitHubLogin handles error', async () => {
    mockLogout.mockRejectedValue(new Error('logout failed'))

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleGitHubLogin()
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to start GitHub login')
  })

  it('handleDiscordLogin opens discord oauth', async () => {
    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleDiscordLogin()
    })

    expect(mockCreateOAuthFlow).toHaveBeenCalledWith('discord', 'login')
    expect(window.open).toHaveBeenCalledWith('https://discord.com/oauth', '_self')
  })

  it('handleDiscordLogin does nothing without client_id', async () => {
    const { result } = renderHook(() => useOAuthLogin({ ...baseStatus, discord_client_id: undefined } as any))

    await act(async () => {
      await result.current.handleDiscordLogin()
    })

    expect(mockCreateOAuthFlow).not.toHaveBeenCalled()
  })

  it('handleDiscordLogin handles error', async () => {
    mockLogout.mockRejectedValue(new Error('err'))

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleDiscordLogin()
    })

    expect(toast.error).toHaveBeenCalledWith('Failed to start Discord login')
  })

  it('handleOIDCLogin opens oidc oauth', async () => {
    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleOIDCLogin()
    })

    expect(mockCreateOAuthFlow).toHaveBeenCalledWith('oidc', 'login')
    expect(window.open).toHaveBeenCalledWith('https://oidc.example.com/oauth', '_self')
  })

  it('handleOIDCLogin does nothing without endpoint', async () => {
    const { result } = renderHook(() =>
      useOAuthLogin({ ...baseStatus, oidc_authorization_endpoint: undefined } as any)
    )

    await act(async () => {
      await result.current.handleOIDCLogin()
    })

    expect(mockCreateOAuthFlow).not.toHaveBeenCalled()
  })

  it('handleLinuxDOLogin opens linuxdo oauth', async () => {
    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleLinuxDOLogin()
    })

    expect(mockCreateOAuthFlow).toHaveBeenCalledWith('linuxdo', 'login')
    expect(window.open).toHaveBeenCalledWith('https://linuxdo.com/oauth', '_self')
  })

  it('handleLinuxDOLogin does nothing without client_id', async () => {
    const { result } = renderHook(() =>
      useOAuthLogin({ ...baseStatus, linuxdo_client_id: undefined } as any)
    )

    await act(async () => {
      await result.current.handleLinuxDOLogin()
    })

    expect(mockCreateOAuthFlow).not.toHaveBeenCalled()
  })

  it('handleTelegramLogin opens dialog', async () => {
    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleTelegramLogin()
    })

    expect(result.current.isTelegramDialogOpen).toBe(true)
  })

  it('handleTelegramLogin shows error without bot name', async () => {
    const { result } = renderHook(() =>
      useOAuthLogin({ ...baseStatus, telegram_bot_name: '  ' } as any)
    )

    await act(async () => {
      await result.current.handleTelegramLogin()
    })

    expect(toast.error).toHaveBeenCalledWith('Login failed')
  })

  it('handleTelegramAuthorization succeeds', async () => {
    const authData = { id: 123, first_name: 'Test' }
    mockPickTelegramAuthorization.mockReturnValue(authData)
    mockTelegramLogin.mockResolvedValue({ success: true, data: { user: {}, token: 'tk' } })
    mockIsAuthBundle.mockReturnValue(true)
    mockHandleLoginSuccess.mockResolvedValue(undefined)

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleTelegramAuthorization({ id: 123 })
    })

    expect(mockTelegramLogin).toHaveBeenCalledWith(authData)
    expect(mockHandleLoginSuccess).toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Welcome back!')
  })

  it('handleTelegramAuthorization fails with null authorization', async () => {
    mockPickTelegramAuthorization.mockReturnValue(null)

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleTelegramAuthorization(null)
    })

    expect(toast.error).toHaveBeenCalledWith('Login failed')
  })

  it('handleTelegramAuthorization handles unsuccessful response', async () => {
    mockPickTelegramAuthorization.mockReturnValue({ id: 1 })
    mockTelegramLogin.mockResolvedValue({ success: false })
    mockIsAuthBundle.mockReturnValue(false)

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleTelegramAuthorization({ id: 1 })
    })

    expect(toast.error).toHaveBeenCalledWith('Login failed')
  })

  it('handleCustomOAuthLogin opens custom provider', async () => {
    const provider = {
      slug: 'custom',
      name: 'Custom',
      client_id: 'cust-id',
      authorization_endpoint: 'https://custom.com/auth',
      scopes: 'openid profile',
    }

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleCustomOAuthLogin(provider as any)
    })

    expect(mockCreateOAuthFlow).toHaveBeenCalledWith('custom', 'login')
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://custom.com/auth'),
      '_self'
    )
  })

  it('handleCustomOAuthLogin does nothing without required fields', async () => {
    const provider = {
      slug: 'custom',
      name: 'Custom',
      client_id: '',
      authorization_endpoint: '',
      scopes: '',
    }

    const { result } = renderHook(() => useOAuthLogin(baseStatus as any))

    await act(async () => {
      await result.current.handleCustomOAuthLogin(provider as any)
    })

    expect(mockCreateOAuthFlow).not.toHaveBeenCalled()
  })
})
