import { describe, it, expect, vi, beforeEach } from 'vitest'

// Each test imports a fresh module to reset the `installed` flag
describe('build-metadata', () => {
  beforeEach(() => {
    vi.resetModules()
    // Clean DOM state
    document.documentElement.removeAttribute('data-build-rev')
    document.documentElement.removeAttribute('data-app-channel')
    document.documentElement.style.removeProperty('--app-build-rev')
    document.querySelector('meta[name="build-id"]')?.remove()
    localStorage.removeItem('app:rev')
    // Remove __APP_BUILD__ if possible
    try {
      Object.defineProperty(window, '__APP_BUILD__', {
        value: undefined,
        writable: true,
        configurable: true,
      })
    } catch {
      // Already locked by a previous test; that's fine
    }
  })

  describe('getBuildRevision', () => {
    it('returns a revision string with rv prefix', async () => {
      const { getBuildRevision } = await import('./build-metadata')
      const rev = getBuildRevision()
      expect(rev).toMatch(/^rv\./)
    })

    it('contains the channel tag', async () => {
      const { getBuildRevision } = await import('./build-metadata')
      const rev = getBuildRevision()
      expect(rev).toContain('2k6e8r7p')
    })

    it('returns consistent results on multiple calls', async () => {
      const { getBuildRevision } = await import('./build-metadata')
      const rev1 = getBuildRevision()
      const rev2 = getBuildRevision()
      expect(rev1).toBe(rev2)
    })
  })

  describe('installBuildMetadata', () => {
    it('sets data-build-rev attribute on html element', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      const attr = document.documentElement.getAttribute('data-build-rev')
      expect(attr).toMatch(/^rv\./)
    })

    it('sets data-app-channel attribute on html element', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      const attr = document.documentElement.getAttribute('data-app-channel')
      expect(attr).toBe('2k6e8r7p')
    })

    it('sets CSS custom property --app-build-rev', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      const prop = document.documentElement.style.getPropertyValue('--app-build-rev')
      expect(prop).toContain('rv.')
    })

    it('creates meta[name="build-id"] element', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      const meta = document.querySelector<HTMLMetaElement>('meta[name="build-id"]')
      expect(meta).not.toBeNull()
      expect(meta!.content).toMatch(/^rv\./)
    })

    it('stores revision in localStorage', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      const stored = localStorage.getItem('app:rev')
      expect(stored).toMatch(/^rv\./)
    })

    it('sets window.__APP_BUILD__ descriptor', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      expect(window.__APP_BUILD__).toBeDefined()
      expect(window.__APP_BUILD__!.rev).toMatch(/^rv\./)
      expect(window.__APP_BUILD__!.ch).toBe('2k6e8r7p')
      expect(typeof window.__APP_BUILD__!.at).toBe('number')
    })

    it('is idempotent (second call is a no-op)', async () => {
      const { installBuildMetadata } = await import('./build-metadata')
      installBuildMetadata()
      const firstRev = document.documentElement.getAttribute('data-build-rev')
      installBuildMetadata()
      const secondRev = document.documentElement.getAttribute('data-build-rev')
      expect(firstRev).toBe(secondRev)
    })
  })
})
