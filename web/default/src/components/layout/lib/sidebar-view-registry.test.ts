import { resolveSidebarView, getNavGroupsForPath } from './sidebar-view-registry'

const t = ((key: string) => key) as any

describe('resolveSidebarView', () => {
  test('returns a view for /system-settings', () => {
    const view = resolveSidebarView('/system-settings')
    expect(view).not.toBeNull()
    expect(view!.id).toBe('system-settings')
  })

  test('returns a view for /system-settings/general', () => {
    const view = resolveSidebarView('/system-settings/general')
    expect(view).not.toBeNull()
    expect(view!.id).toBe('system-settings')
  })

  test('returns null for unregistered paths', () => {
    expect(resolveSidebarView('/dashboard')).toBeNull()
  })

  test('returns null for root path', () => {
    expect(resolveSidebarView('/')).toBeNull()
  })

  test('returns null for paths that partially match but are not system-settings', () => {
    expect(resolveSidebarView('/system-settingsX')).toBeNull()
  })

  test('view has parent with to and label', () => {
    const view = resolveSidebarView('/system-settings')
    expect(view!.parent.to).toBeDefined()
    expect(view!.parent.label).toBeDefined()
  })
})

describe('getNavGroupsForPath', () => {
  test('returns nav groups for system-settings path', () => {
    const groups = getNavGroupsForPath('/system-settings', t)
    expect(groups).not.toBeNull()
    expect(Array.isArray(groups)).toBe(true)
    expect(groups!.length).toBeGreaterThan(0)
  })

  test('returns null for non-matching path', () => {
    expect(getNavGroupsForPath('/dashboard', t)).toBeNull()
  })

  test('nav groups contain items', () => {
    const groups = getNavGroupsForPath('/system-settings/general', t)
    expect(groups).not.toBeNull()
    groups!.forEach((group) => {
      expect(group.items).toBeDefined()
      expect(group.items.length).toBeGreaterThan(0)
    })
  })
})
