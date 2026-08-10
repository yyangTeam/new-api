import { describe, it, expect, vi } from 'vitest'

vi.mock('../general/system-info-section', () => ({
  SystemInfoSection: () => 'SystemInfoSection',
}))
vi.mock('../maintenance/config', () => ({
  parseHeaderNavModules: vi.fn(() => ({ home: true })),
  parseSidebarModulesAdmin: vi.fn(() => ({})),
  serializeHeaderNavModules: vi.fn(() => '{"home":true}'),
  serializeSidebarModulesAdmin: vi.fn(() => '{}'),
}))
vi.mock('../maintenance/header-navigation-section', () => ({
  HeaderNavigationSection: () => 'HeaderNavigationSection',
}))
vi.mock('../maintenance/notice-section', () => ({
  NoticeSection: () => 'NoticeSection',
}))
vi.mock('../maintenance/sidebar-modules-section', () => ({
  SidebarModulesSection: () => 'SidebarModulesSection',
}))

import {
  SITE_SECTION_IDS,
  SITE_DEFAULT_SECTION,
  getSiteSectionNavItems,
  getSiteSectionMeta,
} from './section-registry'

describe('site section-registry', () => {
  it('exports correct section IDs', () => {
    expect(SITE_SECTION_IDS).toEqual([
      'system-info',
      'notice',
      'header-navigation',
      'sidebar-modules',
    ])
  })

  it('has system-info as default section', () => {
    expect(SITE_DEFAULT_SECTION).toBe('system-info')
  })

  it('generates nav items with path-style URLs', () => {
    const t = (key: string) => key
    const items = getSiteSectionNavItems(t)
    expect(items).toHaveLength(4)
    expect(items[0]).toEqual({
      title: 'System Information',
      url: '/system-settings/site/system-info',
    })
    expect(items[1]).toEqual({
      title: 'System Notice',
      url: '/system-settings/site/notice',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getSiteSectionMeta('header-navigation')
    expect(meta.titleKey).toBe('Header navigation')
  })
})
