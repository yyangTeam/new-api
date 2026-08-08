import { normalizeHref, checkIsActive } from './url-utils'
import type { NavLink, NavCollapsible } from '../types'

describe('normalizeHref', () => {
  test('removes query parameters', () => {
    expect(normalizeHref('/dashboard?tab=1')).toBe('/dashboard')
  })

  test('removes trailing slashes', () => {
    expect(normalizeHref('/dashboard/')).toBe('/dashboard')
  })

  test('removes multiple trailing slashes', () => {
    expect(normalizeHref('/dashboard///')).toBe('/dashboard')
  })

  test('does not strip the root slash', () => {
    expect(normalizeHref('/')).toBe('/')
  })

  test('handles path without query or trailing slash', () => {
    expect(normalizeHref('/settings/general')).toBe('/settings/general')
  })

  test('removes query and trailing slash together', () => {
    expect(normalizeHref('/path/?key=val')).toBe('/path')
  })
})

describe('checkIsActive', () => {
  describe('with NavLink items', () => {
    test('matches exact URL', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard' }
      expect(checkIsActive('/dashboard', item)).toBe(true)
    })

    test('does not match different URL', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard' }
      expect(checkIsActive('/settings', item)).toBe(false)
    })

    test('matches when href has query but item url does not', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard' }
      expect(checkIsActive('/dashboard?tab=1', item)).toBe(true)
    })

    test('does not match when item url has query and href differs', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard?tab=1' }
      expect(checkIsActive('/dashboard?tab=2', item)).toBe(false)
    })

    test('matches when item url has query and href matches exactly', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard?tab=1' }
      expect(checkIsActive('/dashboard?tab=1', item)).toBe(true)
    })
  })

  describe('with activeUrls', () => {
    test('matches when href is in activeUrls', () => {
      const item: NavLink = {
        title: 'Dashboard',
        url: '/dashboard',
        activeUrls: ['/alt-dashboard'],
      }
      expect(checkIsActive('/alt-dashboard', item)).toBe(true)
    })

    test('matches activeUrls after stripping query from href', () => {
      const item: NavLink = {
        title: 'Dashboard',
        url: '/dashboard',
        activeUrls: ['/alt-dashboard'],
      }
      expect(checkIsActive('/alt-dashboard?q=1', item)).toBe(true)
    })

    test('does not match activeUrls when base paths differ', () => {
      const item: NavLink = {
        title: 'Dashboard',
        url: '/dashboard',
        activeUrls: ['/alt-dashboard'],
      }
      expect(checkIsActive('/other?q=1', item)).toBe(false)
    })
  })

  describe('with NavCollapsible items', () => {
    test('matches when any sub-item URL matches href', () => {
      const item: NavCollapsible = {
        title: 'Settings',
        items: [
          { title: 'General', url: '/settings/general' },
          { title: 'Security', url: '/settings/security' },
        ],
      }
      expect(checkIsActive('/settings/security', item)).toBe(true)
    })

    test('does not match when no sub-item URL matches', () => {
      const item: NavCollapsible = {
        title: 'Settings',
        items: [
          { title: 'General', url: '/settings/general' },
        ],
      }
      expect(checkIsActive('/settings/other', item)).toBe(false)
    })

    test('matches sub-item when href has query but sub-item url does not', () => {
      const item: NavCollapsible = {
        title: 'Settings',
        items: [
          { title: 'General', url: '/settings/general' },
        ],
      }
      expect(checkIsActive('/settings/general?tab=1', item)).toBe(true)
    })

    test('does not match sub-item when both have queries and they differ', () => {
      const item: NavCollapsible = {
        title: 'Settings',
        items: [
          { title: 'General', url: '/settings/general?tab=1' },
        ],
      }
      expect(checkIsActive('/settings/general?tab=2', item)).toBe(false)
    })
  })

  describe('mainNav mode', () => {
    test('matches when first-level path segments are the same', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard/overview' }
      expect(checkIsActive('/dashboard/stats', item, true)).toBe(true)
    })

    test('does not match when first-level path segments differ', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard/overview' }
      expect(checkIsActive('/settings/general', item, true)).toBe(false)
    })

    test('does not activate mainNav when href has no path segment after root', () => {
      const item: NavLink = { title: 'Dashboard', url: '/dashboard' }
      expect(checkIsActive('/', item, true)).toBe(false)
    })
  })

  describe('item with no url', () => {
    test('returns false when item has no url and no matching activeUrls', () => {
      const item = { title: 'No Link' } as NavLink
      expect(checkIsActive('/anything', item)).toBe(false)
    })
  })
})
