import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth-store'
import { useIsAdmin } from '@/hooks/use-admin'

const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>

describe('useIsAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when user role is ADMIN (10)', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 10 } } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(true)
  })

  it('returns true when user role is SUPER_ADMIN (100)', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 100 } } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(true)
  })

  it('returns false when user role is USER (1)', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 1 } } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(false)
  })

  it('returns false when user role is GUEST (0)', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 0 } } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(false)
  })

  it('returns false when user is null', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: null } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(false)
  })

  it('returns false when user is undefined', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: undefined } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(false)
  })

  it('returns false when user has no role property', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: {} } })
    )
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current).toBe(false)
  })
})
