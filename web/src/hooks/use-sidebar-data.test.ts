import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(),
}))

import { useStatus } from '@/hooks/use-status'
import { useSidebarData } from './use-sidebar-data'

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

  it('does not include image generation when imageGenUrl is not set', () => {
    const { result } = renderHook(() => useSidebarData())
    const chatGroup = result.current.navGroups.find((g) => g.id === 'chat')!
    const imageGenItem = chatGroup.items.find(
      (item) => 'url' in item && item.url === '/image-gen'
    )
    expect(imageGenItem).toBeUndefined()
  })

  it('includes image generation with embed mode when url is set', () => {
    mockUseStatus.mockReturnValue({
      status: {
        image_generation_url: 'https://example.com/gen',
        image_generation_open_mode: 'embed',
      },
    })
    const { result } = renderHook(() => useSidebarData())
    const chatGroup = result.current.navGroups.find((g) => g.id === 'chat')!
    const imageGenItem = chatGroup.items.find(
      (item) => 'url' in item && item.url === '/image-gen'
    )
    expect(imageGenItem).toBeDefined()
    expect(imageGenItem).not.toHaveProperty('externalUrl')
  })

  it('includes image generation with new_tab mode and externalUrl', () => {
    mockUseStatus.mockReturnValue({
      status: {
        image_generation_url: 'https://example.com/gen',
        image_generation_open_mode: 'new_tab',
      },
    })
    const { result } = renderHook(() => useSidebarData())
    const chatGroup = result.current.navGroups.find((g) => g.id === 'chat')!
    const imageGenItem = chatGroup.items.find(
      (item) => 'url' in item && item.url === '/image-gen'
    )
    expect(imageGenItem).toBeDefined()
    expect(imageGenItem).toHaveProperty(
      'externalUrl',
      'https://example.com/gen'
    )
  })

  it('defaults image_generation_open_mode to embed', () => {
    mockUseStatus.mockReturnValue({
      status: { image_generation_url: 'https://example.com/gen' },
    })
    const { result } = renderHook(() => useSidebarData())
    const chatGroup = result.current.navGroups.find((g) => g.id === 'chat')!
    const imageGenItem = chatGroup.items.find(
      (item) => 'url' in item && item.url === '/image-gen'
    )
    expect(imageGenItem).not.toHaveProperty('externalUrl')
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
