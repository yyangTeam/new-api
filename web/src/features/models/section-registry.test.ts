import {
  MODELS_SECTION_IDS,
  MODELS_DEFAULT_SECTION,
  getModelsSectionNavItems,
} from './section-registry'

describe('models section-registry', () => {
  test('MODELS_SECTION_IDS contains metadata and deployments', () => {
    expect(MODELS_SECTION_IDS).toContain('metadata')
    expect(MODELS_SECTION_IDS).toContain('deployments')
    expect(MODELS_SECTION_IDS).toHaveLength(2)
  })

  test('MODELS_DEFAULT_SECTION is metadata', () => {
    expect(MODELS_DEFAULT_SECTION).toBe('metadata')
  })

  test('getModelsSectionNavItems returns navigation items', () => {
    const t = ((key: string) => key) as import('i18next').TFunction
    const items = getModelsSectionNavItems(t)
    expect(items).toBeDefined()
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBe(2)
  })

  test('nav items have expected shape', () => {
    const t = ((key: string) => key) as import('i18next').TFunction
    const items = getModelsSectionNavItems(t)
    for (const item of items) {
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('url')
    }
  })
})
