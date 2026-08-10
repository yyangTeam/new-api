import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('../components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    ;(globalThis as any).__lastModelsPageProps = props
    return null
  },
}))
vi.mock('./section-registry.tsx', () => ({
  MODELS_DEFAULT_SECTION: 'global',
  getModelsSectionContent: vi.fn(),
  getModelsSectionMeta: vi.fn(),
}))

import { ModelSettings } from './index'

describe('ModelSettings page component', () => {
  it('renders SettingsPage with correct route path', () => {
    render(React.createElement(ModelSettings))
    const props = (globalThis as any).__lastModelsPageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/models/$section'
    )
    expect(props.defaultSection).toBe('global')
  })

  it('provides default model settings', () => {
    render(React.createElement(ModelSettings))
    const props = (globalThis as any).__lastModelsPageProps
    const defaults = props.defaultSettings
    expect(defaults['global.pass_through_request_enabled']).toBe(false)
    expect(defaults['gemini.thinking_adapter_enabled']).toBe(false)
    expect(defaults['claude.thinking_adapter_enabled']).toBe(true)
    expect(defaults['claude.thinking_adapter_budget_tokens_percentage']).toBe(0.8)
    expect(defaults['grok.violation_deduction_enabled']).toBe(true)
    expect(defaults['grok.violation_deduction_amount']).toBe(0.05)
    expect(defaults.RetryTimes).toBe(0)
    expect(defaults['channel_affinity_setting.enabled']).toBe(false)
    expect(defaults['channel_affinity_setting.max_entries']).toBe(100000)
    expect(defaults['model_deployment.ionet.enabled']).toBe(false)
  })
})
