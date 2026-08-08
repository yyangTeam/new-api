import { generateAffiliateLink } from './affiliate'

describe('generateAffiliateLink', () => {
  test('generates link with aff code', () => {
    const result = generateAffiliateLink('ABC123')
    expect(result).toBe(`${window.location.origin}/sign-up?aff=ABC123`)
  })

  test('generates link with empty aff code', () => {
    const result = generateAffiliateLink('')
    expect(result).toBe(`${window.location.origin}/sign-up?aff=`)
  })
})
