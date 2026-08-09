import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'

import { useSafeJsonParse, useSafeJsonParseWithValidation } from './use-safe-json-state'

describe('useSafeJsonParse', () => {
  it('parses valid JSON string', () => {
    const { result } = renderHook(() =>
      useSafeJsonParse('{"name":"test","value":42}', {
        fallback: {},
        context: 'test',
      })
    )
    expect(result.current).toEqual({ name: 'test', value: 42 })
  })

  it('parses valid JSON array', () => {
    const { result } = renderHook(() =>
      useSafeJsonParse('[1, 2, 3]', {
        fallback: [] as number[],
        context: 'array-test',
      })
    )
    expect(result.current).toEqual([1, 2, 3])
  })

  it('returns fallback for invalid JSON', () => {
    const fallback = { default: true }
    const { result } = renderHook(() =>
      useSafeJsonParse('{invalid json!!', {
        fallback,
        context: 'invalid',
        silent: true,
      })
    )
    expect(result.current).toEqual(fallback)
  })

  it('returns fallback for null input', () => {
    const fallback = { empty: true }
    const { result } = renderHook(() =>
      useSafeJsonParse(null, {
        fallback,
        context: 'null-input',
      })
    )
    expect(result.current).toEqual(fallback)
  })

  it('returns fallback for undefined input', () => {
    const fallback = 'default'
    const { result } = renderHook(() =>
      useSafeJsonParse(undefined, {
        fallback,
        context: 'undefined-input',
      })
    )
    expect(result.current).toBe(fallback)
  })

  it('returns fallback for empty string', () => {
    const fallback = { x: 1 }
    const { result } = renderHook(() =>
      useSafeJsonParse('', {
        fallback,
        context: 'empty-string',
      })
    )
    expect(result.current).toEqual(fallback)
  })

  it('returns fallback for whitespace-only string', () => {
    const fallback = 'ws-fallback'
    const { result } = renderHook(() =>
      useSafeJsonParse('   ', {
        fallback,
        context: 'whitespace',
      })
    )
    expect(result.current).toBe(fallback)
  })

  it('memoizes result for same input', () => {
    const fallback = { stable: true }
    const { result, rerender } = renderHook(
      ({ value }) =>
        useSafeJsonParse(value, {
          fallback,
          context: 'memo-test',
        }),
      { initialProps: { value: '{"a":1}' } }
    )
    const first = result.current
    rerender({ value: '{"a":1}' })
    expect(result.current).toBe(first)
  })

  it('recomputes when input changes', () => {
    const fallback = {}
    const { result, rerender } = renderHook(
      ({ value }) =>
        useSafeJsonParse(value, {
          fallback,
          context: 'change-test',
        }),
      { initialProps: { value: '{"a":1}' } }
    )
    expect(result.current).toEqual({ a: 1 })
    rerender({ value: '{"b":2}' })
    expect(result.current).toEqual({ b: 2 })
  })

  it('handles JSON primitives (number)', () => {
    const { result } = renderHook(() =>
      useSafeJsonParse<number>('42', {
        fallback: 0,
        context: 'number',
      })
    )
    expect(result.current).toBe(42)
  })

  it('handles JSON primitives (boolean)', () => {
    const { result } = renderHook(() =>
      useSafeJsonParse<boolean>('true', {
        fallback: false,
        context: 'boolean',
      })
    )
    expect(result.current).toBe(true)
  })
})

describe('useSafeJsonParseWithValidation', () => {
  const isStringArray = (data: unknown): data is string[] =>
    Array.isArray(data) && data.every((item) => typeof item === 'string')

  it('returns parsed value when validation passes', () => {
    const { result } = renderHook(() =>
      useSafeJsonParseWithValidation('["a","b","c"]', {
        fallback: [] as string[],
        validator: isStringArray,
        context: 'string-array',
      })
    )
    expect(result.current).toEqual(['a', 'b', 'c'])
  })

  it('returns fallback when validation fails', () => {
    const fallback = ['default']
    const { result } = renderHook(() =>
      useSafeJsonParseWithValidation('[1, 2, 3]', {
        fallback,
        validator: isStringArray,
        context: 'not-string-array',
        silent: true,
      })
    )
    expect(result.current).toEqual(fallback)
  })

  it('returns fallback for invalid JSON', () => {
    const fallback = ['fallback']
    const { result } = renderHook(() =>
      useSafeJsonParseWithValidation('{broken', {
        fallback,
        validator: isStringArray,
        context: 'broken-json',
        silent: true,
      })
    )
    expect(result.current).toEqual(fallback)
  })

  it('returns fallback for null input', () => {
    const fallback = ['empty']
    const { result } = renderHook(() =>
      useSafeJsonParseWithValidation(null, {
        fallback,
        validator: isStringArray,
        context: 'null',
      })
    )
    expect(result.current).toEqual(fallback)
  })

  it('validates with a custom object validator', () => {
    interface Config {
      host: string
      port: number
    }
    const isConfig = (data: unknown): data is Config =>
      typeof data === 'object' &&
      data !== null &&
      'host' in data &&
      'port' in data &&
      typeof (data as Config).host === 'string' &&
      typeof (data as Config).port === 'number'

    const fallback: Config = { host: 'localhost', port: 8080 }

    const { result } = renderHook(() =>
      useSafeJsonParseWithValidation('{"host":"example.com","port":3000}', {
        fallback,
        validator: isConfig,
        context: 'config',
      })
    )
    expect(result.current).toEqual({ host: 'example.com', port: 3000 })
  })

  it('returns fallback when object fails custom validation', () => {
    interface Config {
      host: string
      port: number
    }
    const isConfig = (data: unknown): data is Config =>
      typeof data === 'object' &&
      data !== null &&
      'host' in data &&
      'port' in data &&
      typeof (data as Config).host === 'string' &&
      typeof (data as Config).port === 'number'

    const fallback: Config = { host: 'localhost', port: 8080 }

    const { result } = renderHook(() =>
      useSafeJsonParseWithValidation('{"host":"example.com","port":"not-a-number"}', {
        fallback,
        validator: isConfig,
        context: 'bad-config',
        silent: true,
      })
    )
    expect(result.current).toEqual(fallback)
  })
})
