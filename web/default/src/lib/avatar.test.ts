import { getUserAvatarStyle, getUserAvatarFallback } from './avatar'

describe('getUserAvatarStyle', () => {
  test('returns an object with backgroundColor and color', () => {
    const style = getUserAvatarStyle('Alice')
    expect(style).toHaveProperty('backgroundColor')
    expect(style).toHaveProperty('color')
    expect(style.color).toBe('white')
  })

  test('returns consistent style for the same name', () => {
    const style1 = getUserAvatarStyle('Bob')
    const style2 = getUserAvatarStyle('Bob')
    expect(style1).toEqual(style2)
  })

  test('returns different styles for different names', () => {
    const style1 = getUserAvatarStyle('Alice')
    const style2 = getUserAvatarStyle('Zara')
    expect(style1.backgroundColor).not.toBe(style2.backgroundColor)
  })

  test('backgroundColor is an hsl string', () => {
    const style = getUserAvatarStyle('Test')
    expect(style.backgroundColor).toMatch(
      /^hsl\(\d+ \d+% \d+% \/ 0\.82\)$/
    )
  })

  test('handles empty string', () => {
    const style = getUserAvatarStyle('')
    expect(style.backgroundColor).toMatch(/^hsl\(/)
    expect(style.color).toBe('white')
  })

  test('handles single character name', () => {
    const style = getUserAvatarStyle('A')
    expect(style.backgroundColor).toMatch(/^hsl\(/)
    expect(style.color).toBe('white')
  })
})

describe('getUserAvatarFallback', () => {
  test('returns first character uppercased', () => {
    expect(getUserAvatarFallback('alice')).toBe('A')
    expect(getUserAvatarFallback('Bob')).toBe('B')
  })

  test('trims whitespace before extracting', () => {
    expect(getUserAvatarFallback('  charlie')).toBe('C')
    expect(getUserAvatarFallback('  ')).toBe('?')
  })

  test('returns ? for empty string', () => {
    expect(getUserAvatarFallback('')).toBe('?')
  })

  test('handles unicode characters', () => {
    expect(getUserAvatarFallback('你好')).toBe('你')
  })

  test('handles single character', () => {
    expect(getUserAvatarFallback('z')).toBe('Z')
  })

  test('handles number as first character', () => {
    expect(getUserAvatarFallback('123')).toBe('1')
  })
})
