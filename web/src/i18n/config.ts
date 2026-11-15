/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { convertDetectedLanguage } from './languages'

// Locale bundles are loaded on demand. The previous eager imports shipped all
// seven translation files (~4 MB raw) inside the entry chunk, dominating
// first paint on mobile networks; each locale is now its own async chunk
// fetched only when that language is actually used.
type LocaleBundle = Record<string, string>

// Each locale file wraps its flat translations in the i18next `translation`
// namespace; the backend read() contract expects the namespace payload.
const localeLoaders: Record<string, () => Promise<LocaleBundle>> = {
  en: () => import('./locales/en.json').then((m) => m.default.translation),
  zhCN: () => import('./locales/zh.json').then((m) => m.default.translation),
  zhTW: () =>
    import('./locales/zh-TW.json').then((m) => m.default.translation),
  fr: () => import('./locales/fr.json').then((m) => m.default.translation),
  ru: () => import('./locales/ru.json').then((m) => m.default.translation),
  ja: () => import('./locales/ja.json').then((m) => m.default.translation),
  vi: () => import('./locales/vi.json').then((m) => m.default.translation),
}

const localePromises = new Map<string, Promise<LocaleBundle>>()

function loadLocale(code: string): Promise<LocaleBundle> {
  let locale = localePromises.get(code)
  if (!locale) {
    const loader = localeLoaders[code]
    locale = loader ? loader() : Promise.resolve({})
    localePromises.set(code, locale)
  }
  return locale
}

// i18next backend adapter using the v26 promise-based read convention:
// init() and changeLanguage() await the returned promise, so every existing
// call site keeps working while locale chunks stay lazy.
export const lazyLocaleBackend = {
  type: 'backend' as const,
  callbackApi: false as const,
  init() {},
  read(language: string): Promise<LocaleBundle> {
    return loadLocale(language)
  },
}

// Resolves once the detected language and its fallback are loaded. main.tsx
// awaits this before mounting so the first render shows translated text.
export const i18nReady: Promise<unknown> = i18n
  .use(LanguageDetector)
  .use(lazyLocaleBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'zhCN', 'fr', 'ru', 'ja', 'vi', 'zhTW'],
    load: 'currentOnly',
    nsSeparator: false, // Allow literal colons in keys (e.g., URLs, labels)
    debug: import.meta.env.DEV,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      // Browsers report `zh-CN`/`zh-TW`/`zh`; map them onto our `zhCN`/`zhTW`
      // codes (non-Chinese codes pass through for normal supportedLngs matching).
      convertDetectedLanguage,
    },
    react: {
      // Mounting waits for i18nReady; disabling Suspense keeps the existing
      // synchronous render contract for components using useTranslation().
      useSuspense: false,
    },
  })

export default i18n
