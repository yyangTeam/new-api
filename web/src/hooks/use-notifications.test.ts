import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getNotice: vi.fn(),
}))

vi.mock('@/stores/notification-store', () => ({
  useNotificationStore: vi.fn(),
}))

import { useQuery } from '@tanstack/react-query'
import { useStatus } from '@/hooks/use-status'
import { useNotificationStore } from '@/stores/notification-store'
import { useNotifications } from './use-notifications'

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>
const mockUseStatus = useStatus as ReturnType<typeof vi.fn>
const mockUseNotificationStore = useNotificationStore as ReturnType<typeof vi.fn>

describe('useNotifications', () => {
  const mockMarkNoticeRead = vi.fn()
  const mockMarkAnnouncementsRead = vi.fn()
  const mockIsAnnouncementRead = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseQuery.mockReturnValue({
      data: { success: true, data: 'Hello notice' },
      isLoading: false,
      refetch: vi.fn(),
    })
    mockUseStatus.mockReturnValue({
      status: {
        announcements_enabled: true,
        announcements: [
          { id: 1, content: 'Ann 1', type: 'info' },
          { id: 2, content: 'Ann 2', type: 'info' },
        ],
      },
      loading: false,
    })
    mockUseNotificationStore.mockReturnValue({
      lastReadNotice: '',
      markNoticeRead: mockMarkNoticeRead,
      markAnnouncementsRead: mockMarkAnnouncementsRead,
      isAnnouncementRead: mockIsAnnouncementRead,
    })
    mockIsAnnouncementRead.mockReturnValue(false)
  })

  it('returns notice content from successful response', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.notice).toBe('Hello notice')
  })

  it('returns empty string when notice response is not successful', () => {
    mockUseQuery.mockReturnValue({
      data: { success: false, data: 'Some notice' },
      isLoading: false,
      refetch: vi.fn(),
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.notice).toBe('')
  })

  it('returns empty string when notice data is empty', () => {
    mockUseQuery.mockReturnValue({
      data: { success: true, data: '   ' },
      isLoading: false,
      refetch: vi.fn(),
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.notice).toBe('')
  })

  it('returns announcements from status', () => {
    const { result } = renderHook(() => useNotifications())
    expect(result.current.announcements).toHaveLength(2)
  })

  it('returns empty announcements when announcements_enabled is false', () => {
    mockUseStatus.mockReturnValue({
      status: { announcements_enabled: false, announcements: [{ id: 1 }] },
      loading: false,
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.announcements).toHaveLength(0)
  })

  it('calculates unread notice count', () => {
    mockUseNotificationStore.mockReturnValue({
      lastReadNotice: '',
      markNoticeRead: mockMarkNoticeRead,
      markAnnouncementsRead: mockMarkAnnouncementsRead,
      isAnnouncementRead: mockIsAnnouncementRead,
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.unreadNoticeCount).toBe(1)
  })

  it('notice is read when lastReadNotice matches', () => {
    mockUseNotificationStore.mockReturnValue({
      lastReadNotice: 'Hello notice',
      markNoticeRead: mockMarkNoticeRead,
      markAnnouncementsRead: mockMarkAnnouncementsRead,
      isAnnouncementRead: mockIsAnnouncementRead,
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.unreadNoticeCount).toBe(0)
  })

  it('calculates unread announcements count', () => {
    mockIsAnnouncementRead.mockReturnValue(false)
    const { result } = renderHook(() => useNotifications())
    expect(result.current.unreadAnnouncementsCount).toBe(2)
  })

  it('calculates total unread count', () => {
    mockIsAnnouncementRead.mockReturnValue(false)
    const { result } = renderHook(() => useNotifications())
    expect(result.current.unreadCount).toBe(3) // 1 notice + 2 announcements
  })

  it('returns loading state', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn(),
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.loading).toBe(true)
  })

  it('returns loading when status is loading', () => {
    mockUseStatus.mockReturnValue({ status: null, loading: true })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.loading).toBe(true)
  })

  it('handleOpenPopover marks notice as read and opens popover', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.openPopover()
    })

    expect(result.current.popoverOpen).toBe(true)
    expect(mockMarkNoticeRead).toHaveBeenCalledWith('Hello notice')
  })

  it('handleOpenPopover with announcements tab marks announcements read', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.openPopover('announcements')
    })

    expect(result.current.popoverOpen).toBe(true)
    expect(result.current.activeTab).toBe('announcements')
    expect(mockMarkAnnouncementsRead).toHaveBeenCalled()
  })

  it('setPopoverOpen(false) closes popover', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.openPopover()
    })
    expect(result.current.popoverOpen).toBe(true)

    act(() => {
      result.current.setPopoverOpen(false)
    })
    expect(result.current.popoverOpen).toBe(false)
  })

  it('setPopoverOpen(true) marks notice as read', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.setPopoverOpen(true)
    })

    expect(result.current.popoverOpen).toBe(true)
    expect(mockMarkNoticeRead).toHaveBeenCalledWith('Hello notice')
  })

  it('setActiveTab to announcements marks announcements read', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.setActiveTab('announcements')
    })

    expect(result.current.activeTab).toBe('announcements')
    expect(mockMarkAnnouncementsRead).toHaveBeenCalled()
  })

  it('setActiveTab to notice does not mark announcements read', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.setActiveTab('notice')
    })

    expect(result.current.activeTab).toBe('notice')
    expect(mockMarkAnnouncementsRead).not.toHaveBeenCalled()
  })

  it('closePopover sets popoverOpen to false', () => {
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.openPopover()
    })
    act(() => {
      result.current.closePopover()
    })
    expect(result.current.popoverOpen).toBe(false)
  })

  it('does not mark announcements read when there are none', () => {
    mockUseStatus.mockReturnValue({
      status: { announcements_enabled: true, announcements: [] },
      loading: false,
    })
    const { result } = renderHook(() => useNotifications())

    act(() => {
      result.current.openPopover('announcements')
    })

    expect(mockMarkAnnouncementsRead).not.toHaveBeenCalled()
  })

  it('limits announcements to 20 items', () => {
    const manyAnnouncements = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      content: `Ann ${i}`,
    }))
    mockUseStatus.mockReturnValue({
      status: { announcements_enabled: true, announcements: manyAnnouncements },
      loading: false,
    })
    const { result } = renderHook(() => useNotifications())
    expect(result.current.announcements).toHaveLength(20)
  })
})
