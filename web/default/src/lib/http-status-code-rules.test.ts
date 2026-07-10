import { parseHttpStatusCodeRules } from './http-status-code-rules'

describe('parseHttpStatusCodeRules', () => {
  test('returns ok with empty ranges for empty string', () => {
    const result = parseHttpStatusCodeRules('')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([])
    expect(result.tokens).toEqual([])
    expect(result.normalized).toBe('')
    expect(result.invalidTokens).toEqual([])
  })

  test('returns ok with empty ranges for null', () => {
    const result = parseHttpStatusCodeRules(null)
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([])
  })

  test('returns ok with empty ranges for undefined', () => {
    const result = parseHttpStatusCodeRules(undefined)
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([])
  })

  test('parses a single status code', () => {
    const result = parseHttpStatusCodeRules('200')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([{ start: 200, end: 200 }])
    expect(result.tokens).toEqual(['200'])
    expect(result.normalized).toBe('200')
  })

  test('parses a range of status codes', () => {
    const result = parseHttpStatusCodeRules('200-299')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([{ start: 200, end: 299 }])
    expect(result.tokens).toEqual(['200-299'])
    expect(result.normalized).toBe('200-299')
  })

  test('parses multiple comma-separated codes', () => {
    const result = parseHttpStatusCodeRules('200,404,500')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([
      { start: 200, end: 200 },
      { start: 404, end: 404 },
      { start: 500, end: 500 },
    ])
    expect(result.tokens).toEqual(['200', '404', '500'])
    expect(result.normalized).toBe('200,404,500')
  })

  test('parses mixed codes and ranges', () => {
    const result = parseHttpStatusCodeRules('200, 400-499, 500')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([
      { start: 200, end: 200 },
      { start: 400, end: 500 },
    ])
    expect(result.tokens).toEqual(['200', '400-500'])
    expect(result.normalized).toBe('200,400-500')
  })

  test('merges adjacent ranges', () => {
    const result = parseHttpStatusCodeRules('200,201,202')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([{ start: 200, end: 202 }])
    expect(result.tokens).toEqual(['200-202'])
    expect(result.normalized).toBe('200-202')
  })

  test('merges overlapping ranges', () => {
    const result = parseHttpStatusCodeRules('200-300,250-350')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([{ start: 200, end: 350 }])
    expect(result.tokens).toEqual(['200-350'])
  })

  test('sorts unsorted ranges', () => {
    const result = parseHttpStatusCodeRules('500,200,300')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([
      { start: 200, end: 200 },
      { start: 300, end: 300 },
      { start: 500, end: 500 },
    ])
    expect(result.normalized).toBe('200,300,500')
  })

  test('handles Chinese comma separator', () => {
    const result = parseHttpStatusCodeRules('200，404，500')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([
      { start: 200, end: 200 },
      { start: 404, end: 404 },
      { start: 500, end: 500 },
    ])
  })

  test('returns not ok for invalid token', () => {
    const result = parseHttpStatusCodeRules('abc')
    expect(result.ok).toBe(false)
    expect(result.ranges).toEqual([])
    expect(result.tokens).toEqual([])
    expect(result.invalidTokens).toEqual(['abc'])
  })

  test('returns not ok for code below 100', () => {
    const result = parseHttpStatusCodeRules('99')
    expect(result.ok).toBe(false)
    expect(result.invalidTokens).toEqual(['99'])
  })

  test('returns not ok for code above 599', () => {
    const result = parseHttpStatusCodeRules('600')
    expect(result.ok).toBe(false)
    expect(result.invalidTokens).toEqual(['600'])
  })

  test('returns not ok for reversed range', () => {
    const result = parseHttpStatusCodeRules('500-200')
    expect(result.ok).toBe(false)
    expect(result.invalidTokens).toEqual(['500-200'])
  })

  test('returns not ok when any token is invalid among valid ones', () => {
    const result = parseHttpStatusCodeRules('200, abc, 500')
    expect(result.ok).toBe(false)
    expect(result.invalidTokens).toEqual(['abc'])
    expect(result.ranges).toEqual([])
  })

  test('returns multiple invalid tokens', () => {
    const result = parseHttpStatusCodeRules('abc, xyz')
    expect(result.ok).toBe(false)
    expect(result.invalidTokens).toEqual(['abc', 'xyz'])
  })

  test('handles whitespace around tokens', () => {
    const result = parseHttpStatusCodeRules('  200  ,  300  ')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([
      { start: 200, end: 200 },
      { start: 300, end: 300 },
    ])
  })

  test('handles number input', () => {
    const result = parseHttpStatusCodeRules(200)
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([{ start: 200, end: 200 }])
  })

  test('boundary valid codes 100 and 599', () => {
    const result = parseHttpStatusCodeRules('100,599')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([
      { start: 100, end: 100 },
      { start: 599, end: 599 },
    ])
  })

  test('handles whitespace in range', () => {
    const result = parseHttpStatusCodeRules('200 - 300')
    expect(result.ok).toBe(true)
    expect(result.ranges).toEqual([{ start: 200, end: 300 }])
  })
})
