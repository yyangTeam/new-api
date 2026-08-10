import { describe, it, expect } from 'vitest'
import type { ReactNode } from 'react'

import { createSectionRegistry } from './section-registry'

type MockSettings = { name: string; value: number }

describe('createSectionRegistry', () => {
  const sections = [
    {
      id: 'general',
      titleKey: 'General Settings',
      build: (settings: MockSettings): ReactNode => `general-${settings.name}`,
    },
    {
      id: 'advanced',
      titleKey: 'Advanced Settings',
      build: (settings: MockSettings): ReactNode => `advanced-${settings.value}`,
    },
    {
      id: 'security',
      titleKey: 'Security Settings',
      build: (settings: MockSettings): ReactNode => `security-${settings.name}`,
    },
  ] as const

  const registry = createSectionRegistry<
    'general' | 'advanced' | 'security',
    MockSettings
  >({
    sections,
    defaultSection: 'general',
    basePath: '/settings',
  })

  describe('sectionIds', () => {
    it('returns all section IDs in order', () => {
      expect(registry.sectionIds).toEqual(['general', 'advanced', 'security'])
    })
  })

  describe('defaultSection', () => {
    it('returns the configured default section', () => {
      expect(registry.defaultSection).toBe('general')
    })
  })

  describe('getSectionNavItems', () => {
    it('generates navigation items with query-style URLs by default', () => {
      const t = (key: string) => key
      const items = registry.getSectionNavItems(t)
      expect(items).toEqual([
        { title: 'General Settings', url: '/settings?section=general' },
        { title: 'Advanced Settings', url: '/settings?section=advanced' },
        { title: 'Security Settings', url: '/settings?section=security' },
      ])
    })

    it('translates title keys', () => {
      const t = (key: string) =>
        key === 'General Settings' ? 'Translated General' : key
      const items = registry.getSectionNavItems(t)
      expect(items[0].title).toBe('Translated General')
    })
  })

  describe('getSectionNavItems with path-style URLs', () => {
    it('generates path-style URLs when urlStyle is path', () => {
      const pathRegistry = createSectionRegistry<
        'general' | 'advanced',
        MockSettings
      >({
        sections: [sections[0], sections[1]],
        defaultSection: 'general',
        basePath: '/admin/settings',
        urlStyle: 'path',
      })

      const t = (key: string) => key
      const items = pathRegistry.getSectionNavItems(t)
      expect(items).toEqual([
        { title: 'General Settings', url: '/admin/settings/general' },
        { title: 'Advanced Settings', url: '/admin/settings/advanced' },
      ])
    })
  })

  describe('getSectionContent', () => {
    it('returns content for a valid section ID', () => {
      const content = registry.getSectionContent('general', {
        name: 'hello',
        value: 42,
      })
      expect(content).toBe('general-hello')
    })

    it('returns content for advanced section', () => {
      const content = registry.getSectionContent('advanced', {
        name: 'test',
        value: 99,
      })
      expect(content).toBe('advanced-99')
    })
  })

  describe('getSectionMeta', () => {
    it('returns section definition for a valid section ID', () => {
      const meta = registry.getSectionMeta('security')
      expect(meta.id).toBe('security')
      expect(meta.titleKey).toBe('Security Settings')
    })

    it('returns first section when ID is not found', () => {
      const meta = registry.getSectionMeta('nonexistent' as 'general')
      expect(meta.id).toBe('general')
    })
  })

  describe('with extra args', () => {
    it('passes extra args to build function', () => {
      type ExtraArgs = [string, number]
      const sectionsWithExtra = [
        {
          id: 'test',
          titleKey: 'Test',
          build: (settings: MockSettings, prefix: string, count: number) =>
            `${prefix}-${settings.name}-${count}`,
        },
      ] as const

      const reg = createSectionRegistry<'test', MockSettings, ExtraArgs>({
        sections: sectionsWithExtra,
        defaultSection: 'test',
        basePath: '/test',
      })

      const content = reg.getSectionContent(
        'test',
        { name: 'foo', value: 1 },
        'pre',
        5
      )
      expect(content).toBe('pre-foo-5')
    })
  })
})
