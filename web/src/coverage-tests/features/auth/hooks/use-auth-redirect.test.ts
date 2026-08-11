import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useAuthRedirect } from '@/features/auth/hooks/use-auth-redirect'

const mockNavigate = vi.fn()
const mockApplyAuthBundle = vi.fn()
const mockGetSavedLanguage = vi.fn()
const mockSanitizeAuthRedirect = vi.fn()
const mockChangeLanguage = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/lib/api', () => ({
  applyAuthBundle: (...args: unknown[]) => mockApplyAuthBundle(...args),
}))

vi.mock('i18next', () => ({
  default: {
    language: 'en',
    changeLanguage: (...args: unknown[]) => mockChangeLanguage(...args),
  },
}))

vi.mock('@/features/auth/lib/auth-redirect', () => ({
  getSavedLanguage: (...args: unknown[]) => mockGetSavedLanguage(...args),
  sanitizeAuthRedirect: (...args: unknown[]) => mockSanitizeAuthRedirect(...args),
}))

describe('useAuthRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSanitizeAuthRedirect.mockReturnValue('/dashboard')
    mockGetSavedLanguage.mockReturnValue(null)
    mockChangeLanguage.mockResolvedValue(undefined)
  })

  it('handleLoginSuccess applies auth bundle and navigates', async () => {
    const { result } = renderHook(() => useAuthRedirect())
    const bundle = { user: { username: 'test' }, token: 'tok' }

    await act(async () => {
      await result.current.handleLoginSuccess(bundle as any)
    })

    expect(mockApplyAuthBundle).toHaveBeenCalledWith(bundle)
    expect(mockNavigate).toHaveBeenCalledWith({
      href: '/dashboard',
      replace: true,
    })
  })

  it('handleLoginSuccess changes language when saved lang differs', async () => {
    mockGetSavedLanguage.mockReturnValue('zh')

    const { result } = renderHook(() => useAuthRedirect())
    const bundle = { user: { language: 'zh' }, token: 'tok' }

    await act(async () => {
      await result.current.handleLoginSuccess(bundle as any)
    })

    expect(mockChangeLanguage).toHaveBeenCalledWith('zh')
  })

  it('handleLoginSuccess does not change language when same', async () => {
    mockGetSavedLanguage.mockReturnValue('en')

    const { result } = renderHook(() => useAuthRedirect())
    const bundle = { user: {}, token: 'tok' }

    await act(async () => {
      await result.current.handleLoginSuccess(bundle as any)
    })

    expect(mockChangeLanguage).not.toHaveBeenCalled()
  })

  it('handleLoginSuccess uses custom redirectTo', async () => {
    mockSanitizeAuthRedirect.mockReturnValue('/custom')

    const { result } = renderHook(() => useAuthRedirect())
    const bundle = { user: {}, token: 'tok' }

    await act(async () => {
      await result.current.handleLoginSuccess(bundle as any, '/custom')
    })

    expect(mockSanitizeAuthRedirect).toHaveBeenCalledWith('/custom', expect.any(String))
    expect(mockNavigate).toHaveBeenCalledWith({
      href: '/custom',
      replace: true,
    })
  })

  it('handleLoginSuccess falls back to /dashboard when sanitize returns null', async () => {
    mockSanitizeAuthRedirect.mockReturnValue(null)

    const { result } = renderHook(() => useAuthRedirect())
    const bundle = { user: {}, token: 'tok' }

    await act(async () => {
      await result.current.handleLoginSuccess(bundle as any)
    })

    expect(mockNavigate).toHaveBeenCalledWith({
      href: '/dashboard',
      replace: true,
    })
  })

  it('redirectTo2FA navigates to /otp', () => {
    const { result } = renderHook(() => useAuthRedirect())

    act(() => { result.current.redirectTo2FA() })

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/otp', replace: true })
  })

  it('redirectToLogin navigates to /sign-in', () => {
    const { result } = renderHook(() => useAuthRedirect())

    act(() => { result.current.redirectToLogin() })

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-in', replace: true })
  })

  it('redirectToRegister navigates to /sign-up', () => {
    const { result } = renderHook(() => useAuthRedirect())

    act(() => { result.current.redirectToRegister() })

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/sign-up', replace: true })
  })
})
