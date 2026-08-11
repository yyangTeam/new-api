import { describe, it, expect, vi } from 'vitest'

// Mock all deep dependencies to test the resolveContentSettings logic
vi.mock('@/features/system-settings/components/settings-page', () => ({
  SettingsPage: (props: Record<string, unknown>) => {
    // Expose resolveSettings for testing
    ;(globalThis as any).__lastSettingsPageProps = props
    return null
  },
}))

vi.mock('@/features/system-settings/content/section-registry', () => ({
  CONTENT_DEFAULT_SECTION: 'dashboard',
  getContentSectionContent: vi.fn(),
  getContentSectionMeta: vi.fn(),
}))

import { render } from '@testing-library/react'
import React from 'react'
import { ContentSettings } from '@/features/system-settings/content/index'

describe('ContentSettings', () => {
  it('renders SettingsPage with correct props', () => {
    render(React.createElement(ContentSettings))
    const props = (globalThis as any).__lastSettingsPageProps
    expect(props.routePath).toBe(
      '/_authenticated/system-settings/content/$section'
    )
    expect(props.defaultSection).toBe('dashboard')
    expect(props.loadingMessage).toBe('Loading content settings...')
    expect(props.resolveSettings).toBeDefined()
  })

  describe('resolveContentSettings', () => {
    function getResolveSettings() {
      render(React.createElement(ContentSettings))
      return (globalThis as any).__lastSettingsPageProps.resolveSettings as (
        settings: Record<string, unknown>,
        raw: { key: string; value: string }[] | undefined
      ) => Record<string, unknown>
    }

    it('returns settings unchanged when raw is empty', () => {
      const resolve = getResolveSettings()
      const settings = { 'console_setting.faq': '[]', DataExportEnabled: false }
      expect(resolve(settings as any, [])).toEqual(settings)
    })

    it('returns settings unchanged when raw is undefined', () => {
      const resolve = getResolveSettings()
      const settings = { 'console_setting.faq': '[]' }
      expect(resolve(settings as any, undefined)).toEqual(settings)
    })

    it('populates known keys from raw options', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.faq': '[]',
        'console_setting.announcements': '[]',
        DataExportEnabled: false,
      }
      const raw = [
        { key: 'console_setting.faq', value: '[{"q":"?","a":"!"}]' },
        { key: 'DataExportEnabled', value: 'true' },
      ]
      const result = resolve(settings as any, raw)
      expect(result['console_setting.faq']).toBe('[{"q":"?","a":"!"}]')
      expect(result.DataExportEnabled).toBe('true')
    })

    it('falls back to legacy Announcements key', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.announcements': '[]',
        'console_setting.api_info': '[]',
        'console_setting.faq': '[]',
        'console_setting.uptime_kuma_groups': '[]',
      }
      const raw = [
        { key: 'Announcements', value: '[{"title":"hi"}]' },
      ]
      const result = resolve(settings as any, raw)
      expect(result['console_setting.announcements']).toBe('[{"title":"hi"}]')
    })

    it('falls back to legacy ApiInfo key', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.announcements': '[]',
        'console_setting.api_info': '[]',
        'console_setting.faq': '[]',
        'console_setting.uptime_kuma_groups': '[]',
      }
      const raw = [{ key: 'ApiInfo', value: '[{"url":"x"}]' }]
      const result = resolve(settings as any, raw)
      expect(result['console_setting.api_info']).toBe('[{"url":"x"}]')
    })

    it('falls back to legacy FAQ key', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.announcements': '[]',
        'console_setting.api_info': '[]',
        'console_setting.faq': '[]',
        'console_setting.uptime_kuma_groups': '[]',
      }
      const raw = [{ key: 'FAQ', value: '[{"q":"x"}]' }]
      const result = resolve(settings as any, raw)
      expect(result['console_setting.faq']).toBe('[{"q":"x"}]')
    })

    it('does not use legacy key if current key exists in raw', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.faq': '[]',
        'console_setting.announcements': '[]',
        'console_setting.api_info': '[]',
        'console_setting.uptime_kuma_groups': '[]',
      }
      const raw = [
        { key: 'console_setting.faq', value: '[{"q":"new"}]' },
        { key: 'FAQ', value: '[{"q":"legacy"}]' },
      ]
      const result = resolve(settings as any, raw)
      expect(result['console_setting.faq']).toBe('[{"q":"new"}]')
    })

    it('builds uptime_kuma_groups from legacy UptimeKumaUrl and UptimeKumaSlug', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.uptime_kuma_groups': '[]',
        'console_setting.announcements': '[]',
        'console_setting.api_info': '[]',
        'console_setting.faq': '[]',
      }
      const raw = [
        { key: 'UptimeKumaUrl', value: 'https://status.example.com' },
        { key: 'UptimeKumaSlug', value: 'my-monitor' },
      ]
      const result = resolve(settings as any, raw)
      const parsed = JSON.parse(
        result['console_setting.uptime_kuma_groups'] as string
      )
      expect(parsed).toEqual([
        {
          id: 1,
          categoryName: 'Legacy',
          url: 'https://status.example.com',
          slug: 'my-monitor',
        },
      ])
    })

    it('does not build legacy uptime kuma if current key exists', () => {
      const resolve = getResolveSettings()
      const settings = {
        'console_setting.uptime_kuma_groups': '[]',
        'console_setting.announcements': '[]',
        'console_setting.api_info': '[]',
        'console_setting.faq': '[]',
      }
      const raw = [
        {
          key: 'console_setting.uptime_kuma_groups',
          value: '[{"id":2}]',
        },
        { key: 'UptimeKumaUrl', value: 'https://old.url' },
        { key: 'UptimeKumaSlug', value: 'old' },
      ]
      const result = resolve(settings as any, raw)
      expect(result['console_setting.uptime_kuma_groups']).toBe('[{"id":2}]')
    })
  })
})
