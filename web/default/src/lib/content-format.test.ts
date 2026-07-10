import { isHttpUrl, isLikelyHtml } from './content-format'

describe('isHttpUrl', () => {
  test('accepts valid http URLs', () => {
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('http://example.com/path?q=1')).toBe(true)
    expect(isHttpUrl('http://localhost:3000')).toBe(true)
  })

  test('accepts valid https URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('https://sub.domain.com/path#anchor')).toBe(true)
    expect(isHttpUrl('https://example.com:8080/api')).toBe(true)
  })

  test('rejects non-http protocols', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false)
    expect(isHttpUrl('file:///tmp/test.txt')).toBe(false)
    expect(isHttpUrl('data:text/html,hello')).toBe(false)
    expect(isHttpUrl('javascript:void(0)')).toBe(false)
    expect(isHttpUrl('mailto:user@example.com')).toBe(false)
  })

  test('rejects non-URL strings', () => {
    expect(isHttpUrl('')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
    expect(isHttpUrl('example.com')).toBe(false)
    expect(isHttpUrl('/path/to/file')).toBe(false)
  })

  test('rejects strings that cannot be parsed as URLs', () => {
    expect(isHttpUrl('://')).toBe(false)
  })
})

describe('isLikelyHtml', () => {
  test('detects doctype declaration', () => {
    expect(isLikelyHtml('<!DOCTYPE html><html></html>')).toBe(true)
    expect(isLikelyHtml('<!doctype html>')).toBe(true)
  })

  test('detects html tag', () => {
    expect(isLikelyHtml('<html>')).toBe(true)
    expect(isLikelyHtml('<html lang="en">')).toBe(true)
  })

  test('detects head tag', () => {
    expect(isLikelyHtml('<head>')).toBe(true)
    expect(isLikelyHtml('<head lang="en">')).toBe(true)
  })

  test('detects body tag', () => {
    expect(isLikelyHtml('<body>')).toBe(true)
    expect(isLikelyHtml('<body class="main">')).toBe(true)
  })

  test('detects style tag', () => {
    expect(isLikelyHtml('<style>body{}</style>')).toBe(true)
    expect(isLikelyHtml('<style type="text/css">')).toBe(true)
  })

  test('detects script tag', () => {
    expect(isLikelyHtml('<script>alert(1)</script>')).toBe(true)
    expect(isLikelyHtml('<script src="app.js">')).toBe(true)
  })

  test('detects generic HTML tags', () => {
    expect(isLikelyHtml('<div>content</div>')).toBe(true)
    expect(isLikelyHtml('<p>paragraph</p>')).toBe(true)
    expect(isLikelyHtml('<br/>')).toBe(true)
    expect(isLikelyHtml('<img src="a.png">')).toBe(true)
  })

  test('is case-insensitive', () => {
    expect(isLikelyHtml('<HTML>')).toBe(true)
    expect(isLikelyHtml('<BODY>')).toBe(true)
    expect(isLikelyHtml('<!DOCTYPE HTML>')).toBe(true)
  })

  test('rejects plain text', () => {
    expect(isLikelyHtml('hello world')).toBe(false)
    expect(isLikelyHtml('just some text')).toBe(false)
    expect(isLikelyHtml('')).toBe(false)
  })

  test('rejects JSON strings', () => {
    expect(isLikelyHtml('{"key": "value"}')).toBe(false)
    expect(isLikelyHtml('[1, 2, 3]')).toBe(false)
  })

  test('rejects markdown', () => {
    expect(isLikelyHtml('# Heading')).toBe(false)
    expect(isLikelyHtml('**bold text**')).toBe(false)
  })
})
