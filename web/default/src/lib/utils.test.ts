import {
  getPageNumbers,
  sanitizeCssVariableName,
  truncateText,
} from './utils'

describe('getPageNumbers', () => {
  test('returns sequential numbers for small page counts', () => {
    expect(getPageNumbers(1, 1)).toEqual([1])
    expect(getPageNumbers(1, 4)).toEqual([1, 2, 3, 4])
  })

  test('shows ellipsis near beginning', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, '...', 10])
    expect(getPageNumbers(2, 10)).toEqual([1, 2, '...', 10])
  })

  test('shows ellipsis on both sides in middle', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 5, '...', 10])
  })

  test('shows ellipsis near end', () => {
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 9, 10])
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 9, 10])
  })
})

describe('truncateText', () => {
  test('returns original text when within limit', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  test('truncates and adds ellipsis when exceeding limit', () => {
    expect(truncateText('hello world', 5)).toBe('hello...')
  })

  test('handles empty and falsy text', () => {
    expect(truncateText('', 5)).toBe('')
  })
})

describe('sanitizeCssVariableName', () => {
  test('replaces dots, spaces, and slashes with hyphens', () => {
    expect(sanitizeCssVariableName('gpt-3.5-turbo')).toBe('gpt-3-5-turbo')
    expect(sanitizeCssVariableName('model name/v2')).toBe('model-name-v2')
  })

  test('removes other special characters', () => {
    expect(sanitizeCssVariableName('model@v2!')).toBe('modelv2')
  })
})
