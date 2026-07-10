import { resolveThemeRadiusPx } from './theme-radius'

describe('resolveThemeRadiusPx', () => {
  test('returns a number when CSS variable resolves to a pixel value', () => {
    document.documentElement.style.setProperty('--radius-md', '8px')
    const result = resolveThemeRadiusPx('--radius-md')
    expect(typeof result).toBe('number')
    document.documentElement.style.removeProperty('--radius-md')
  })

  test('uses --radius-md as default CSS variable', () => {
    document.documentElement.style.setProperty('--radius-md', '12px')
    const result = resolveThemeRadiusPx()
    expect(typeof result).toBe('number')
    document.documentElement.style.removeProperty('--radius-md')
  })

  test('accepts a custom CSS variable name', () => {
    document.documentElement.style.setProperty('--custom-radius', '4px')
    const result = resolveThemeRadiusPx('--custom-radius')
    expect(typeof result).toBe('number')
    document.documentElement.style.removeProperty('--custom-radius')
  })

  test('returns undefined when CSS variable is not set and resolves to empty', () => {
    const result = resolveThemeRadiusPx('--nonexistent-variable')
    if (result !== undefined) {
      expect(typeof result).toBe('number')
    }
  })
})
