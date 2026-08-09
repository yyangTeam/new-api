import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useTableCompactMode } from './use-table-compact-mode'

const STORAGE_KEY = 'table_compact_modes'

describe('useTableCompactMode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to false when nothing in localStorage', () => {
    const { result } = renderHook(() => useTableCompactMode('test-table'))
    expect(result.current[0]).toBe(false)
  })

  it('reads initial value from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'my-table': true })
    )

    const { result } = renderHook(() => useTableCompactMode('my-table'))
    expect(result.current[0]).toBe(true)
  })

  it('returns false for a key not present in localStorage map', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ 'other-table': true })
    )

    const { result } = renderHook(() => useTableCompactMode('my-table'))
    expect(result.current[0]).toBe(false)
  })

  it('updates state and persists to localStorage on toggle', () => {
    const { result } = renderHook(() => useTableCompactMode('test-table'))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['test-table']).toBe(true)
  })

  it('can toggle back to false', () => {
    const { result } = renderHook(() => useTableCompactMode('test-table'))

    act(() => {
      result.current[1](true)
    })
    expect(result.current[0]).toBe(true)

    act(() => {
      result.current[1](false)
    })
    expect(result.current[0]).toBe(false)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['test-table']).toBe(false)
  })

  it('different table IDs are independent', () => {
    const { result: resultA } = renderHook(() =>
      useTableCompactMode('table-a')
    )
    const { result: resultB } = renderHook(() =>
      useTableCompactMode('table-b')
    )

    act(() => {
      resultA.current[1](true)
    })

    expect(resultA.current[0]).toBe(true)
    expect(resultB.current[0]).toBe(false)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['table-a']).toBe(true)
    expect(stored['table-b']).toBeUndefined()
  })

  it('uses "global" as default table key', () => {
    const { result } = renderHook(() => useTableCompactMode())

    act(() => {
      result.current[1](true)
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(stored['global']).toBe(true)
  })

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json')

    const { result } = renderHook(() => useTableCompactMode('test-table'))
    expect(result.current[0]).toBe(false)
  })

  it('responds to storage events from other tabs', () => {
    const { result } = renderHook(() => useTableCompactMode('my-table'))
    expect(result.current[0]).toBe(false)

    act(() => {
      const event = new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ 'my-table': true }),
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe(true)
  })

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useTableCompactMode('my-table'))

    act(() => {
      const event = new StorageEvent('storage', {
        key: 'some_other_key',
        newValue: JSON.stringify({ 'my-table': true }),
      })
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe(false)
  })
})
