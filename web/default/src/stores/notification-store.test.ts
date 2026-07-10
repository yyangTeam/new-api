import { useNotificationStore } from './notification-store'

beforeEach(() => {
  useNotificationStore.setState({
    lastReadNotice: '',
    readAnnouncementKeys: [],
    closedUntilDate: null,
  })
})

describe('useNotificationStore', () => {
  describe('markNoticeRead', () => {
    test('stores trimmed notice content', () => {
      useNotificationStore.getState().markNoticeRead('  Hello World  ')
      expect(useNotificationStore.getState().lastReadNotice).toBe('Hello World')
    })

    test('stores empty string for empty content', () => {
      useNotificationStore.getState().markNoticeRead('')
      expect(useNotificationStore.getState().lastReadNotice).toBe('')
    })

    test('overwrites previous notice content', () => {
      useNotificationStore.getState().markNoticeRead('First')
      useNotificationStore.getState().markNoticeRead('Second')
      expect(useNotificationStore.getState().lastReadNotice).toBe('Second')
    })
  })

  describe('markAnnouncementsRead', () => {
    test('adds new keys to read list', () => {
      useNotificationStore.getState().markAnnouncementsRead(['key1', 'key2'])
      expect(useNotificationStore.getState().readAnnouncementKeys).toEqual(['key1', 'key2'])
    })

    test('deduplicates keys', () => {
      useNotificationStore.getState().markAnnouncementsRead(['key1', 'key2'])
      useNotificationStore.getState().markAnnouncementsRead(['key2', 'key3'])
      expect(useNotificationStore.getState().readAnnouncementKeys).toEqual(['key1', 'key2', 'key3'])
    })

    test('handles empty array', () => {
      useNotificationStore.getState().markAnnouncementsRead([])
      expect(useNotificationStore.getState().readAnnouncementKeys).toEqual([])
    })
  })

  describe('setClosedUntilDate', () => {
    test('sets the closed date', () => {
      useNotificationStore.getState().setClosedUntilDate('Mon Jan 01 2024')
      expect(useNotificationStore.getState().closedUntilDate).toBe('Mon Jan 01 2024')
    })

    test('clears the closed date with null', () => {
      useNotificationStore.getState().setClosedUntilDate('Mon Jan 01 2024')
      useNotificationStore.getState().setClosedUntilDate(null)
      expect(useNotificationStore.getState().closedUntilDate).toBeNull()
    })
  })

  describe('isAnnouncementRead', () => {
    test('returns true for read announcement', () => {
      useNotificationStore.getState().markAnnouncementsRead(['key1'])
      expect(useNotificationStore.getState().isAnnouncementRead('key1')).toBe(true)
    })

    test('returns false for unread announcement', () => {
      expect(useNotificationStore.getState().isAnnouncementRead('key1')).toBe(false)
    })
  })

  describe('isNoticeClosed', () => {
    test('returns false when closedUntilDate is null', () => {
      expect(useNotificationStore.getState().isNoticeClosed()).toBe(false)
    })

    test('returns true when closedUntilDate matches today', () => {
      const today = new Date().toDateString()
      useNotificationStore.getState().setClosedUntilDate(today)
      expect(useNotificationStore.getState().isNoticeClosed()).toBe(true)
    })

    test('returns false when closedUntilDate is a different day', () => {
      useNotificationStore.getState().setClosedUntilDate('Wed Jan 01 2020')
      expect(useNotificationStore.getState().isNoticeClosed()).toBe(false)
    })
  })
})
