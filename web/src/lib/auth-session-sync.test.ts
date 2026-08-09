import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  publishAuthSessionEvent,
  subscribeAuthSessionEvents,
  type AuthSessionSyncEvent,
} from './auth-session-sync'

describe('auth-session-sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('publishAuthSessionEvent', () => {
    it('does nothing when sid is empty', () => {
      const postMessageSpy = vi.fn()
      vi.stubGlobal('BroadcastChannel', class {
        postMessage = postMessageSpy
        close() {}
      })
      publishAuthSessionEvent('authenticated', '')
      expect(postMessageSpy).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('publishes via BroadcastChannel when available', () => {
      const postMessageSpy = vi.fn()
      vi.stubGlobal('BroadcastChannel', class {
        postMessage = postMessageSpy
        addEventListener() {}
        removeEventListener() {}
        close() {}
      })

      publishAuthSessionEvent('authenticated', 'session-123')

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'authenticated',
          sid: 'session-123',
        })
      )
      vi.unstubAllGlobals()
    })

    it('falls back to localStorage when BroadcastChannel is not available', () => {
      // Remove BroadcastChannel
      const original = globalThis.BroadcastChannel
      // @ts-expect-error - removing for test
      delete globalThis.BroadcastChannel

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

      publishAuthSessionEvent('signed_out', 'session-456')

      expect(setItemSpy).toHaveBeenCalledWith(
        'new-api:auth-session:event',
        expect.any(String)
      )
      expect(removeItemSpy).toHaveBeenCalledWith('new-api:auth-session:event')

      globalThis.BroadcastChannel = original
    })
  })

  describe('subscribeAuthSessionEvents', () => {
    it('returns a cleanup function', () => {
      vi.stubGlobal('BroadcastChannel', class {
        addEventListener() {}
        removeEventListener() {}
        close() {}
      })

      const cleanup = subscribeAuthSessionEvents(() => {})
      expect(typeof cleanup).toBe('function')
      cleanup()
      vi.unstubAllGlobals()
    })

    it('subscribes via BroadcastChannel when available', () => {
      const addEventListenerSpy = vi.fn()
      vi.stubGlobal('BroadcastChannel', class {
        addEventListener = addEventListenerSpy
        removeEventListener = vi.fn()
        close = vi.fn()
      })

      subscribeAuthSessionEvents(() => {})

      expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function))
      vi.unstubAllGlobals()
    })

    it('falls back to storage event listener when no BroadcastChannel', () => {
      const original = globalThis.BroadcastChannel
      // @ts-expect-error - removing for test
      delete globalThis.BroadcastChannel

      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const cleanup = subscribeAuthSessionEvents(() => {})

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))
      cleanup()

      globalThis.BroadcastChannel = original
    })

    it('cleans up BroadcastChannel on unsubscribe', () => {
      const closeSpy = vi.fn()
      const removeEventListenerSpy = vi.fn()
      vi.stubGlobal('BroadcastChannel', class {
        addEventListener = vi.fn()
        removeEventListener = removeEventListenerSpy
        close = closeSpy
      })

      const cleanup = subscribeAuthSessionEvents(() => {})
      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalled()
      expect(closeSpy).toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('cleans up storage event on unsubscribe', () => {
      const original = globalThis.BroadcastChannel
      // @ts-expect-error - removing for test
      delete globalThis.BroadcastChannel

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      const cleanup = subscribeAuthSessionEvents(() => {})
      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))

      globalThis.BroadcastChannel = original
    })

    it('filters out events from same source', () => {
      const listener = vi.fn()
      let messageHandler: ((msg: { data: unknown }) => void) | null = null

      vi.stubGlobal('BroadcastChannel', class {
        addEventListener(_event: string, handler: (msg: { data: unknown }) => void) {
          messageHandler = handler
        }
        removeEventListener() {}
        close() {}
      })

      subscribeAuthSessionEvents(listener)

      // Simulate an event with a different source
      expect(messageHandler).not.toBeNull()
      messageHandler!({
        data: {
          kind: 'authenticated',
          sid: 'test',
          source: 'different-source',
          nonce: 'nonce-1',
          timestamp: Date.now(),
        },
      })

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'authenticated',
          sid: 'test',
        })
      )
      vi.unstubAllGlobals()
    })

    it('filters out events older than 60 seconds', () => {
      const listener = vi.fn()
      let messageHandler: ((msg: { data: unknown }) => void) | null = null

      vi.stubGlobal('BroadcastChannel', class {
        addEventListener(_event: string, handler: (msg: { data: unknown }) => void) {
          messageHandler = handler
        }
        removeEventListener() {}
        close() {}
      })

      subscribeAuthSessionEvents(listener)

      expect(messageHandler).not.toBeNull()
      messageHandler!({
        data: {
          kind: 'authenticated',
          sid: 'test',
          source: 'other-source',
          nonce: 'nonce-1',
          timestamp: Date.now() - 120_000, // 2 minutes ago
        },
      })

      expect(listener).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('filters out invalid events', () => {
      const listener = vi.fn()
      let messageHandler: ((msg: { data: unknown }) => void) | null = null

      vi.stubGlobal('BroadcastChannel', class {
        addEventListener(_event: string, handler: (msg: { data: unknown }) => void) {
          messageHandler = handler
        }
        removeEventListener() {}
        close() {}
      })

      subscribeAuthSessionEvents(listener)

      expect(messageHandler).not.toBeNull()
      messageHandler!({ data: { kind: 'invalid' } })
      messageHandler!({ data: null })
      messageHandler!({ data: 'string' })

      expect(listener).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })

    it('filters out events with empty sid', () => {
      const listener = vi.fn()
      let messageHandler: ((msg: { data: unknown }) => void) | null = null

      vi.stubGlobal('BroadcastChannel', class {
        addEventListener(_event: string, handler: (msg: { data: unknown }) => void) {
          messageHandler = handler
        }
        removeEventListener() {}
        close() {}
      })

      subscribeAuthSessionEvents(listener)

      expect(messageHandler).not.toBeNull()
      messageHandler!({
        data: {
          kind: 'authenticated',
          sid: '',
          source: 'other',
          nonce: 'n',
          timestamp: Date.now(),
        },
      })

      expect(listener).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })
})
