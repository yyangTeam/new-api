import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/i18n/locales/en.json'

i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en },
  interpolation: { escapeValue: false },
  nsSeparator: false,
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom (unlike happy-dom) does not ship IntersectionObserver or
// Element.prototype.scrollIntoView; components that use them (carousel,
// combobox, command menus) throw without these mocks.
globalThis.IntersectionObserver = class IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
Element.prototype.scrollIntoView = function scrollIntoView() {}

// Default fetch stub: components that fetch on mount (e.g. turnstile,
// external resources) would hit real network on CI (which has internet),
// accumulating response data until the worker heap-exhausts (>8GB).
// Locally (no external network) these fail fast so the leak doesn't
// manifest. Stubbing globalThis.fetch to a benign 200 Response prevents
// any real network calls. Tests that assert on fetch MUST install their
// own vi.spyOn(globalThis, 'fetch') or vi.mock — they override this stub.
globalThis.fetch = vi.fn(() =>
  Promise.resolve(
    new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ),
) as typeof fetch


afterEach(cleanup)
