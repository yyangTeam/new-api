import { getPreviewText } from './text'

describe('getPreviewText', () => {
  test('returns empty string for empty input', () => {
    expect(getPreviewText('')).toBe('')
  })

  test('strips HTML tags', () => {
    expect(getPreviewText('<p>Hello <b>world</b></p>')).toBe('Hello world')
  })

  test('strips Markdown formatting symbols', () => {
    expect(getPreviewText('# Hello **world**')).toBe('Hello world')
  })

  test('trims whitespace', () => {
    expect(getPreviewText('  hello  ')).toBe('hello')
  })

  test('truncates long text with ellipsis', () => {
    const longText = 'a'.repeat(100)
    const result = getPreviewText(longText, 60)
    expect(result).toBe('a'.repeat(60) + '...')
  })

  test('does not truncate text within maxLength', () => {
    const shortText = 'Hello world'
    expect(getPreviewText(shortText, 60)).toBe('Hello world')
  })

  test('uses default maxLength of 60', () => {
    const text = 'a'.repeat(100)
    const result = getPreviewText(text)
    expect(result).toBe('a'.repeat(60) + '...')
  })

  test('handles mixed HTML and Markdown', () => {
    const input = '<div># Title **bold** _italic_</div>'
    const result = getPreviewText(input)
    expect(result).toBe('Title bold italic')
  })

  test('returns text exactly at maxLength without truncation', () => {
    const text = 'a'.repeat(60)
    expect(getPreviewText(text, 60)).toBe(text)
  })
})
