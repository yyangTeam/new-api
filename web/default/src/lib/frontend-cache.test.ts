import { initializeFrontendCache } from './frontend-cache'

const CACHE_VERSION_KEY = 'newapi:default:cache-version'
const CACHE_VERSION = 'default-v1'

describe('initializeFrontendCache', () => {
  let storage: Record<string, string>

  beforeEach(() => {
    storage = {}
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key]
      }),
      key: vi.fn((index: number) => Object.keys(storage)[index] ?? null),
      get length() {
        return Object.keys(storage).length
      },
      clear: vi.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
  })

  test('sets cache version on first run', () => {
    initializeFrontendCache()
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      CACHE_VERSION_KEY,
      CACHE_VERSION
    )
  })

  test('does nothing when cache version matches', () => {
    storage[CACHE_VERSION_KEY] = CACHE_VERSION
    initializeFrontendCache()
    expect(window.localStorage.setItem).not.toHaveBeenCalled()
    expect(window.localStorage.removeItem).not.toHaveBeenCalled()
  })

  test('clears non-preserved keys when version is outdated', () => {
    storage[CACHE_VERSION_KEY] = 'old-version'
    storage['some-ui-key'] = 'value'
    storage['another-key'] = 'value2'
    storage['user'] = 'preserved'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('some-ui-key')
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('another-key')
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith('user')
  })

  test('preserves user key', () => {
    storage['user'] = 'user-data'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith('user')
  })

  test('preserves uid key', () => {
    storage['uid'] = '123'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith('uid')
  })

  test('preserves aff key', () => {
    storage['aff'] = 'affiliate'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith('aff')
  })

  test('preserves oauth:binding:result key', () => {
    storage['oauth:binding:result'] = 'result'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(
      'oauth:binding:result'
    )
  })

  test('preserves cache version key itself', () => {
    storage[CACHE_VERSION_KEY] = 'old'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith(
      CACHE_VERSION_KEY
    )
  })

  test('clears and sets new version when version is missing', () => {
    storage['stale-key'] = 'val'
    initializeFrontendCache()
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('stale-key')
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      CACHE_VERSION_KEY,
      CACHE_VERSION
    )
  })
})
