import { renderHook, act } from '@testing-library/react'

import {
  useDataTableViewMode,
  DATA_TABLE_VIEW_MODES,
} from '@/components/data-table/hooks/use-data-table-view-mode'

describe('useDataTableViewMode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('defaults to table mode', () => {
    const { result } = renderHook(() => useDataTableViewMode())
    expect(result.current[0]).toBe('table')
  })

  test('uses custom default mode', () => {
    const { result } = renderHook(() =>
      useDataTableViewMode({ defaultMode: 'card' })
    )
    expect(result.current[0]).toBe('card')
  })

  test('persists mode to localStorage when storageKey provided', () => {
    const { result } = renderHook(() =>
      useDataTableViewMode({ storageKey: 'test-view-mode' })
    )

    act(() => {
      result.current[1]('card')
    })

    expect(result.current[0]).toBe('card')
    expect(localStorage.getItem('test-view-mode')).toBe('card')
  })

  test('reads persisted mode from localStorage', () => {
    localStorage.setItem('test-view-mode', 'card')

    const { result } = renderHook(() =>
      useDataTableViewMode({ storageKey: 'test-view-mode' })
    )

    expect(result.current[0]).toBe('card')
  })

  test('falls back to default when localStorage has invalid value', () => {
    localStorage.setItem('test-view-mode', 'invalid')

    const { result } = renderHook(() =>
      useDataTableViewMode({ storageKey: 'test-view-mode' })
    )

    expect(result.current[0]).toBe('table')
  })

  test('does not persist when no storageKey', () => {
    const { result } = renderHook(() => useDataTableViewMode())

    act(() => {
      result.current[1]('card')
    })

    expect(result.current[0]).toBe('card')
    expect(localStorage.length).toBe(0)
  })

  test('DATA_TABLE_VIEW_MODES has correct values', () => {
    expect(DATA_TABLE_VIEW_MODES.TABLE).toBe('table')
    expect(DATA_TABLE_VIEW_MODES.CARD).toBe('card')
  })
})
