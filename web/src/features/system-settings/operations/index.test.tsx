import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { version: '1.0.0', start_time: 1700000000 } }),
}))
vi.mock('../components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    ;(globalThis as any).__lastOpsPageProps = props
    return null
  },
}))
vi.mock('./section-registry.tsx', () => ({
  OPERATIONS_DEFAULT_SECTION: 'behavior',
  getOperationsSectionContent: vi.fn(),
  getOperationsSectionMeta: vi.fn(),
}))

import { OperationsSettings } from './index'

describe('OperationsSettings page component', () => {
  it('renders SettingsPage with correct route path', () => {
    render(React.createElement(OperationsSettings))
    const props = (globalThis as any).__lastOpsPageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/operations/$section'
    )
    expect(props.defaultSection).toBe('behavior')
    expect(props.loadingMessage).toBe('Loading maintenance settings...')
  })

  it('passes version and start_time as extraArgs', () => {
    render(React.createElement(OperationsSettings))
    const props = (globalThis as any).__lastOpsPageProps
    expect(props.extraArgs).toEqual(['1.0.0', 1700000000])
  })

  it('provides default operations settings', () => {
    render(React.createElement(OperationsSettings))
    const props = (globalThis as any).__lastOpsPageProps
    const defaults = props.defaultSettings
    expect(defaults.DefaultCollapseSidebar).toBe(false)
    expect(defaults.SMTPSSLEnabled).toBe(false)
    expect(defaults['perf_metrics_setting.enabled']).toBe(true)
    expect(defaults['performance_setting.monitor_cpu_threshold']).toBe(90)
  })
})
