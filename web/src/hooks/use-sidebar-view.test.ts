import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: vi.fn(),
}))

vi.mock('@/components/layout/lib/sidebar-view-registry', () => ({
  resolveSidebarView: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('./use-sidebar-config', () => ({
  useSidebarConfig: vi.fn((groups: unknown[]) => groups),
}))

vi.mock('./use-sidebar-data', () => ({
  useSidebarData: vi.fn(),
}))

import { useLocation } from '@tanstack/react-router'
import { resolveSidebarView } from '@/components/layout/lib/sidebar-view-registry'
import { useAuthStore } from '@/stores/auth-store'
import { useSidebarData } from './use-sidebar-data'
import { useSidebarView } from './use-sidebar-view'

const mockUseLocation = useLocation as ReturnType<typeof vi.fn>
const mockResolveSidebarView = resolveSidebarView as ReturnType<typeof vi.fn>
const mockUseAuthStore = useAuthStore as unknown as ReturnType<typeof vi.fn>
const mockUseSidebarData = useSidebarData as ReturnType<typeof vi.fn>

describe('useSidebarView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLocation.mockImplementation((opts: { select: (l: { pathname: string }) => string }) =>
      opts.select({ pathname: '/dashboard' })
    )
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 100 } } })
    )
    mockUseSidebarData.mockReturnValue({
      navGroups: [
        { id: 'general', items: [{ title: 'Dashboard', url: '/dashboard' }] },
        { id: 'admin', items: [{ title: 'Settings', url: '/settings' }] },
      ],
    })
    mockResolveSidebarView.mockReturnValue(null)
  })

  it('returns root view when no sidebar view matches', () => {
    const { result } = renderHook(() => useSidebarView())
    expect(result.current.key).toBe('__root')
    expect(result.current.view).toBeNull()
  })

  it('includes admin group for admin users', () => {
    const { result } = renderHook(() => useSidebarView())
    const adminGroup = result.current.navGroups.find((g) => g.id === 'admin')
    expect(adminGroup).toBeDefined()
  })

  it('excludes admin group for non-admin users', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 1 } } })
    )
    const { result } = renderHook(() => useSidebarView())
    const adminGroup = result.current.navGroups.find((g) => g.id === 'admin')
    expect(adminGroup).toBeUndefined()
  })

  it('excludes admin group for guest (no user)', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: null } })
    )
    const { result } = renderHook(() => useSidebarView())
    const adminGroup = result.current.navGroups.find((g) => g.id === 'admin')
    expect(adminGroup).toBeUndefined()
  })

  it('filters items by requiredRole', () => {
    mockUseAuthStore.mockImplementation((selector: (s: unknown) => unknown) =>
      selector({ auth: { user: { role: 10 } } })
    )
    mockUseSidebarData.mockReturnValue({
      navGroups: [
        {
          id: 'admin',
          items: [
            { title: 'Settings', url: '/settings' },
            { title: 'System Info', url: '/system-info', requiredRole: 100 },
          ],
        },
      ],
    })
    const { result } = renderHook(() => useSidebarView())
    const adminGroup = result.current.navGroups.find((g) => g.id === 'admin')!
    expect(adminGroup.items).toHaveLength(1)
    expect(adminGroup.items[0].title).toBe('Settings')
  })

  it('returns nested view when resolveSidebarView matches', () => {
    const mockView = {
      id: 'settings-view',
      getNavGroups: (t: (s: string) => string) => [
        { id: 'settings', title: t('Settings'), items: [] },
      ],
    }
    mockResolveSidebarView.mockReturnValue(mockView)

    const { result } = renderHook(() => useSidebarView())
    expect(result.current.key).toBe('settings-view')
    expect(result.current.view).toBe(mockView)
    expect(result.current.navGroups[0].id).toBe('settings')
  })
})
