import { renderHook } from '@testing-library/react'

import type { NavGroup, NavItem } from '@/components/layout/types'

import { useSidebarConfig, useIsSidebarModuleVisible } from './use-sidebar-config'

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(() => ({ status: null })),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(() => ({ auth: null })),
}))

const { useStatus } = await import('@/hooks/use-status')
const { useAuthStore } = await import('@/stores/auth-store')

const mockedUseStatus = vi.mocked(useStatus)
const mockedUseAuthStore = vi.mocked(useAuthStore)

function makeNavGroups(items: NavItem[]): NavGroup[] {
  return [{ title: 'Test', items }]
}

beforeEach(() => {
  mockedUseStatus.mockReturnValue({ status: null } as ReturnType<typeof useStatus>)
  mockedUseAuthStore.mockReturnValue({ auth: null } as ReturnType<typeof useAuthStore>)
})

describe('useSidebarConfig', () => {
  test('returns all items when no admin config is set', () => {
    const navGroups = makeNavGroups([
      { title: 'Playground', url: '/playground' },
      { title: 'Keys', url: '/keys' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    expect(result.current.length).toBe(1)
    expect(result.current[0].items.length).toBe(2)
  })

  test('filters items disabled by admin config', () => {
    mockedUseStatus.mockReturnValue({
      status: {
        SidebarModulesAdmin: JSON.stringify({
          chat: { enabled: true, playground: false, chat: true, image_gen: true },
          console: { enabled: true, detail: true, token: true, log: true, midjourney: true, task: true },
          personal: { enabled: true, topup: true, personal: true },
          admin: { enabled: true, channel: true, models: true, redemption: true, user: true, setting: true, subscription: true },
        }),
      },
    } as ReturnType<typeof useStatus>)

    const navGroups = makeNavGroups([
      { title: 'Playground', url: '/playground' },
      { title: 'Keys', url: '/keys' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    const urls = result.current[0].items
      .filter((item): item is Extract<NavItem, { url: string }> => 'url' in item)
      .map((item) => item.url)
    expect(urls).not.toContain('/playground')
    expect(urls).toContain('/keys')
  })

  test('hides entire section when section is disabled', () => {
    mockedUseStatus.mockReturnValue({
      status: {
        SidebarModulesAdmin: JSON.stringify({
          chat: { enabled: false, playground: true, chat: true, image_gen: true },
        }),
      },
    } as ReturnType<typeof useStatus>)

    const navGroups = makeNavGroups([
      { title: 'Playground', url: '/playground' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    expect(result.current.length).toBe(0)
  })

  test('removes empty groups after filtering', () => {
    mockedUseStatus.mockReturnValue({
      status: {
        SidebarModulesAdmin: JSON.stringify({
          chat: { enabled: true, playground: false, chat: false, image_gen: false },
        }),
      },
    } as ReturnType<typeof useStatus>)

    const navGroups = makeNavGroups([
      { title: 'Playground', url: '/playground' },
      { title: 'Image Gen', url: '/image-gen' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    expect(result.current.length).toBe(0)
  })

  test('applies user config as narrowing layer', () => {
    mockedUseStatus.mockReturnValue({
      status: { SidebarModulesAdmin: '' },
    } as ReturnType<typeof useStatus>)

    mockedUseAuthStore.mockReturnValue({
      auth: {
        user: {
          sidebar_modules: JSON.stringify({
            console: { enabled: true, token: false },
          }),
        },
      },
    } as ReturnType<typeof useAuthStore>)

    const navGroups = makeNavGroups([
      { title: 'Keys', url: '/keys' },
      { title: 'Dashboard', url: '/dashboard' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    const urls = result.current[0].items
      .filter((item): item is Extract<NavItem, { url: string }> => 'url' in item)
      .map((item) => item.url)
    expect(urls).not.toContain('/keys')
    expect(urls).toContain('/dashboard')
  })

  test('skips user config when sidebar_settings permission is false', () => {
    mockedUseStatus.mockReturnValue({
      status: { SidebarModulesAdmin: '' },
    } as ReturnType<typeof useStatus>)

    mockedUseAuthStore.mockReturnValue({
      auth: {
        user: {
          permissions: { sidebar_settings: false },
          sidebar_modules: JSON.stringify({
            console: { enabled: true, token: false },
          }),
        },
      },
    } as ReturnType<typeof useAuthStore>)

    const navGroups = makeNavGroups([
      { title: 'Keys', url: '/keys' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    expect(result.current[0].items.length).toBe(1)
  })

  test('items without URL mapping are always visible', () => {
    const navGroups = makeNavGroups([
      { title: 'Custom', url: '/custom-route' },
    ])
    const { result } = renderHook(() => useSidebarConfig(navGroups))
    expect(result.current[0].items.length).toBe(1)
  })
})

describe('useIsSidebarModuleVisible', () => {
  test('returns true for unmapped routes', () => {
    const { result } = renderHook(() => useIsSidebarModuleVisible('/some-unknown-route'))
    expect(result.current).toBe(true)
  })

  test('returns true when no admin config is set', () => {
    const { result } = renderHook(() => useIsSidebarModuleVisible('/playground'))
    expect(result.current).toBe(true)
  })

  test('returns false when admin disables the module', () => {
    mockedUseStatus.mockReturnValue({
      status: {
        SidebarModulesAdmin: JSON.stringify({
          personal: { enabled: true, topup: false, personal: true },
        }),
      },
    } as ReturnType<typeof useStatus>)

    const { result } = renderHook(() => useIsSidebarModuleVisible('/wallet'))
    expect(result.current).toBe(false)
  })

  test('returns true when admin enables the module', () => {
    mockedUseStatus.mockReturnValue({
      status: {
        SidebarModulesAdmin: JSON.stringify({
          personal: { enabled: true, topup: true, personal: true },
        }),
      },
    } as ReturnType<typeof useStatus>)

    const { result } = renderHook(() => useIsSidebarModuleVisible('/wallet'))
    expect(result.current).toBe(true)
  })
})
