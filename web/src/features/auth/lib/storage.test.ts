import { getAffiliateCode, saveAffiliateCode } from './storage'

beforeEach(() => {
  localStorage.clear()
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
