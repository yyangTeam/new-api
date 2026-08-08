import { getCookie, setCookie, removeCookie } from './cookies'

beforeEach(() => {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: '',
  })
})

describe('getCookie', () => {
  test('returns undefined when no cookies are set', () => {
    expect(getCookie('test')).toBeUndefined()
  })

  test('returns the value for an existing cookie', () => {
    document.cookie = 'token=abc123'
    expect(getCookie('token')).toBe('abc123')
  })

  test('returns correct cookie from multiple cookies', () => {
    document.cookie = 'first=1; second=2; third=3'
    expect(getCookie('second')).toBe('2')
  })

  test('returns undefined for a non-existent cookie name', () => {
    document.cookie = 'existing=value'
    expect(getCookie('nonexistent')).toBeUndefined()
  })

  test('handles cookie values with equals signs', () => {
    document.cookie = 'data=key=value'
    expect(getCookie('data')).toBe('key=value')
  })

  test('returns the first cookie value', () => {
    document.cookie = 'name=first'
    expect(getCookie('name')).toBe('first')
  })

  test('does not match partial cookie names', () => {
    document.cookie = 'session_id=abc'
    expect(getCookie('session')).toBeUndefined()
  })
})

describe('setCookie', () => {
  test('sets a cookie with default max-age', () => {
    setCookie('theme', 'dark')
    expect(document.cookie).toContain('theme=dark')
    expect(document.cookie).toContain('path=/')
    expect(document.cookie).toContain('max-age=604800')
  })

  test('sets a cookie with custom max-age', () => {
    setCookie('session', 'xyz', 3600)
    expect(document.cookie).toContain('session=xyz')
    expect(document.cookie).toContain('max-age=3600')
  })

  test('sets a cookie with empty value', () => {
    setCookie('empty', '')
    expect(document.cookie).toContain('empty=')
  })
})

describe('removeCookie', () => {
  test('removes a cookie by setting max-age to 0', () => {
    removeCookie('token')
    expect(document.cookie).toContain('token=')
    expect(document.cookie).toContain('max-age=0')
  })

  test('sets path to / when removing', () => {
    removeCookie('session')
    expect(document.cookie).toContain('path=/')
  })
})
