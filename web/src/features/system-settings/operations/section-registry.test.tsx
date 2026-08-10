import { describe, it, expect, vi } from 'vitest'

vi.mock('../general/system-behavior-section', () => ({
  SystemBehaviorSection: () => 'SystemBehaviorSection',
}))
vi.mock('../integrations/email-settings-section', () => ({
  EmailSettingsSection: () => 'EmailSettingsSection',
}))
vi.mock('../integrations/monitoring-settings-section', () => ({
  MonitoringSettingsSection: () => 'MonitoringSettingsSection',
}))
vi.mock('../integrations/worker-settings-section', () => ({
  WorkerSettingsSection: () => 'WorkerSettingsSection',
}))
vi.mock('../maintenance/log-settings-section', () => ({
  LogSettingsSection: () => 'LogSettingsSection',
}))
vi.mock('../maintenance/performance-section', () => ({
  PerformanceSection: () => 'PerformanceSection',
}))
vi.mock('../maintenance/update-checker-section', () => ({
  UpdateCheckerSection: () => 'UpdateCheckerSection',
}))

import {
  OPERATIONS_SECTION_IDS,
  OPERATIONS_DEFAULT_SECTION,
  getOperationsSectionNavItems,
  getOperationsSectionMeta,
} from './section-registry'

describe('operations section-registry', () => {
  it('exports correct section IDs', () => {
    expect(OPERATIONS_SECTION_IDS).toEqual([
      'behavior',
      'alerts',
      'email',
      'worker',
      'logs',
      'performance',
      'update-checker',
    ])
  })

  it('has behavior as default section', () => {
    expect(OPERATIONS_DEFAULT_SECTION).toBe('behavior')
  })

  it('generates nav items with path-style URLs', () => {
    const t = (key: string) => key
    const items = getOperationsSectionNavItems(t)
    expect(items).toHaveLength(7)
    expect(items[0]).toEqual({
      title: 'System Behavior',
      url: '/system-settings/operations/behavior',
    })
    expect(items[2]).toEqual({
      title: 'SMTP Email',
      url: '/system-settings/operations/email',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getOperationsSectionMeta('performance')
    expect(meta.titleKey).toBe('Performance')
  })
})
