import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(),
}))

import { useStatus } from '@/hooks/use-status'
import { useSidebarData } from '@/hooks/use-sidebar-data'

const mockUseStatus = useStatus as ReturnType<typeof vi.fn>

describe('useSidebarData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseStatus.mockReturnValue({ status: null })
  })

  it('returns navGroups with correct group ids', () => {
    const { result } = renderHook(() => useSidebarData())
    const groupIds = result.current.navGroups.map((g) => g.id)
    expect(groupIds).toEqual(['chat', 'general', 'personal', 'admin'])
  })

  it('chat group contains Playground and Chat items', () => {
    const { result } = renderHook(() => useSidebarData())
    const chatGroup = result.current.navGroups.find((g) => g.id === 'chat')!
    const urls = chatGroup.items
      .filter((item) => 'url' in item)
      .map((item) => (item as { url: string }).url)
    expect(urls).toContain('/playground')
  })

  it('admin group has system settings and system info items', () => {
    const { result } = renderHook(() => useSidebarData())
    const adminGroup = result.current.navGroups.find((g) => g.id === 'admin')!
    const urls = adminGroup.items
      .filter((item) => 'url' in item)
      .map((item) => (item as { url: string }).url)
    expect(urls).toContain('/system-settings/site')
    expect(urls).toContain('/system-info')
  })

  it('System Info item has requiredRole set to SUPER_ADMIN', () => {
    const { result } = renderHook(() => useSidebarData())
    const adminGroup = result.current.navGroups.find((g) => g.id === 'admin')!
    const systemInfoItem = adminGroup.items.find(
      (item) => 'url' in item && (item as { url: string }).url === '/system-info'
    )
    expect(systemInfoItem).toHaveProperty('requiredRole', 100)
  })
})
