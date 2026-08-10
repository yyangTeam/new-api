import { describe, it, expect, vi } from 'vitest'
import { redirect } from '@tanstack/react-router'

vi.mock('@tanstack/react-router', () => ({
  redirect: vi.fn(() => {
    throw new Error('REDIRECT')
  }),
}))

import {
  createSectionSearchSchema,
  createSettingsRouteConfig,
} from './route-config'

describe('createSectionSearchSchema', () => {
  it('creates a schema that accepts valid section values', () => {
    const schema = createSectionSearchSchema(
      ['general', 'advanced', 'security'] as const,
      'general'
    )
    const result = schema.parse({ section: 'advanced' })
    expect(result.section).toBe('advanced')
  })

  it('returns undefined when section is not provided', () => {
    const schema = createSectionSearchSchema(
      ['general', 'advanced'] as const,
      'general'
    )
    const result = schema.parse({})
    expect(result.section).toBeUndefined()
  })

  it('catches invalid section and returns default', () => {
    const schema = createSectionSearchSchema(
      ['general', 'advanced'] as const,
      'general'
    )
    const result = schema.parse({ section: 'invalid_section' })
    expect(result.section).toBe('general')
  })

  it('catches non-string section values and returns default', () => {
    const schema = createSectionSearchSchema(
      ['general', 'advanced'] as const,
      'general'
    )
    const result = schema.parse({ section: 123 })
    expect(result.section).toBe('general')
  })
})

describe('createSettingsRouteConfig', () => {
  it('returns a config object with validateSearch and component', () => {
    const component = 'MockComponent'
    const config = createSettingsRouteConfig({
      sectionIds: ['site', 'branding'] as const,
      defaultSection: 'site',
      component,
      routePath: '/system-settings/site',
    })

    expect(config.validateSearch).toBeDefined()
    expect(config.component).toBe(component)
    expect(config).not.toHaveProperty('beforeLoad')
  })

  it('includes beforeLoad when redirectToDefault is true', () => {
    const config = createSettingsRouteConfig({
      sectionIds: ['site', 'branding'] as const,
      defaultSection: 'site',
      component: 'Comp',
      routePath: '/system-settings/site',
      redirectToDefault: true,
    })

    expect(config).toHaveProperty('beforeLoad')
  })

  it('beforeLoad throws redirect when section is not provided', () => {
    const config = createSettingsRouteConfig({
      sectionIds: ['site', 'branding'] as const,
      defaultSection: 'site',
      component: 'Comp',
      routePath: '/system-settings/site',
      redirectToDefault: true,
    })

    const beforeLoad = (config as { beforeLoad: Function }).beforeLoad
    expect(() => beforeLoad({ search: {} })).toThrow('REDIRECT')
    expect(redirect).toHaveBeenCalledWith({
      to: '/system-settings/site',
      search: { section: 'site' },
    })
  })

  it('beforeLoad throws redirect when search is undefined', () => {
    const config = createSettingsRouteConfig({
      sectionIds: ['site', 'branding'] as const,
      defaultSection: 'site',
      component: 'Comp',
      routePath: '/system-settings/site',
      redirectToDefault: true,
    })

    const beforeLoad = (config as { beforeLoad: Function }).beforeLoad
    expect(() => beforeLoad({})).toThrow('REDIRECT')
  })

  it('beforeLoad does not throw when section is provided', () => {
    const config = createSettingsRouteConfig({
      sectionIds: ['site', 'branding'] as const,
      defaultSection: 'site',
      component: 'Comp',
      routePath: '/system-settings/site',
      redirectToDefault: true,
    })

    const beforeLoad = (config as { beforeLoad: Function }).beforeLoad
    expect(() => beforeLoad({ search: { section: 'branding' } })).not.toThrow()
  })
})
