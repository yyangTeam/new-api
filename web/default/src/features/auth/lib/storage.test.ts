import {
  saveUserId,
  getUserId,
  removeUserId,
  getAffiliateCode,
  saveAffiliateCode,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('saveUserId', () => {
  test('saves numeric user ID', () => {
    saveUserId(123)
    expect(localStorage.getItem('uid')).toBe('123')
  })

  test('saves string user ID', () => {
    saveUserId('abc')
    expect(localStorage.getItem('uid')).toBe('abc')
  })
})

describe('getUserId', () => {
  test('returns null when no user ID saved', () => {
    expect(getUserId()).toBe(null)
  })

  test('returns saved user ID', () => {
    localStorage.setItem('uid', '42')
    expect(getUserId()).toBe('42')
  })
})

describe('removeUserId', () => {
  test('removes saved user ID', () => {
    localStorage.setItem('uid', '42')
    removeUserId()
    expect(localStorage.getItem('uid')).toBe(null)
  })

  test('does not throw when no user ID exists', () => {
    expect(() => removeUserId()).not.toThrow()
  })
})

describe('getAffiliateCode', () => {
  test('returns empty string when no affiliate code saved', () => {
    expect(getAffiliateCode()).toBe('')
  })

  test('returns saved affiliate code', () => {
    localStorage.setItem('aff', 'CODE123')
    expect(getAffiliateCode()).toBe('CODE123')
  })
})

describe('saveAffiliateCode', () => {
  test('saves affiliate code', () => {
    saveAffiliateCode('MYCODE')
    expect(localStorage.getItem('aff')).toBe('MYCODE')
  })

  test('overwrites existing affiliate code', () => {
    saveAffiliateCode('OLD')
    saveAffiliateCode('NEW')
    expect(localStorage.getItem('aff')).toBe('NEW')
  })
})

describe('round-trip user ID', () => {
  test('save and get return same value', () => {
    saveUserId(999)
    expect(getUserId()).toBe('999')
  })

  test('save, remove, then get returns null', () => {
    saveUserId(999)
    removeUserId()
    expect(getUserId()).toBe(null)
  })
})
