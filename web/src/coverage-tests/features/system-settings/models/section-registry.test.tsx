import { describe, it, expect, vi } from 'vitest'
import type { TFunction } from 'i18next'

vi.mock('@/features/system-settings/integrations/ionet-deployment-settings-section', () => ({
  IoNetDeploymentSettingsSection: () => 'IoNetDeploymentSettingsSection',
}))
vi.mock('@/features/system-settings/models/claude-settings-card', () => ({
  ClaudeSettingsCard: () => 'ClaudeSettingsCard',
}))
vi.mock('@/features/system-settings/models/gemini-settings-card', () => ({
  GeminiSettingsCard: () => 'GeminiSettingsCard',
}))
vi.mock('@/features/system-settings/models/global-settings-card', () => ({
  GlobalSettingsCard: () => 'GlobalSettingsCard',
}))
vi.mock('@/features/system-settings/models/grok-settings-card', () => ({
  GrokSettingsCard: () => 'GrokSettingsCard',
}))

import {
  MODELS_SECTION_IDS,
  MODELS_DEFAULT_SECTION,
  getModelsSectionNavItems,
  getModelsSectionMeta,
} from '@/features/system-settings/models/section-registry'

// After the upstream request-policies refactor, routing-reliability and
// channel-affinity moved out of the models registry into request-policies.
// The models registry now exposes 5 sections.
describe('models section-registry', () => {
  it('exports correct section IDs', () => {
    expect(MODELS_SECTION_IDS).toEqual([
      'global',
      'gemini',
      'claude',
      'grok',
      'model-deployment',
    ])
  })

  it('has global as default section', () => {
    expect(MODELS_DEFAULT_SECTION).toBe('global')
  })

  it('generates nav items with path-style URLs', () => {
    const t = ((key: string) => key) as unknown as TFunction
    const items = getModelsSectionNavItems(t)
    expect(items).toHaveLength(5)
    expect(items[0]).toEqual({
      title: 'Global Model Configuration',
      url: '/system-settings/models/global',
    })
    expect(items[1]).toEqual({
      title: 'Gemini',
      url: '/system-settings/models/gemini',
    })
  })

  it('gets section meta by ID', () => {
    const meta = getModelsSectionMeta('claude')
    expect(meta.titleKey).toBe('Claude')
  })
})
