import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/system-settings/content/announcements-section', () => ({
  AnnouncementsSection: () => 'AnnouncementsSection',
}))
vi.mock('@/features/system-settings/content/api-info-section', () => ({
  ApiInfoSection: () => 'ApiInfoSection',
}))
vi.mock('@/features/system-settings/content/chat-settings-section', () => ({
  ChatSettingsSection: () => 'ChatSettingsSection',
}))
vi.mock('@/features/system-settings/content/dashboard-section', () => ({
  DashboardSection: () => 'DashboardSection',
}))
vi.mock('@/features/system-settings/content/drawing-settings-section', () => ({
  DrawingSettingsSection: () => 'DrawingSettingsSection',
}))
vi.mock('@/features/system-settings/content/image-gen-section', () => ({
  ImageGenSection: () => 'ImageGenSection',
}))
vi.mock('@/features/system-settings/content/faq-section', () => ({
  FAQSection: () => 'FAQSection',
}))
vi.mock('@/features/system-settings/content/uptime-kuma-section', () => ({
  UptimeKumaSection: () => 'UptimeKumaSection',
}))

import {
  CONTENT_SECTION_IDS,
  CONTENT_DEFAULT_SECTION,
  getContentSectionNavItems,
  getContentSectionMeta,
} from '@/features/system-settings/content/section-registry'

describe('content section-registry', () => {
  it('exports correct section IDs', () => {
    expect(CONTENT_SECTION_IDS).toEqual([
      'dashboard',
      'announcements',
      'api-info',
      'faq',
      'uptime-kuma',
      'chat',
      'drawing',
      'image-gen',
    ])
  })

  it('has dashboard as default section', () => {
    expect(CONTENT_DEFAULT_SECTION).toBe('dashboard')
  })

  it('generates nav items with path-style URLs', () => {
    const t = (key: string) => key
    const items = getContentSectionNavItems(t)
    expect(items).toHaveLength(8)
    expect(items[0]).toEqual({
      title: 'Data Dashboard',
      url: '/system-settings/content/dashboard',
    })
    expect(items[5]).toEqual({
      title: 'Chat Presets',
      url: '/system-settings/content/chat',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getContentSectionMeta('faq')
    expect(meta.titleKey).toBe('FAQ')
  })
})
