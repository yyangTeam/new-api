import { describe, it, expect, vi } from 'vitest'

import {
  isUsageLogsSectionId,
  USAGE_LOGS_SECTION_IDS,
  USAGE_LOGS_DEFAULT_SECTION,
  getUsageLogsSectionNavItems,
} from '@/features/usage-logs/section-registry'

vi.mock('@/features/system-settings/utils/section-registry', () => ({
  createSectionRegistry: vi.fn(({ sections, defaultSection }) => ({
    sectionIds: sections.map((s: { id: string }) => s.id),
    defaultSection,
    getSectionNavItems: vi.fn(() =>
      sections.map((s: { id: string; titleKey: string }) => ({
        id: s.id,
        title: s.titleKey,
      }))
    ),
  })),
}))

describe('usage-logs/section-registry', () => {
  describe('USAGE_LOGS_SECTION_IDS', () => {
    it('contains common, drawing, and task', () => {
      expect(USAGE_LOGS_SECTION_IDS).toEqual(['common', 'drawing', 'task'])
    })
  })

  describe('USAGE_LOGS_DEFAULT_SECTION', () => {
    it('defaults to common', () => {
      expect(USAGE_LOGS_DEFAULT_SECTION).toBe('common')
    })
  })

  describe('isUsageLogsSectionId', () => {
    it('returns true for valid section IDs', () => {
      expect(isUsageLogsSectionId('common')).toBe(true)
      expect(isUsageLogsSectionId('drawing')).toBe(true)
      expect(isUsageLogsSectionId('task')).toBe(true)
    })

    it('returns false for invalid section IDs', () => {
      expect(isUsageLogsSectionId('invalid')).toBe(false)
      expect(isUsageLogsSectionId('')).toBe(false)
      expect(isUsageLogsSectionId('Common')).toBe(false)
    })
  })

  describe('getUsageLogsSectionNavItems', () => {
    it('returns nav items for all sections', () => {
      const items = getUsageLogsSectionNavItems()
      expect(items).toHaveLength(3)
      expect(items[0]).toEqual({ id: 'common', title: 'Common Logs' })
      expect(items[1]).toEqual({ id: 'drawing', title: 'Drawing Logs' })
      expect(items[2]).toEqual({ id: 'task', title: 'Task Logs' })
    })
  })
})
