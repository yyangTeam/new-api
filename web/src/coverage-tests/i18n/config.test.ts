import { createInstance } from 'i18next'
import { expect, test } from 'vitest'

import vi from '@/i18n/locales/vi.json'
import { lazyLocaleBackend } from '@/i18n/config'

// The shared i18next singleton in src/test/setup.ts is already initialized,
// so the lazy-loading contract is exercised on a fresh instance wired to the
// same backend adapter production uses.
const i18n = createInstance()
await i18n.use(lazyLocaleBackend).init({
  lng: 'zhCN',
  fallbackLng: 'en',
  nsSeparator: false,
  interpolation: { escapeValue: false },
})

test('init with the lazy backend registers the active language and fallback bundles', () => {
  expect(i18n.hasResourceBundle('zhCN', 'translation')).toBe(true)
  expect(i18n.hasResourceBundle('en', 'translation')).toBe(true)
})

test('locale bundles outside the active language stay unloaded until changeLanguage requests them', async () => {
  expect(i18n.hasResourceBundle('vi', 'translation')).toBe(false)
  await i18n.changeLanguage('vi')
  expect(i18n.hasResourceBundle('vi', 'translation')).toBe(true)
  expect(i18n.t('Show password')).toBe(vi.translation['Show password'])
})
